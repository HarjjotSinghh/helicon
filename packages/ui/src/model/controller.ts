import { errorKind, errorMessage, type HeliconClient } from "../client.js";
import type {
  ApprovalMode,
  ApprovalRequest,
  AttachmentView,
  HeliconEvent,
  OutgoingAttachment,
  ReasoningEffort,
  SessionSummary,
  SkillEntry,
  UserInputAnswer,
  UserInputRequest,
  ViewEvent,
} from "../types.js";
import { modelDisplayName } from "./format.js";
import { goalPrompt } from "./goal.js";
import {
  INIT_PROMPT,
  findModel,
  parseEffort,
  parseMode,
  parseSlash,
  resolveSlash,
  skillTurn,
  slashCommands,
  type ParsedSlash,
} from "./slash.js";
import {
  addEcho,
  applyEvents,
  emptyFold,
  foldFromLoad,
  removeEcho,
  updateEcho,
  type EchoAttachment,
  type LocalEcho,
  type ThreadFold,
} from "./fold.js";
import {
  Store,
  defaultPrefs,
  initialState,
  revivePrefs,
  type AppState,
  type CodeTheme,
  type ComposerPicker,
  type GroupBy,
  type Prefs,
  type Route,
  type SkillsState,
  type ThemePref,
  type ThreadState,
  type Toast,
} from "./store.js";
import { UpdateManager, type AppUpdater } from "./updates.js";

/** The environment the controller runs in; injectable so the logic stays testable without a DOM. */
export interface Platform {
  loadPrefs(): unknown;
  savePrefs(prefs: Prefs): void;
  readHash(): string;
  writeHash(hash: string): void;
  onHashChange(handler: () => void): () => void;
  now(): number;
  schedule(fn: () => void, ms: number): unknown;
  cancel(handle: unknown): void;
}

const PREFS_KEY = "helicon.prefs.v1";

export function browserPlatform(): Platform {
  return {
    loadPrefs: () => {
      try {
        const raw = window.localStorage.getItem(PREFS_KEY);
        return raw ? (JSON.parse(raw) as unknown) : null;
      } catch {
        return null;
      }
    },
    savePrefs: (prefs) => {
      try {
        window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
      } catch {
        /* storage unavailable: prefs stay in memory */
      }
    },
    readHash: () => window.location.hash,
    writeHash: (hash) => {
      if (hash) {
        window.location.hash = hash;
      } else if (window.location.hash) {
        window.history.pushState(null, "", window.location.pathname + window.location.search);
      }
    },
    onHashChange: (handler) => {
      window.addEventListener("hashchange", handler);
      window.addEventListener("popstate", handler);
      return () => {
        window.removeEventListener("hashchange", handler);
        window.removeEventListener("popstate", handler);
      };
    },
    now: () => Date.now(),
    schedule: (fn, ms) => window.setTimeout(fn, ms),
    cancel: (handle) => window.clearTimeout(handle as number),
  };
}

export function routeToHash(route: Route): string {
  switch (route.kind) {
    case "home":
      return "";
    case "new":
      return route.cwd ? `#/new/${encodeURIComponent(route.cwd)}` : "#/new";
    case "thread":
      return `#/t/${encodeURIComponent(route.sessionId)}`;
    case "usage":
      return "#/usage";
  }
}

export function hashToRoute(hash: string): Route {
  const h = hash.replace(/^#/, "");
  if (h === "/usage") {
    return { kind: "usage" };
  }
  const thread = h.match(/^\/t\/(.+)$/);
  if (thread) {
    return { kind: "thread", sessionId: decodeURIComponent(thread[1] as string) };
  }
  const fresh = h.match(/^\/new(?:\/(.+))?$/);
  if (fresh) {
    return { kind: "new", cwd: fresh[1] ? decodeURIComponent(fresh[1]) : null };
  }
  return { kind: "home" };
}

function blankThread(): ThreadState {
  return {
    load: "idle",
    error: null,
    readOnly: false,
    readOnlyReason: null,
    truncated: false,
    fold: emptyFold(),
    attachments: [],
    shellRuns: [],
  };
}

let localSeq = 0;
function nextLocalId(): string {
  localSeq += 1;
  return `local-${Date.now().toString(36)}-${localSeq}`;
}

/** What a prompt carries beyond its text: files for the model, and their local previews for the echo. */
interface TurnDelivery {
  steer?: boolean;
  displayText?: string;
  attachments?: OutgoingAttachment[];
  previews?: EchoAttachment[];
}

export interface SendOptions extends TurnDelivery {
  /** Send the text as a prompt even when it looks like a slash command. */
  raw?: boolean;
}

const FLUSH_MS = 24;
const TOAST_MS = { info: 5000, success: 4000, error: 9000 } as const;
const SKILLS_FRESH_MS = 60_000;
const SKILLS_RETRY_MS = 10_000;

/**
 * Owns app state and every side effect: server calls, the event stream, routing and prefs.
 * Components read state through hooks and call these methods; they never talk to the client.
 */
export class HeliconController {
  readonly store: Store<AppState>;
  private readonly pending = new Map<string, ViewEvent[]>();
  private readonly loading = new Map<string, ViewEvent[]>();
  private readonly disposers: (() => void)[] = [];
  private flushHandle: unknown = null;
  private refreshHandle: unknown = null;
  private saveHandle: unknown = null;
  private refreshing: Promise<void> | null = null;
  private refreshQueued = false;
  private toastSeq = 0;

  private updates: UpdateManager | null = null;

  constructor(
    readonly client: HeliconClient,
    private readonly platform: Platform = browserPlatform(),
  ) {
    const fallback = defaultPrefs(new Date(platform.now()).toISOString());
    this.store = new Store(initialState(revivePrefs(platform.loadPrefs(), fallback)));
  }

  private get state(): AppState {
    return this.store.get();
  }

  private update(fn: (state: AppState) => AppState): void {
    this.store.set(fn);
  }

  start(): () => void {
    this.disposers.push(this.client.subscribe((event) => this.onEvent(event)));
    this.disposers.push(
      this.platform.onHashChange(() => {
        const hash = this.platform.readHash();
        if (hash !== routeToHash(this.state.route)) {
          this.applyRoute(hashToRoute(hash), false);
        }
      }),
    );
    if (this.updates) {
      this.updates.start();
      this.disposers.push(() => this.updates?.stop());
    }
    void this.boot(false);
    return () => this.dispose();
  }

  /** The desktop shell's updater. Call before `start`; a browser never has one. */
  attachUpdater(updater: AppUpdater): void {
    this.updates = new UpdateManager(
      updater,
      () => ({ autoUpdate: this.state.prefs.autoUpdate, paused: this.state.prefs.updatesPaused }),
      (next) => {
        const previous = this.state.updates?.status;
        this.update((s) => ({ ...s, updates: next }));
        if (next.status === "ready" && previous !== "ready") {
          this.toast(
            "info",
            `Helicon ${next.update?.version ?? ""} is ready`,
            this.state.prefs.autoUpdate && !this.state.prefs.updatesPaused ? "It installs when you close Helicon." : "Restart Helicon to install it.",
            { label: "Restart now", run: () => this.restartToUpdate() },
          );
        }
      },
      () => this.platform.now(),
    );
    this.update((s) => ({ ...s, updates: this.updates?.current ?? null }));
  }

  checkForUpdates(): void {
    void this.updates?.check(true);
  }

  downloadUpdate(): void {
    void this.updates?.download();
  }

  restartToUpdate(): void {
    void this.updates?.restart();
  }

  setAutoUpdate(autoUpdate: boolean): void {
    this.setPrefs({ autoUpdate });
    if (autoUpdate && !this.state.prefs.updatesPaused) {
      void this.updates?.download();
    }
  }

  setUpdatesPaused(updatesPaused: boolean): void {
    this.setPrefs({ updatesPaused });
    if (!updatesPaused) {
      void this.updates?.check();
    }
  }

  dispose(): void {
    for (const dispose of this.disposers.splice(0)) {
      dispose();
    }
    for (const handle of [this.flushHandle, this.refreshHandle, this.saveHandle]) {
      if (handle !== null) {
        this.platform.cancel(handle);
      }
    }
    this.platform.savePrefs(this.state.prefs);
  }

  private async boot(refreshEnv: boolean): Promise<void> {
    this.update((s) => ({ ...s, boot: "loading", bootError: null }));
    try {
      const env = await this.client.probeEnvironment(refreshEnv);
      this.update((s) => ({ ...s, env }));
      if (!env.museFound) {
        this.update((s) => ({ ...s, boot: "ready" }));
        return;
      }
      await this.refresh();
      this.update((s) => ({ ...s, boot: "ready" }));
      this.applyRoute(hashToRoute(this.platform.readHash()), false);
      void this.discoverAll(true);
      void this.loadModels();
    } catch (error) {
      this.update((s) => ({ ...s, boot: "error", bootError: errorMessage(error) }));
    }
  }

  retryBoot(): void {
    void this.boot(true);
  }

  // ---------------------------------------------------------------- data

  refresh(): Promise<void> {
    if (this.refreshing) {
      this.refreshQueued = true;
      return this.refreshing;
    }
    this.refreshing = this.loadLists()
      .catch((error) => {
        if (this.state.boot !== "ready") {
          throw error;
        }
      })
      .finally(() => {
        this.refreshing = null;
        if (this.refreshQueued) {
          this.refreshQueued = false;
          void this.refresh();
        }
      });
    return this.refreshing;
  }

  private async loadLists(): Promise<void> {
    const [projects, sessions] = await Promise.all([this.client.listProjects(), this.client.listSessions()]);
    const byId: Record<string, SessionSummary> = {};
    for (const session of sessions) {
      byId[session.sessionId] = session;
    }
    this.update((s) => ({ ...s, projects, sessions: byId, sessionsLoaded: true }));
  }

  private scheduleRefresh(): void {
    if (this.refreshHandle !== null) {
      return;
    }
    this.refreshHandle = this.platform.schedule(() => {
      this.refreshHandle = null;
      void this.refresh();
    }, 150);
  }

  async discoverAll(silent = false): Promise<void> {
    if (this.state.discovering) {
      return;
    }
    this.update((s) => ({ ...s, discovering: true }));
    try {
      await this.client.discover();
      await this.refresh();
      if (!silent) {
        this.toast("success", "Threads refreshed");
      }
    } catch (error) {
      if (!silent) {
        this.toast("error", "Could not refresh threads from Muse", errorMessage(error));
      }
    } finally {
      this.update((s) => ({ ...s, discovering: false }));
    }
  }

  private async loadModels(): Promise<void> {
    try {
      const models = await this.client.listModels();
      this.update((s) => ({ ...s, models }));
    } catch {
      /* the picker falls back to the session's model */
    }
  }

  // ---------------------------------------------------------------- routing

  navigate(route: Route): void {
    this.applyRoute(route, true);
  }

  openThread(sessionId: string): void {
    this.navigate({ kind: "thread", sessionId });
  }

  newThread(cwd?: string | null): void {
    const target = cwd ?? this.state.prefs.lastProject ?? this.state.projects[0]?.cwd ?? null;
    const known = target && this.state.projects.some((p) => p.cwd === target) ? target : (this.state.projects[0]?.cwd ?? null);
    this.navigate({ kind: "new", cwd: known });
  }

  private applyRoute(requested: Route, push: boolean): void {
    let route = requested;
    const previous = this.state.route;
    if (previous.kind === "thread") {
      this.markSeen(previous.sessionId, true);
    }
    if (route.kind === "thread" && this.state.sessionsLoaded && !this.state.sessions[route.sessionId]) {
      route = { kind: "home" };
    }
    this.update((s) => ({ ...s, route }));
    if (push) {
      const hash = routeToHash(route);
      if (this.platform.readHash() !== hash) {
        this.platform.writeHash(hash);
      }
    }
    if (route.kind === "thread") {
      this.markSeen(route.sessionId, true);
      const thread = this.state.threads[route.sessionId];
      if (!thread || thread.load === "idle" || thread.load === "error" || thread.fold.closed) {
        void this.loadThread(route.sessionId);
      }
    } else if (route.kind === "new" && route.cwd) {
      this.setPrefs({ lastProject: route.cwd });
    }
  }

  async loadThread(sessionId: string): Promise<void> {
    const existing = this.state.threads[sessionId];
    this.loading.set(sessionId, []);
    this.setThread(sessionId, { ...(existing ?? blankThread()), load: "loading", error: null });
    try {
      const load = await this.client.loadTranscript(sessionId);
      const buffered = this.loading.get(sessionId) ?? [];
      this.loading.delete(sessionId);
      const fold = applyEvents(foldFromLoad(load, existing?.fold ?? null), buffered);
      this.update((s) => ({
        ...s,
        threads: {
          ...s.threads,
          [sessionId]: {
            load: "ready",
            error: null,
            readOnly: load.readOnly,
            readOnlyReason: load.readOnlyReason,
            truncated: load.truncated,
            fold,
            attachments: load.attachments ?? [],
            shellRuns: load.shellRuns ?? [],
          },
        },
        sessions: load.session ? { ...s.sessions, [sessionId]: load.session } : s.sessions,
      }));
    } catch (error) {
      this.loading.delete(sessionId);
      this.setThread(sessionId, {
        ...(this.state.threads[sessionId] ?? blankThread()),
        load: "error",
        error: errorMessage(error),
      });
    }
  }

  // ---------------------------------------------------------------- events

  private onEvent(event: HeliconEvent): void {
    switch (event.type) {
      case "hello": {
        const wasLost = this.state.connection === "lost";
        this.update((s) => ({ ...s, connection: "open" }));
        if (wasLost && this.state.boot === "ready") {
          // Goals could have moved while the stream was down, and only the open thread is reloaded. Let every
          // other thread take the server's goal again rather than the last one it saw streamed.
          for (const id of Object.keys(this.state.threads)) {
            this.patchFold(id, (f) => (f.meta.goalSeen ? { ...f, meta: { ...f.meta, goalSeen: false } } : f));
          }
          void this.refresh();
          const route = this.state.route;
          if (route.kind === "thread") {
            void this.loadThread(route.sessionId);
          }
        }
        break;
      }
      case "connection":
        this.update((s) => ({ ...s, connection: event.state === "open" ? "open" : "lost" }));
        break;
      case "msp":
        this.queueEvent(event.sessionId, { method: event.method, params: event.params, at: event.at });
        break;
      case "session-status":
        if (!this.state.sessions[event.sessionId]) {
          this.scheduleRefresh();
          break;
        }
        this.update((s) => {
          const current = s.sessions[event.sessionId];
          return current ? { ...s, sessions: { ...s.sessions, [event.sessionId]: { ...current, live: event.live } } } : s;
        });
        break;
      case "shell-run":
        this.addShellRun(event.sessionId, event.run);
        break;
      case "sessions-changed":
        this.scheduleRefresh();
        break;
      case "host":
        if (event.state === "failed" || event.state === "exited") {
          this.update((s) => ({ ...s, hostError: event.message }));
          this.toast("error", event.state === "failed" ? "Muse could not start" : "Muse stopped unexpectedly", event.message);
        }
        break;
    }
  }

  private queueEvent(sessionId: string, event: ViewEvent): void {
    const buffer = this.loading.get(sessionId);
    if (buffer) {
      buffer.push(event);
      return;
    }
    if (!this.state.threads[sessionId]) {
      return;
    }
    const list = this.pending.get(sessionId);
    if (list) {
      list.push(event);
    } else {
      this.pending.set(sessionId, [event]);
    }
    if (this.flushHandle === null) {
      this.flushHandle = this.platform.schedule(() => this.flush(), FLUSH_MS);
    }
  }

  /** Apply queued stream events once per frame-ish, so fast deltas cost one render. */
  flush(): void {
    this.flushHandle = null;
    if (this.pending.size === 0) {
      return;
    }
    const batches = [...this.pending];
    this.pending.clear();
    this.update((s) => {
      const threads = { ...s.threads };
      for (const [id, events] of batches) {
        const thread = threads[id];
        if (thread) {
          threads[id] = { ...thread, fold: applyEvents(thread.fold, events) };
        }
      }
      return { ...s, threads };
    });
    const route = this.state.route;
    if (route.kind === "thread" && batches.some(([id]) => id === route.sessionId)) {
      this.markSeen(route.sessionId);
    }
  }

  // ---------------------------------------------------------------- turns

  /**
   * Send from the composer. `/commands` and `!shell` lines run as themselves; `raw` sends the text as a plain prompt.
   * Returns false when the sending composer should put the text back.
   */
  async send(text: string, options: SendOptions = {}): Promise<boolean> {
    const trimmed = text.trim();
    const files = options.attachments ?? [];
    if (!trimmed && files.length === 0) {
      return false;
    }
    if (!options.raw && trimmed) {
      const shell = /^!\s*([\s\S]+)$/.exec(trimmed);
      if (shell) {
        return this.runShell((shell[1] as string).trim());
      }
      const parsed = parseSlash(trimmed);
      if (parsed) {
        return this.runSlash(trimmed, parsed, { steer: options.steer });
      }
    }
    return this.deliver(trimmed, { steer: options.steer, attachments: files, previews: options.previews });
  }

  /** The project a new thread starts in: the new-thread screen's, else the last one used. */
  private newThreadTarget(): string | null {
    const route = this.state.route;
    const target =
      (route.kind === "new" ? route.cwd : null) ?? this.state.prefs.lastProject ?? this.state.projects[0]?.cwd ?? null;
    if (!target) {
      this.toast("info", "Add a project first", "Pick the folder Muse should work in.");
      this.setAddProjectOpen(true);
    }
    return target;
  }

  /** Sends a prompt to the open thread, or starts a thread with it. */
  private deliver(text: string, options: TurnDelivery): Promise<boolean> {
    const route = this.state.route;
    if (route.kind === "thread") {
      return this.sendToThread(route.sessionId, text, options, false);
    }
    const target = this.newThreadTarget();
    if (!target) {
      return Promise.resolve(false);
    }
    return this.startThread(target, options.displayText ?? text, (sessionId) => this.sendToThread(sessionId, text, options, false));
  }

  /** Called by the composer showing `key`: takes back a prompt that failed to send from elsewhere. */
  takeDraftHandoff(key: string): string | null {
    const handoff = this.state.draftHandoff;
    if (!handoff || handoff.key !== key) {
      return null;
    }
    this.update((s) => ({ ...s, draftHandoff: null }));
    return handoff.text;
  }

  /** Puts text in a thread's composer as if the user typed it, like `/goal ` for a new objective. */
  prefillComposer(sessionId: string, text: string): void {
    this.update((s) => ({ ...s, draftHandoff: { key: sessionId, text } }));
  }

  /** Starts a thread in `cwd` and runs its first action there; what the user typed goes to its composer if that fails. */
  private async startThread(cwd: string, typed: string, first: (sessionId: string) => Promise<boolean>): Promise<boolean> {
    if (this.state.busy["start"]) {
      return false;
    }
    this.setBusy("start", true);
    try {
      const { defaultMode, defaultModelId } = this.state.prefs;
      const session = await this.client.startSession(cwd, {
        approvalMode: defaultMode,
        modelId: defaultModelId ?? undefined,
      });
      const base = emptyFold();
      const fold: ThreadFold = {
        ...base,
        meta: { ...base.meta, modelId: session.modelId ?? defaultModelId, approvalMode: defaultMode },
      };
      this.update((s) => ({
        ...s,
        sessions: { ...s.sessions, [session.sessionId]: session },
        threads: {
          ...s.threads,
          [session.sessionId]: {
            load: "ready",
            error: null,
            readOnly: false,
            readOnlyReason: null,
            truncated: false,
            fold,
            attachments: [],
            shellRuns: [],
          },
        },
      }));
      this.setPrefs({ lastProject: cwd });
      this.navigate({ kind: "thread", sessionId: session.sessionId });
      const sent = await first(session.sessionId);
      if (!sent) {
        // The new-thread composer that sent this is gone, so the prompt goes to the new thread's composer.
        this.update((s) => ({ ...s, draftHandoff: { key: session.sessionId, text: typed } }));
      }
      return true;
    } catch (error) {
      this.toast("error", "Could not start a thread", errorMessage(error));
      return false;
    } finally {
      this.setBusy("start", false);
    }
  }

  private async sendToThread(
    sessionId: string,
    text: string,
    options: TurnDelivery,
    retried: boolean,
  ): Promise<boolean> {
    const thread = this.state.threads[sessionId];
    if (!thread) {
      return false;
    }
    if (thread.readOnly) {
      this.toast("info", "This thread is read-only here", thread.readOnlyReason ?? "Another Muse session has it open.");
      return false;
    }
    const running = thread.fold.activeTurnId !== null;
    const echo: LocalEcho = {
      localId: nextLocalId(),
      // The echo shows what the transcript will, so it matches the prompt item when that arrives.
      text: options.displayText ?? text,
      turnId: null,
      disposition: running ? (options.steer ? "steered" : "queued") : "sending",
      createdAt: this.platform.now(),
      ...(options.previews?.length ? { attachments: options.previews } : {}),
    };
    this.patchFold(sessionId, (f) => addEcho(f, echo));
    try {
      const ack = await this.client.sendTurn(sessionId, text, {
        ifBusy: running ? (options.steer ? "steer" : "queue") : undefined,
        reasoningEffort: this.state.prefs.effort ?? undefined,
        displayText: options.displayText,
        attachments: options.attachments,
      });
      const disposition: LocalEcho["disposition"] =
        ack.disposition === "queued" ? "queued" : ack.disposition === "steered" ? "steered" : "started";
      this.patchFold(sessionId, (f) => updateEcho(f, echo.localId, { turnId: ack.turnId, disposition }));
      // The echo goes when the prompt lands, so the thread takes the saved files now rather than on a reload.
      this.keepAttachments(sessionId, ack.attachments ?? []);
      const turnId = ack.turnId;
      if (disposition === "started" && turnId) {
        this.patchFold(sessionId, (f) =>
          f.activeTurnId || f.turns[turnId]?.terminal
            ? f
            : {
                ...f,
                activeTurnId: turnId,
                turns: { ...f.turns, [turnId]: { startedAt: this.platform.now(), ...f.turns[turnId], turnId } },
              },
        );
      }
      return true;
    } catch (error) {
      this.patchFold(sessionId, (f) => removeEcho(f, echo.localId));
      const kind = errorKind(error);
      if (!retried && (kind === "sessionNotLoaded" || kind === "sessionStreamMismatch")) {
        await this.loadThread(sessionId);
        return this.sendToThread(sessionId, text, options, true);
      }
      this.toast("error", "Message not sent", errorMessage(error));
      return false;
    }
  }

  async stop(sessionId: string): Promise<void> {
    const key = `stop:${sessionId}`;
    if (this.state.busy[key]) {
      return;
    }
    this.setBusy(key, true);
    try {
      await this.client.interruptTurn(sessionId, this.state.threads[sessionId]?.fold.activeTurnId ?? undefined);
    } catch (error) {
      this.toast("error", "Could not stop the turn", errorMessage(error));
    } finally {
      this.setBusy(key, false);
    }
  }

  async unqueue(sessionId: string, echo: LocalEcho): Promise<void> {
    if (!echo.turnId) {
      this.patchFold(sessionId, (f) => removeEcho(f, echo.localId));
      return;
    }
    try {
      await this.client.unqueueTurn(sessionId, echo.turnId);
      this.patchFold(sessionId, (f) => removeEcho(f, echo.localId));
    } catch (error) {
      this.toast("info", "That message already started", errorMessage(error));
    }
  }

  /** Clears a failed turn's notice, for when the user has acted on it and it is only taking up room. */
  dismissTurnError(sessionId: string, turnId: string | null): void {
    if (!turnId) {
      return;
    }
    this.patchFold(sessionId, (f) => {
      const info = f.turns[turnId];
      if (!info?.error) {
        return f;
      }
      const { error: _error, ...rest } = info;
      return { ...f, turns: { ...f.turns, [turnId]: { ...rest, dismissed: true } } };
    });
  }

  async retryTurn(sessionId: string, prompt: string): Promise<void> {
    // A turn started by `/plan …` or `/init` shows the command, so retrying runs the command again.
    const parsed = parseSlash(prompt);
    const cwd = this.state.sessions[sessionId]?.cwd ?? null;
    const route = this.state.route;
    if (parsed && cwd && route.kind === "thread" && route.sessionId === sessionId) {
      await this.loadSkills(cwd);
      const skills = this.state.skills[cwd]?.skills ?? [];
      if (resolveSlash(parsed, slashCommands(skills, { inThread: true }), skills).kind !== "unknown") {
        await this.send(prompt);
        return;
      }
    }
    await this.sendToThread(sessionId, prompt, {}, false);
  }

  // ---------------------------------------------------------------- approvals and questions

  async decide(request: ApprovalRequest, choiceId: string, feedback: string | null): Promise<void> {
    const key = `approval:${request.approvalId}`;
    if (this.state.busy[key]) {
      return;
    }
    this.setBusy(key, true);
    // The card goes on the click, not on the host's `approval/resolved`, which can be a second or more behind.
    const decision = (request.availableChoices ?? []).find((c) => c.choiceId === choiceId)?.decision ?? "approved";
    this.patchFold(request.sessionId, (f) => {
      const approvals = { ...f.approvals };
      delete approvals[request.approvalId];
      return { ...f, approvals, resolved: { ...f.resolved, [request.approvalId]: { decision, resolvedBy: "user" } } };
    });
    try {
      await this.client.decideApproval({
        sessionId: request.sessionId,
        approvalId: request.approvalId,
        requirementId: request.currentRequirementId,
        choiceId,
        feedback,
      });
    } catch (error) {
      const kind = errorKind(error);
      if (kind === "approvalAlreadyResolved" || kind === "approvalNotFound") {
        /* it was already settled elsewhere; the card is gone either way */
      } else if (kind === "approvalRequirementStale") {
        this.restoreApproval(request);
        this.toast("info", "The request changed", "Review the updated request and decide again.");
      } else {
        this.restoreApproval(request);
        this.toast("error", "Decision not sent", errorMessage(error));
      }
    } finally {
      this.setBusy(key, false);
    }
  }

  /** Puts a request back when its decision did not land, so the choice is still the user's. */
  private restoreApproval(request: ApprovalRequest): void {
    this.patchFold(request.sessionId, (f) => {
      const resolved = { ...f.resolved };
      delete resolved[request.approvalId];
      return { ...f, approvals: { ...f.approvals, [request.approvalId]: request }, resolved };
    });
  }

  private dropInput(request: UserInputRequest): void {
    this.patchFold(request.sessionId, (f) => {
      const userInputs = { ...f.userInputs };
      delete userInputs[request.userInputId];
      return { ...f, userInputs };
    });
  }

  private async settleInput(request: UserInputRequest, action: () => Promise<void>, failure: string): Promise<void> {
    const key = `input:${request.userInputId}`;
    if (this.state.busy[key]) {
      return;
    }
    this.setBusy(key, true);
    try {
      await action();
    } catch (error) {
      const kind = errorKind(error);
      if (kind === "userInputAlreadySettled" || kind === "userInputNotFound") {
        this.dropInput(request);
      } else {
        this.toast("error", failure, errorMessage(error));
      }
    } finally {
      this.setBusy(key, false);
    }
  }

  answer(request: UserInputRequest, answers: UserInputAnswer[]): Promise<void> {
    return this.settleInput(
      request,
      () => this.client.answerUserInput(request.sessionId, request.userInputId, answers),
      "Answer not sent",
    );
  }

  skipQuestion(request: UserInputRequest): Promise<void> {
    return this.settleInput(
      request,
      () => this.client.cancelUserInput(request.sessionId, request.userInputId),
      "Could not skip the question",
    );
  }

  clarify(request: UserInputRequest, content: string): Promise<void> {
    return this.settleInput(
      request,
      () => this.client.clarifyUserInput(request.sessionId, request.userInputId, content),
      "Reply not sent",
    );
  }

  // ---------------------------------------------------------------- composer settings

  async setModel(modelId: string): Promise<void> {
    const model = this.state.models.find((m) => m.modelId === modelId);
    if (model?.contributor && !this.state.prefs.contributorAck) {
      this.setPrefs({ contributorAck: true });
      this.toast(
        "info",
        "Contributor model selected",
        model.description ?? "Prompts and outputs on contributor models may be used for product improvement.",
      );
    }
    this.setPrefs({ defaultModelId: modelId });
    const route = this.state.route;
    if (route.kind !== "thread") {
      return;
    }
    const previous = this.state.threads[route.sessionId]?.fold.meta.modelId ?? null;
    this.patchMeta(route.sessionId, { modelId });
    try {
      await this.client.setSessionModel(route.sessionId, modelId);
    } catch (error) {
      this.patchMeta(route.sessionId, { modelId: previous });
      this.toast("error", "Could not switch models", errorMessage(error));
    }
  }

  async setMode(mode: ApprovalMode): Promise<void> {
    this.setPrefs({ defaultMode: mode });
    const route = this.state.route;
    if (route.kind !== "thread") {
      return;
    }
    const previous = this.state.threads[route.sessionId]?.fold.meta.approvalMode ?? null;
    this.patchMeta(route.sessionId, { approvalMode: mode });
    try {
      await this.client.setApprovalMode(route.sessionId, mode);
    } catch (error) {
      this.patchMeta(route.sessionId, { approvalMode: previous });
      this.toast("error", "Could not change permissions", errorMessage(error));
    }
  }

  setEffort(effort: ReasoningEffort | null): void {
    this.setPrefs({ effort });
  }

  // ---------------------------------------------------------------- threads and projects

  async rename(sessionId: string, title: string): Promise<void> {
    const clean = title.trim();
    const current = this.state.sessions[sessionId];
    if (!clean || !current || clean === current.title) {
      return;
    }
    this.upsertSession({ ...current, title: clean, titleSource: "user" });
    try {
      const saved = await this.client.updateSession(sessionId, { title: clean });
      if (saved) {
        this.upsertSession(saved);
      }
    } catch (error) {
      this.upsertSession(current);
      this.toast("error", "Could not rename the thread", errorMessage(error));
    }
  }

  async archive(sessionId: string): Promise<void> {
    const current = this.state.sessions[sessionId];
    if (!current) {
      return;
    }
    this.update((s) => {
      const sessions = { ...s.sessions };
      delete sessions[sessionId];
      return { ...s, sessions };
    });
    const route = this.state.route;
    if (route.kind === "thread" && route.sessionId === sessionId) {
      this.navigate({ kind: "new", cwd: current.cwd });
    }
    try {
      await this.client.updateSession(sessionId, { archived: true });
      this.toast("info", "Thread archived", current.title, {
        label: "Undo",
        run: () => void this.unarchive(current),
      });
    } catch (error) {
      this.upsertSession(current);
      this.toast("error", "Could not archive the thread", errorMessage(error));
    }
  }

  /** Shelves a thread in its project's Settled list, or brings it back. */
  async setSettled(sessionId: string, settled: boolean): Promise<void> {
    const current = this.state.sessions[sessionId];
    if (!current || current.settled === settled) {
      return;
    }
    const now = new Date(this.platform.now()).toISOString();
    this.upsertSession(
      settled ? { ...current, settled: true, settledAt: now, unsettledAt: null } : { ...current, settled: false, settledAt: null, unsettledAt: now },
    );
    try {
      const saved = await this.client.updateSession(sessionId, { settled });
      if (saved) {
        this.upsertSession(saved);
      }
    } catch (error) {
      this.upsertSession(current);
      this.toast("error", settled ? "Could not settle the thread" : "Could not bring the thread back", errorMessage(error));
    }
  }

  toggleShelf(key: string): void {
    const open = this.state.prefs.openShelves;
    this.setPrefs({ openShelves: open.includes(key) ? open.filter((k) => k !== key) : [...open, key] });
  }

  private async unarchive(session: SessionSummary): Promise<void> {
    try {
      const saved = await this.client.updateSession(session.sessionId, { archived: false });
      this.upsertSession(saved ?? { ...session, archived: false });
    } catch (error) {
      this.toast("error", "Could not restore the thread", errorMessage(error));
    }
  }

  listDirectory(path: string): Promise<import("../types.js").DirectoryListing> {
    return this.client.listDirectory(path);
  }

  async revealPath(path: string): Promise<void> {
    try {
      await this.client.revealPath(path);
    } catch (error) {
      this.toast("error", "Could not open the folder", errorMessage(error));
    }
  }

  async cloneProject(url: string, path: string): Promise<boolean> {
    if (this.state.busy["cloneProject"]) {
      return false;
    }
    this.setBusy("cloneProject", true);
    try {
      const added = await this.client.cloneProject(url, path);
      await this.refresh();
      this.setAddProjectOpen(false);
      this.toast(
        "info",
        "Repository cloned",
        added.warning ? `Muse could not list its threads yet: ${added.warning}` : added.cwd,
      );
      this.newThread(added.cwd);
      return true;
    } catch (error) {
      this.toast("error", "Could not clone the repository", errorMessage(error));
      return false;
    } finally {
      this.setBusy("cloneProject", false);
    }
  }

  async addProject(cwd: string, options: { create?: boolean } = {}): Promise<boolean> {
    const path = cwd.trim();
    if (!path || this.state.busy["addProject"]) {
      return false;
    }
    this.setBusy("addProject", true);
    try {
      const added = await this.client.addProject(path, options);
      await this.refresh();
      this.setAddProjectOpen(false);
      if (added.warning) {
        this.toast("info", "Project added", `Muse could not list its threads yet: ${added.warning}`);
      }
      this.newThread(added.cwd);
      return true;
    } catch (error) {
      this.toast("error", "Could not add that folder", errorMessage(error));
      return false;
    } finally {
      this.setBusy("addProject", false);
    }
  }

  /** Token usage across every thread the server knows, for the usage page. */
  usageReport(days: number): Promise<import("../types.js").UsageReport> {
    return this.client.usage(days);
  }

  /** Moves a project in the sidebar, taking the new order from the row it was dropped on. */
  async reorderProjects(cwd: string, beforeCwd: string | null): Promise<void> {
    const current = this.state.projects;
    const moving = current.find((p) => p.cwd === cwd);
    if (!moving || cwd === beforeCwd) {
      return;
    }
    const rest = current.filter((p) => p.cwd !== cwd);
    const at = beforeCwd === null ? rest.length : rest.findIndex((p) => p.cwd === beforeCwd);
    const next = [...rest.slice(0, at < 0 ? rest.length : at), moving, ...rest.slice(at < 0 ? rest.length : at)];
    this.update((s) => ({ ...s, projects: next }));
    try {
      await this.client.setProjectOrder(next.map((p) => p.cwd));
    } catch (error) {
      this.update((s) => ({ ...s, projects: current }));
      this.toast("error", "Could not reorder the projects", errorMessage(error));
    }
  }

  async hideProject(cwd: string): Promise<void> {
    const project = this.state.projects.find((p) => p.cwd === cwd);
    if (!project) {
      return;
    }
    this.update((s) => ({ ...s, projects: s.projects.filter((p) => p.cwd !== cwd) }));
    const route = this.state.route;
    const active = route.kind === "thread" ? this.state.sessions[route.sessionId] : null;
    if ((route.kind === "new" && route.cwd === cwd) || active?.cwd === cwd) {
      this.navigate({ kind: "home" });
    }
    try {
      await this.client.hideProject(cwd);
      this.toast("info", `Removed ${project.displayName} from the sidebar`, "Its Muse threads are untouched.", {
        label: "Undo",
        run: () => void this.addProject(cwd),
      });
    } catch (error) {
      void this.refresh();
      this.toast("error", "Could not remove the project", errorMessage(error));
    }
  }

  async refreshProject(cwd: string): Promise<void> {
    try {
      await this.client.discover(cwd);
      await this.refresh();
    } catch (error) {
      this.toast("error", "Could not refresh that project", errorMessage(error));
    }
  }

  async togglePin(cwd: string): Promise<void> {
    const project = this.state.projects.find((p) => p.cwd === cwd);
    if (!project) {
      return;
    }
    try {
      await this.client.setPinned(cwd, !project.pinned);
      await this.refresh();
    } catch (error) {
      this.toast("error", "Could not update the project", errorMessage(error));
    }
  }

  // ---------------------------------------------------------------- slash commands, skills and shell

  /** The workspace the composer's commands act on: the open thread's, or where a new thread would start. */
  composerCwd(): string | null {
    const route = this.state.route;
    if (route.kind === "thread") {
      return this.state.sessions[route.sessionId]?.cwd ?? null;
    }
    return (route.kind === "new" ? route.cwd : null) ?? this.state.prefs.lastProject ?? this.state.projects[0]?.cwd ?? null;
  }

  private readonly skillLoads = new Map<string, Promise<void>>();

  /**
   * Loads a workspace's skills for the slash menu. A loaded list is reused for a minute and a failed load
   * retries after ten seconds; a load already running is shared, so a command sent mid-load waits for it.
   */
  loadSkills(cwd: string): Promise<void> {
    const running = this.skillLoads.get(cwd);
    if (running) {
      return running;
    }
    const current = this.state.skills[cwd];
    const age = this.platform.now() - (current?.loadedAt ?? 0);
    if (current && age < (current.status === "ready" ? SKILLS_FRESH_MS : SKILLS_RETRY_MS)) {
      return Promise.resolve();
    }
    const load = this.fetchSkills(cwd, current).finally(() => this.skillLoads.delete(cwd));
    this.skillLoads.set(cwd, load);
    return load;
  }

  private async fetchSkills(cwd: string, current: SkillsState | undefined): Promise<void> {
    this.setSkills(cwd, { status: "loading", skills: current?.skills ?? [], error: null, loadedAt: current?.loadedAt ?? 0 });
    try {
      const catalog = await this.client.listSkills(cwd);
      this.setSkills(cwd, {
        status: catalog.error ? "error" : "ready",
        skills: catalog.skills,
        error: catalog.error,
        loadedAt: this.platform.now(),
      });
    } catch (error) {
      this.setSkills(cwd, { status: "error", skills: current?.skills ?? [], error: errorMessage(error), loadedAt: this.platform.now() });
    }
  }

  private setSkills(cwd: string, next: SkillsState): void {
    this.update((s) => ({ ...s, skills: { ...s.skills, [cwd]: next } }));
  }

  setPicker(picker: ComposerPicker | null): void {
    this.update((s) => (s.picker === picker ? s : { ...s, picker }));
  }

  /** Closes `picker` only if it is still the open one, so a menu closing after it hands off to a dialog leaves the dialog open. */
  closePicker(picker: ComposerPicker): void {
    this.update((s) => (s.picker === picker ? { ...s, picker: null } : s));
  }

  /** `!command` runs in the thread's workspace shell; on the new-thread screen it starts the thread first. */
  private async runShell(command: string): Promise<boolean> {
    const run = async (sessionId: string): Promise<boolean> => {
      const thread = this.state.threads[sessionId];
      if (thread?.readOnly) {
        this.toast("info", "This thread is read-only here", thread.readOnlyReason ?? "Another Muse session has it open.");
        return false;
      }
      const key = `shell:${sessionId}`;
      if (this.state.busy[key]) {
        return false;
      }
      this.setBusy(key, true);
      try {
        // Helicon runs `!` itself: Muse's own host has no sandbox for these, so it never runs them at all.
        this.addShellRun(sessionId, await this.client.runShellProxy(sessionId, command));
        return true;
      } catch (error) {
        this.toast("error", "Command not run", errorMessage(error));
        return false;
      } finally {
        this.setBusy(key, false);
      }
    };
    const route = this.state.route;
    if (route.kind === "thread") {
      return run(route.sessionId);
    }
    const target = this.newThreadTarget();
    return target ? this.startThread(target, `!${command}`, run) : false;
  }

  /** Adds files the server has just saved to the open thread, skipping any it already has. */
  private keepAttachments(sessionId: string, saved: AttachmentView[]): void {
    if (saved.length === 0) {
      return;
    }
    this.update((s) => {
      const thread = s.threads[sessionId];
      if (!thread) {
        return s;
      }
      const known = new Set(thread.attachments.map((file) => file.id));
      const added = saved.filter((file) => !known.has(file.id));
      if (added.length === 0) {
        return s;
      }
      return { ...s, threads: { ...s.threads, [sessionId]: { ...thread, attachments: [...thread.attachments, ...added] } } };
    });
  }

  /** Keeps a command Helicon ran in the thread it belongs to, whoever started it. */
  private addShellRun(sessionId: string, run: import("../types.js").ShellRun): void {
    this.update((s) => {
      const thread = s.threads[sessionId];
      if (!thread || thread.shellRuns.some((existing) => existing.id === run.id)) {
        return s;
      }
      return { ...s, threads: { ...s.threads, [sessionId]: { ...thread, shellRuns: [...thread.shellRuns, run] } } };
    });
  }

  /** Hands a command's output to Muse as the next prompt, since Muse never saw it run. */
  sendShellOutput(sessionId: string, run: import("../types.js").ShellRun): Promise<boolean> {
    const fence = "`".repeat(Math.max(3, ...(run.output.match(/`+/g) ?? []).map((mark) => mark.length + 1)));
    const status = run.exitCode === 0 ? "" : ` (exit ${run.exitCode ?? "unknown"})`;
    const text = `I ran this in the workspace${status}:\n\n${fence}sh\n${run.command}\n${fence}\n\nIts output:\n\n${fence}\n${run.output.trim() || "(no output)"}\n${fence}`;
    return this.sendToThread(sessionId, text, { displayText: `Shared the output of \`${run.command}\`` }, false);
  }

  private async runSlash(typed: string, parsed: ParsedSlash, options: { steer?: boolean }): Promise<boolean> {
    const route = this.state.route;
    const cwd = this.composerCwd();
    // A skill typed before the workspace's skills arrived waits for them instead of reading as unknown;
    // built-ins other than `/skill` never wait on a slow skills list.
    const builtin = slashCommands([], { inThread: true }).find((c) => c.name === parsed.name || c.aliases.includes(parsed.name));
    if (cwd && (!builtin || builtin.action === "skill")) {
      await this.loadSkills(cwd);
    }
    const skills = cwd ? (this.state.skills[cwd]?.skills ?? []) : [];
    // Resolve against every built-in, so a thread-only command typed outside a thread gets a useful answer.
    const resolved = resolveSlash(parsed, slashCommands(skills, { inThread: true }), skills);
    if (resolved.kind === "unknown") {
      this.toast("info", `No command named /${resolved.name}`, "Pick one from the list, or send the text as a prompt from the menu.");
      return false;
    }
    if (resolved.kind === "skill") {
      return this.runSkill(resolved.skill, resolved.args, typed, cwd, options);
    }
    const { command, args } = resolved;
    const sessionId = route.kind === "thread" ? route.sessionId : null;
    if (command.needsThread && !sessionId) {
      this.toast("info", `Open a thread to use /${command.name}`);
      return false;
    }
    switch (command.action) {
      case "compact":
        await this.compact(sessionId as string);
        return true;
      case "fork":
        return this.fork(sessionId as string);
      case "new":
        this.newThread(cwd);
        return true;
      case "resume":
        this.setPaletteOpen(true);
        return true;
      case "init":
        return this.deliver(INIT_PROMPT, { ...options, displayText: typed });
      case "goal": {
        if (!args) {
          this.toast("info", "Add the goal after /goal", "For example: /goal get the test suite passing");
          return false;
        }
        // Served sessions have no goal command, so the model sets the goal with its create_goal tool.
        return this.deliver(goalPrompt(args), { ...options, displayText: typed });
      }
      case "model": {
        if (!args) {
          this.setPicker("model");
          return true;
        }
        const model = findModel(this.state.models, args, modelDisplayName);
        if (!model) {
          this.toast("info", `No model named ${args}`, "Type /model to pick from the list.");
          return false;
        }
        await this.setModel(model.modelId);
        return true;
      }
      case "effort": {
        if (!args) {
          this.setPicker("effort");
          return true;
        }
        const effort = parseEffort(args);
        if (effort === undefined) {
          this.toast("info", `Unknown effort level: ${args}`, "Use off, minimal, low, medium, high, xhigh, ultra or auto.");
          return false;
        }
        this.setEffort(effort);
        return true;
      }
      case "permissions": {
        if (!args) {
          this.setPicker("permissions");
          return true;
        }
        const mode = parseMode(args);
        if (!mode) {
          this.toast("info", `Unknown permission mode: ${args}`, "Use ask, unlisted, deny or full.");
          return false;
        }
        if (mode === "allowAll") {
          // Full access always goes through its confirmation.
          this.setPicker("confirmFullAccess");
          return true;
        }
        await this.setMode(mode);
        return true;
      }
      default:
        return false;
    }
  }

  /** A skill turn: the model loads the skill itself, or gets the body inline when only users may invoke it. */
  private async runSkill(
    skill: SkillEntry,
    args: string,
    typed: string,
    cwd: string | null,
    options: { steer?: boolean },
  ): Promise<boolean> {
    let body: string | null = null;
    if (skill.activation === "user-invocable-only") {
      try {
        body = await this.client.skillBody(cwd ?? "", skill.id);
      } catch (error) {
        this.toast("error", `Could not load /${skill.name}`, errorMessage(error));
        return false;
      }
    }
    const turn = skillTurn(skill, args, typed, body);
    return this.deliver(turn.text, { ...options, displayText: turn.displayText });
  }

  /** Asks Muse to pick a paused or blocked goal back up; the transcript shows the short form. */
  continueGoal(sessionId: string, objective: string): Promise<boolean> {
    return this.sendToThread(sessionId, `Keep working toward the goal: ${objective}`, { displayText: "Keep working on the goal" }, false);
  }

  /** Hands a `!` command the host could not run to the agent, whose own shell tool can. */
  askToRun(sessionId: string, command: string): Promise<boolean> {
    // A fence longer than any run of backticks in the command, so the command cannot close its own block.
    const runs = command.match(/`+/g) ?? [];
    const fence = "`".repeat(Math.max(3, ...runs.map((run) => run.length + 1)));
    // The failed `!` item says the environment is broken, which makes the agent refuse; tell it that its own shell is fine.
    const text =
      `Run this with your shell tool and show me the output:\n\n${fence}sh\n${command}\n${fence}\n\n` +
      "That failure came from Helicon's `!` path, not from your tools: your own shell works here.";
    return this.sendToThread(sessionId, text, {}, false);
  }

  /** Branches a thread into a new one and opens it. */
  async fork(sessionId: string): Promise<boolean> {
    const key = `fork:${sessionId}`;
    if (this.state.busy[key]) {
      return false;
    }
    this.setBusy(key, true);
    try {
      const session = await this.client.forkSession(sessionId);
      this.upsertSession(session);
      this.navigate({ kind: "thread", sessionId: session.sessionId });
      this.toast("success", "Forked into a new thread", "The original thread stays as it was.");
      return true;
    } catch (error) {
      this.toast(
        "error",
        "Could not fork the thread",
        errorKind(error) === "forkBoundaryInvalid" ? "Muse could not find a point in this thread to fork it at." : errorMessage(error),
      );
      return false;
    } finally {
      this.setBusy(key, false);
    }
  }

  async compact(sessionId: string): Promise<void> {
    try {
      const result = await this.client.compact(sessionId);
      if (result.noop) {
        const reason = result.reason === "no_compactable_history" ? "There is no earlier history to summarize." : result.reason;
        this.toast("info", "Nothing to compact yet", reason ? `${reason.charAt(0).toUpperCase()}${reason.slice(1).replace(/_/g, " ")}` : undefined);
        return;
      }
      this.toast("info", "Compacting context", "Muse will summarize earlier turns to free up the context window.");
    } catch (error) {
      this.toast("error", "Could not compact the context", errorMessage(error));
    }
  }

  /**
   * For a thread whose history the provider will not take: summarize it, which leaves the unusable part
   * behind, then send the prompt again. The retry queues behind the compaction Muse runs as its own turn.
   */
  async compactAndRetry(sessionId: string, prompt: string | null): Promise<void> {
    await this.compact(sessionId);
    if (prompt) {
      await this.retryTurn(sessionId, prompt);
    }
  }

  async openFolder(cwd: string, target: "files" | "editor"): Promise<void> {
    try {
      await this.client.openFolder(cwd, target);
    } catch (error) {
      this.toast("error", target === "editor" ? "Could not open VS Code" : "Could not open the folder", errorMessage(error));
    }
  }

  // ---------------------------------------------------------------- prefs and chrome

  setPrefs(patch: Partial<Prefs>): void {
    this.update((s) => ({ ...s, prefs: { ...s.prefs, ...patch } }));
    if (this.saveHandle === null) {
      this.saveHandle = this.platform.schedule(() => {
        this.saveHandle = null;
        this.platform.savePrefs(this.state.prefs);
      }, 400);
    }
  }

  markSeen(sessionId: string, force = false): void {
    const now = new Date(this.platform.now()).toISOString();
    const previous = this.state.prefs.lastSeen[sessionId];
    if (!force && previous && Date.parse(now) - Date.parse(previous) < 2000) {
      return;
    }
    this.setPrefs({ lastSeen: { ...this.state.prefs.lastSeen, [sessionId]: now } });
  }

  setGroupBy(groupBy: GroupBy): void {
    this.setPrefs({ groupBy });
  }

  setTheme(theme: ThemePref): void {
    this.setPrefs({ theme });
  }

  setCodeTheme(codeTheme: CodeTheme): void {
    this.setPrefs({ codeTheme });
  }

  toggleSidebar(): void {
    this.setPrefs({ sidebarCollapsed: !this.state.prefs.sidebarCollapsed });
  }

  setSidebarWidth(width: number): void {
    this.setPrefs({ sidebarWidth: Math.round(Math.min(480, Math.max(220, width))) });
  }

  toggleProjectCollapsed(cwd: string): void {
    const collapsed = this.state.prefs.collapsedProjects;
    this.setPrefs({
      collapsedProjects: collapsed.includes(cwd) ? collapsed.filter((c) => c !== cwd) : [...collapsed, cwd],
    });
  }

  setPaletteOpen(open: boolean): void {
    this.update((s) => (s.paletteOpen === open ? s : { ...s, paletteOpen: open }));
  }

  setAddProjectOpen(open: boolean): void {
    this.update((s) => (s.addProjectOpen === open ? s : { ...s, addProjectOpen: open }));
  }

  toast(tone: Toast["tone"], title: string, detail?: string, action?: Toast["action"]): void {
    this.toastSeq += 1;
    const id = this.toastSeq;
    this.update((s) => ({ ...s, toasts: [...s.toasts.slice(-3), { id, tone, title, detail, action }] }));
    this.platform.schedule(() => this.dismissToast(id), TOAST_MS[tone]);
  }

  dismissToast(id: number): void {
    this.update((s) => (s.toasts.some((t) => t.id === id) ? { ...s, toasts: s.toasts.filter((t) => t.id !== id) } : s));
  }

  // ---------------------------------------------------------------- helpers

  private setBusy(key: string, on: boolean): void {
    this.update((s) => {
      if (Boolean(s.busy[key]) === on) {
        return s;
      }
      const busy = { ...s.busy };
      if (on) {
        busy[key] = true;
      } else {
        delete busy[key];
      }
      return { ...s, busy };
    });
  }

  private setThread(sessionId: string, thread: ThreadState): void {
    this.update((s) => ({ ...s, threads: { ...s.threads, [sessionId]: thread } }));
  }

  private patchFold(sessionId: string, fn: (fold: ThreadFold) => ThreadFold): void {
    this.update((s) => {
      const thread = s.threads[sessionId];
      if (!thread) {
        return s;
      }
      const fold = fn(thread.fold);
      return fold === thread.fold ? s : { ...s, threads: { ...s.threads, [sessionId]: { ...thread, fold } } };
    });
  }

  private patchMeta(sessionId: string, patch: Partial<ThreadFold["meta"]>): void {
    this.patchFold(sessionId, (f) => ({ ...f, meta: { ...f.meta, ...patch } }));
  }

  private upsertSession(session: SessionSummary): void {
    this.update((s) => ({ ...s, sessions: { ...s.sessions, [session.sessionId]: session } }));
  }
}
