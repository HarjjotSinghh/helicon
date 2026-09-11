import { spawn } from "node:child_process";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { mkdir, readFile, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { extname, join, normalize, posix, resolve, sep, win32 } from "node:path";
import {
  HeliconMspHost,
  HeliconStore,
  SessionManager,
  isApprovalMode,
  isIfBusy,
  isReasoningEffort,
  planHostCommand,
  planMuseCli,
  planServe,
  probeEnvironment,
  resolveMuseInDistro,
  defaultExec,
  toWslPath,
  toWindowsPath,
  type ApprovalMode,
  type CommandConnection,
  type ExecFn,
  type ServeTarget,
  type SessionRecord,
} from "@helicon/daemon";
import { PathError, createDirectory, listDirectory, resolveUserPath, type PathContext } from "./paths.js";

export const HELICON_VERSION = "0.6.1";

export interface HostExit {
  code: number | null;
  signal: string | null;
}

export interface HostHandle {
  start(version: string): Promise<unknown>;
  connection: CommandConnection;
  close(): Promise<unknown>;
  onExit?(handler: (exit: HostExit) => void): void;
  readonly recentStderr?: string;
}

export type HostFactory = (target: ServeTarget) => HostHandle;

export type OpenTarget = "files" | "editor";
export type Opener = (path: string, target: OpenTarget) => Promise<void>;

const realHostFactory: HostFactory = (target) => new HeliconMspHost(target);

export interface ServerOptions {
  port?: number;
  host?: string;
  dataDir?: string;
  staticDir?: string | null;
  token?: string | null;
  platform?: string;
  distro?: string;
  musePath?: string | null;
  hostFactory?: HostFactory;
  opener?: Opener;
  /** Where `~` points in typed paths; the OS home by default. */
  home?: string;
  /** Days without activity before a thread settles on its own; null turns auto-settle off. */
  autoSettleDays?: number | null;
  /** Runs `muse` CLI calls, like listing skills; the real process runner by default. */
  exec?: ExecFn;
}

interface ManagedHost {
  key: string;
  target: ServeTarget;
  handle: HostHandle;
  manager: SessionManager;
  serverVersion: string | null;
  startedAt: string;
}

/** What the server knows about a session's live run, derived from the MSP view stream. */
/** A session's goal block, kept so the sidebar can show goals in threads the UI has not opened. */
export interface GoalBlock {
  objective: string;
  status: string;
  percentComplete: number;
  currentWork?: string;
  nextWork?: string;
}

interface LiveState {
  activeTurnId: string | null;
  turnStartedAt: string | null;
  pendingApprovals: Set<string>;
  pendingInputs: Set<string>;
  lastTerminal: string | null;
  lastError: string | null;
  goal: GoalBlock | null;
  /** Bumped on every live goal change, so a slow transcript load never writes an older goal over a newer one. */
  goalSeq: number;
}

export interface LiveView {
  activeTurnId: string | null;
  turnStartedAt: string | null;
  pendingApprovals: number;
  pendingInputs: number;
  lastTerminal: string | null;
  lastError: string | null;
  goal: GoalBlock | null;
}

/** A `session/goalChanged` goal: null clears it; undefined means the block is not a goal (no objective). */
function goalOf(value: unknown): GoalBlock | null | undefined {
  if (value === null || value === undefined) {
    return null;
  }
  const record = asRecord(value);
  const objective = record ? str(record["objective"]) : null;
  if (!record || !objective) {
    return undefined;
  }
  const currentWork = str(record["currentWork"]);
  const nextWork = str(record["nextWork"]);
  return {
    objective,
    status: str(record["status"]) ?? "active",
    percentComplete: num(record["percentComplete"]) ?? 0,
    ...(currentWork ? { currentWork } : {}),
    ...(nextWork ? { nextWork } : {}),
  };
}

type SseSink = (event: string, data: unknown) => void;

const MAX_HISTORY_PAGES = 4;
const HISTORY_PAGE_SIZE = 1000;
const DISCOVER_LIMIT = 200;
const TITLE_BACKFILL_LIMIT = 60;
const ENV_CACHE_MS = 30_000;
const CLONE_TIMEOUT_MS = 10 * 60_000;
const AUTO_SETTLE_SWEEP_MS = 60_000;

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function firstString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const found = str(record[key]);
    if (found) {
      return found;
    }
  }
  return null;
}

function isWindowsAbs(path: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(path);
}

function isWslAbs(path: string): boolean {
  return path.startsWith("/");
}

function nowIso(): string {
  return new Date().toISOString();
}

function lastLines(text: string): string {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-3)
    .join(" ");
}

/** Runs a command to completion; rejects with the tail of its stderr. */
function runProcess(command: string, args: string[], timeoutMs: number): Promise<void> {
  return new Promise((done, fail) => {
    const child = spawn(command, args, {
      windowsHide: true,
      stdio: ["ignore", "ignore", "pipe"],
      // Fail fast on a private repository instead of waiting for a password nobody can type.
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
        WSLENV: [process.env["WSLENV"], "GIT_TERMINAL_PROMPT/u"].filter(Boolean).join(":"),
      },
    });
    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-4000);
    });
    const timer = setTimeout(() => {
      child.kill();
      fail(new HttpError(504, "The clone took too long and was stopped."));
    }, timeoutMs);
    child.on("error", (error) => {
      clearTimeout(timer);
      fail(new HttpError(500, `Could not run ${command}: ${error.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        done();
      } else {
        fail(new HttpError(500, lastLines(stderr) || `${command} exited with code ${code ?? "unknown"}.`));
      }
    });
  });
}

/** MSP timestamps carry microseconds; store them in JS ISO form so they sort as strings. */
export function normalizeIso(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const time = Date.parse(value);
  return Number.isNaN(time) ? undefined : new Date(time).toISOString();
}

function normalizeCwd(value: string): string {
  const trimmed = value.trim();
  if (/^[A-Za-z]:[\\/]?$/.test(trimmed) || trimmed === "/") {
    return trimmed;
  }
  return trimmed.replace(/[\\/]+$/, "");
}

/** First meaningful line of the opening prompt, capped for the sidebar. */
export function deriveTitle(text: string): string | null {
  const line = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!line) {
    return null;
  }
  const clean = line.replace(/^[#>*\-\s]+/, "").replace(/\s+/g, " ").trim();
  if (!clean) {
    return null;
  }
  if (clean.length <= 72) {
    return clean;
  }
  const cut = clean.slice(0, 72);
  const space = cut.lastIndexOf(" ");
  return `${(space > 40 ? cut.slice(0, space) : cut).trimEnd()}...`;
}

function errorInfo(error: unknown): { status: number; message: string; kind: string | null } {
  if (error instanceof HttpError) {
    return { status: error.status, message: error.message, kind: null };
  }
  const kind = typeof (error as { kind?: unknown })?.kind === "string" ? ((error as { kind: string }).kind) : null;
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof PathError) {
    return { status: 400, message, kind: null };
  }
  if (error instanceof SyntaxError) {
    return { status: 400, message: "Request body is not valid JSON.", kind: null };
  }
  if (kind === "sessionNotFound" || kind === "notFound" || kind === "approvalNotFound" || kind === "userInputNotFound") {
    return { status: 404, message, kind };
  }
  if (kind) {
    return { status: 409, message, kind };
  }
  return { status: 500, message, kind: null };
}

function stripSource(params: Record<string, unknown>): Record<string, unknown> {
  const rest = { ...params };
  delete rest["sourceRange"];
  return rest;
}

function stripEvent(event: unknown): { method: string; params: Record<string, unknown> } | null {
  const record = asRecord(event);
  const method = record ? str(record["method"]) : null;
  const params = record ? asRecord(record["params"]) : null;
  if (!method || !params) {
    return null;
  }
  return { method, params: stripSource(params) };
}

/** A live MSP notification reshaped for the browser: session-scoped, provenance stripped. */
export function toWireEvent(
  method: string,
  params: Record<string, unknown>,
  at?: number,
): { type: "msp"; sessionId: string; method: string; params: Record<string, unknown>; at: number } | null {
  const session = asRecord(params["session"]);
  const sessionId = str(params["sessionId"]) ?? (session ? str(session["sessionId"]) : null);
  if (!sessionId) {
    return null;
  }
  return { type: "msp", sessionId, method, params: stripSource(params), at: at ?? Date.now() };
}

const CMD_UNSAFE = /[&|<>^%!"\r\n]/;

export function defaultOpener(platform: string): Opener {
  return (path, target) =>
    new Promise<void>((resolveOpen, rejectOpen) => {
      let command: string;
      let args: string[];
      if (platform === "win32") {
        if (CMD_UNSAFE.test(path)) {
          rejectOpen(new HttpError(400, "That folder path contains characters Helicon will not pass to the shell."));
          return;
        }
        [command, args] = target === "editor" ? ["cmd.exe", ["/d", "/c", "code", path]] : ["explorer.exe", [path]];
      } else if (platform === "darwin") {
        [command, args] = target === "editor" ? ["code", [path]] : ["open", [path]];
      } else {
        [command, args] = target === "editor" ? ["code", [path]] : ["xdg-open", [path]];
      }
      const child = spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true });
      child.once("error", (error) =>
        rejectOpen(
          new HttpError(
            500,
            target === "editor"
              ? `Could not launch VS Code (${error.message}). Make sure the \`code\` command is on your PATH.`
              : `Could not open the folder (${error.message}).`,
          ),
        ),
      );
      child.once("spawn", () => {
        child.unref();
        resolveOpen();
      });
    });
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".map": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

interface EnvView {
  platform: string;
  wslAvailable: boolean;
  defaultDistro: string | null;
  museFound: boolean;
  musePath: string | null;
  version: string;
  persistent: boolean;
}

export interface SkillView {
  id: string;
  name: string;
  displayName: string;
  description: string;
  shortDescription: string | null;
  scope: string;
  activation: string;
}

/** One workspace's skills. Where each SKILL.md lives stays on the server; the browser only names skills by id. */
interface SkillListing {
  at: number;
  skills: SkillView[];
  paths: Map<string, string>;
  error: string | null;
}

/** Parses `muse skills list --json`, leaving out skills switched off. Null when the output is not that JSON. */
export function parseSkillList(stdout: string): { skills: SkillView[]; paths: Map<string, string> } | null {
  let root: Record<string, unknown> | null;
  try {
    root = asRecord(JSON.parse(stdout));
  } catch {
    return null;
  }
  if (!root || !Array.isArray(root["skills"])) {
    return null;
  }
  const skills: SkillView[] = [];
  const paths = new Map<string, string>();
  for (const entry of root["skills"]) {
    const r = asRecord(entry);
    const id = r ? str(r["id"]) : null;
    if (!r || !id || str(r["activation"]) === "off") {
      continue;
    }
    const name = str(r["name"]) ?? id;
    skills.push({
      id,
      name,
      displayName: str(r["display_name"]) ?? name,
      description: str(r["description"]) ?? "",
      shortDescription: str(r["short_description"]),
      scope: str(r["scope"]) ?? "unknown",
      activation: str(r["activation"]) ?? "on",
    });
    const path = str(r["path"]);
    if (path) {
      paths.set(id, path);
    }
  }
  return { skills, paths };
}

/** A SKILL.md body without its YAML frontmatter. */
export function stripFrontmatter(text: string): string {
  return text.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/, "").trim();
}

const SKILL_CACHE_MS = 60_000;

export class HeliconServer {
  private readonly server: Server;
  private readonly store: HeliconStore;
  private readonly hosts = new Map<string, ManagedHost>();
  private readonly starting = new Map<string, Promise<ManagedHost>>();
  private readonly fingerprints = new Map<string, unknown>();
  private readonly sinks = new Set<SseSink>();
  private readonly live = new Map<string, LiveState>();
  private readonly sessionHosts = new Map<string, string>();
  private readonly opener: Opener;
  private readonly titleQueue: string[] = [];
  private titleWorker: Promise<void> | null = null;
  private changeTimer: ReturnType<typeof setTimeout> | null = null;
  private settleTimer: ReturnType<typeof setInterval> | null = null;
  private envCache: { at: number; value: EnvView } | null = null;
  private readonly skillCache = new Map<string, SkillListing>();
  private lastHostError: string | null = null;
  private closed = false;
  private readonly options: Required<
    Omit<ServerOptions, "staticDir" | "token" | "platform" | "distro" | "musePath" | "hostFactory" | "opener" | "exec">
  > &
    Pick<ServerOptions, "staticDir" | "token"> & {
      platform: string;
      distro?: string;
      musePath?: string | null;
      hostFactory: HostFactory;
      exec: ExecFn;
    };

  constructor(options: ServerOptions = {}) {
    this.options = {
      port: options.port ?? 3127,
      host: options.host ?? "127.0.0.1",
      dataDir: options.dataDir ?? ":memory:",
      staticDir: options.staticDir ? resolve(options.staticDir) : null,
      token: options.token ?? null,
      platform: options.platform ?? process.platform,
      distro: options.distro,
      musePath: options.musePath,
      hostFactory: options.hostFactory ?? realHostFactory,
      home: options.home ?? homedir(),
      autoSettleDays: options.autoSettleDays === undefined ? 3 : options.autoSettleDays,
      exec: options.exec ?? defaultExec,
    };
    this.opener = options.opener ?? defaultOpener(this.options.platform);
    this.store = new HeliconStore(
      this.options.dataDir === ":memory:" ? ":memory:" : join(this.options.dataDir, "helicon.db"),
    );
    this.server = createServer((req, res) => {
      void this.route(req, res).catch((error) => this.fail(res, 500, String(error)));
    });
  }

  async listen(): Promise<{ port: number; host: string }> {
    await new Promise<void>((resolve) => this.server.listen(this.options.port, this.options.host, resolve));
    const address = this.server.address();
    const port = typeof address === "object" && address ? address.port : this.options.port;
    // No sweep at startup: which threads are busy in other Muse clients is only known after discovery.
    this.settleTimer = setInterval(() => this.autoSettle(), AUTO_SETTLE_SWEEP_MS);
    this.settleTimer.unref?.();
    return { port, host: this.options.host };
  }

  async close(): Promise<void> {
    this.closed = true;
    if (this.changeTimer) {
      clearTimeout(this.changeTimer);
      this.changeTimer = null;
    }
    if (this.settleTimer) {
      clearInterval(this.settleTimer);
      this.settleTimer = null;
    }
    this.titleQueue.length = 0;
    for (const sink of [...this.sinks]) {
      this.sinks.delete(sink);
    }
    for (const pending of this.starting.values()) {
      await pending.catch(() => undefined);
    }
    for (const managed of this.hosts.values()) {
      try {
        await managed.handle.close();
      } catch {
        /* best effort */
      }
    }
    this.hosts.clear();
    this.server.closeAllConnections?.();
    await new Promise<void>((resolve, reject) =>
      this.server.close((error) => (error ? reject(error) : resolve())),
    );
    await this.titleWorker?.catch(() => undefined);
    this.store.close();
  }

  private emit(type: string, data: unknown): void {
    for (const sink of this.sinks) {
      try {
        sink(type, data);
      } catch {
        /* drop broken sinks on next write */
      }
    }
  }

  /** Coalesce bursts (discovery, title backfill) into one sidebar refresh. */
  private sessionsChanged(): void {
    if (this.changeTimer || this.closed) {
      return;
    }
    this.changeTimer = setTimeout(() => {
      this.changeTimer = null;
      this.emit("helicon", { type: "sessions-changed" });
    }, 120);
  }

  private authorized(req: IncomingMessage): boolean {
    if (!this.options.token) {
      return true;
    }
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.searchParams.get("token") === this.options.token) {
      return true;
    }
    const header = req.headers["authorization"];
    return header === `Bearer ${this.options.token}`;
  }

  private json(res: ServerResponse, status: number, body: unknown): void {
    const text = JSON.stringify(body);
    res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    res.end(text);
  }

  private fail(res: ServerResponse, status: number, message: string, kind: string | null = null): void {
    if (!res.headersSent) {
      this.json(res, status, { error: message, kind });
    } else {
      res.end();
    }
  }

  private async readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    const text = Buffer.concat(chunks).toString("utf8").trim();
    if (!text) {
      return {};
    }
    return asRecord(JSON.parse(text) as unknown) ?? {};
  }

  private async route(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", "http://localhost");
    const path = url.pathname;
    if (!this.authorized(req)) {
      this.fail(res, 401, "Missing or invalid token.");
      return;
    }
    const method = (req.method ?? "GET").toUpperCase();
    if (path.startsWith("/api/")) {
      try {
        const handled = await this.api(method, path, url, req, res);
        if (!handled) {
          this.fail(res, 404, "Not found.");
        }
      } catch (error) {
        const info = errorInfo(error);
        this.fail(res, info.status, info.message, info.kind);
      }
      return;
    }
    if (this.options.staticDir && method === "GET") {
      const served = await this.serveStatic(path, res);
      if (served) {
        return;
      }
    }
    this.fail(res, 404, "Not found.");
  }

  private async api(
    method: string,
    path: string,
    url: URL,
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<boolean> {
    if (method === "GET" && path === "/api/health") {
      this.json(res, 200, {
        ok: true,
        version: HELICON_VERSION,
        hosts: [...this.hosts.values()].map((h) => ({
          key: h.key,
          serverVersion: h.serverVersion,
          startedAt: h.startedAt,
        })),
        lastHostError: this.lastHostError,
        fingerprintWarnings: Object.fromEntries(this.fingerprints),
      });
      return true;
    }
    if (method === "GET" && path === "/api/env") {
      this.json(res, 200, await this.environment(url.searchParams.get("refresh") === "1"));
      return true;
    }
    if (method === "GET" && path === "/api/events") {
      this.serveEvents(res);
      return true;
    }
    if (method === "GET" && path === "/api/projects") {
      this.json(res, 200, {
        projects: this.store.listProjects().map((p) => ({
          cwd: p.cwd,
          displayName: p.displayName,
          pinned: p.pinned,
          activityAt: p.activityAt,
        })),
      });
      return true;
    }
    if (method === "POST" && path === "/api/projects") {
      const body = await this.readBody(req);
      const raw = str(body["cwd"]);
      if (!raw || !raw.trim()) {
        throw new HttpError(400, "cwd is required.");
      }
      const cwd = await this.canonicalCwd(raw, body["create"] === true);
      this.json(res, 200, await this.addProjectFolder(cwd));
      return true;
    }
    if (method === "POST" && path === "/api/projects/clone") {
      const body = await this.readBody(req);
      const remote = str(body["url"])?.trim() ?? "";
      const target = str(body["path"])?.trim() ?? "";
      if (!remote || !target) {
        throw new HttpError(400, "url and path are required.");
      }
      if (!/^(https?:\/\/|ssh:\/\/|git:\/\/)\S+$/.test(remote) && !/^git@[^\s:]+:\S+$/.test(remote)) {
        throw new HttpError(400, "That does not look like a Git URL.");
      }
      const cwd = normalizeCwd(await this.cloneRepository(remote, target));
      this.json(res, 200, await this.addProjectFolder(cwd));
      return true;
    }
    if (method === "GET" && path === "/api/fs/list") {
      const target = url.searchParams.get("path") ?? "";
      this.json(res, 200, await listDirectory(target, await this.pathContext(target)));
      return true;
    }
    if (method === "POST" && path === "/api/fs/reveal") {
      const body = await this.readBody(req);
      const target = str(body["path"]);
      if (!target) {
        throw new HttpError(400, "path is required.");
      }
      const resolved = resolveUserPath(target, await this.pathContext(target));
      const info = await stat(resolved.local).catch(() => null);
      if (!info?.isDirectory()) {
        throw new HttpError(404, "That folder does not exist.");
      }
      await this.opener(resolved.local, "files");
      this.json(res, 200, { ok: true });
      return true;
    }
    if (method === "DELETE" && path === "/api/projects") {
      const cwd = url.searchParams.get("cwd");
      if (!cwd) {
        throw new HttpError(400, "cwd is required.");
      }
      this.store.setHidden(cwd, true);
      this.sessionsChanged();
      this.json(res, 200, { ok: true });
      return true;
    }
    if (method === "PATCH" && path === "/api/projects/pin") {
      const body = await this.readBody(req);
      const cwd = str(body["cwd"]);
      if (!cwd) {
        throw new HttpError(400, "cwd is required.");
      }
      this.store.upsertProject(cwd);
      this.store.setPinned(cwd, body["pinned"] === true);
      this.sessionsChanged();
      this.json(res, 200, { ok: true });
      return true;
    }
    if (method === "GET" && path === "/api/slash") {
      const listing = await this.listSkills(normalizeCwd(url.searchParams.get("cwd") ?? ""));
      this.json(res, 200, { skills: listing.skills, error: listing.error });
      return true;
    }
    if (method === "GET" && path === "/api/slash/skill") {
      const id = url.searchParams.get("id");
      if (!id) {
        throw new HttpError(400, "id is required.");
      }
      const body = await this.skillBody(normalizeCwd(url.searchParams.get("cwd") ?? ""), id);
      this.json(res, 200, { id, body });
      return true;
    }
    if (method === "GET" && path === "/api/sessions") {
      const cwd = url.searchParams.get("cwd");
      const includeArchived = url.searchParams.get("archived") === "1";
      const projects = cwd
        ? [this.store.getProject(cwd)].filter((p): p is NonNullable<typeof p> => p !== null)
        : this.store.listProjects();
      const sessions = projects.flatMap((project) =>
        this.store
          .listSessionsByProject(project.id, { includeArchived })
          .map((record) => this.summary(record, project.cwd)),
      );
      this.json(res, 200, { sessions });
      return true;
    }
    if (method === "POST" && path === "/api/discover") {
      const body = await this.readBody(req);
      const cwd = str(body["cwd"]) ?? undefined;
      this.json(res, 200, { sessions: await this.discover(cwd) });
      return true;
    }
    if (method === "POST" && path === "/api/sessions") {
      const body = await this.readBody(req);
      const raw = str(body["cwd"]);
      if (!raw) {
        throw new HttpError(400, "cwd is required.");
      }
      const mode = body["approvalMode"];
      if (mode !== undefined && mode !== null && !isApprovalMode(mode)) {
        throw new HttpError(400, "Unknown approvalMode.");
      }
      const session = await this.startSession(
        normalizeCwd(raw),
        mode === undefined || mode === null ? undefined : (mode as ApprovalMode),
        str(body["modelId"]) ?? undefined,
      );
      this.json(res, 200, { session });
      return true;
    }

    const sessionMatch = path.match(/^\/api\/sessions\/([^/]+)(?:\/(resume|model|approval-mode|compact|shell|fork))?$/);
    if (sessionMatch) {
      const sessionId = decodeURIComponent(sessionMatch[1] as string);
      const action = sessionMatch[2];
      if (method === "PATCH" && !action) {
        const body = await this.readBody(req);
        const found = this.store.findSession(sessionId);
        if (!found) {
          throw new HttpError(404, "Unknown session.");
        }
        const title = typeof body["title"] === "string" ? body["title"].trim().slice(0, 200) : undefined;
        const settled = typeof body["settled"] === "boolean" ? body["settled"] : undefined;
        if (settled === true && this.isBusy(sessionId)) {
          throw new HttpError(409, "Stop the running turn and answer its requests before settling this thread.");
        }
        const record = this.store.updateSession(sessionId, {
          ...(title ? { title, titleSource: "user" as const } : {}),
          ...(typeof body["archived"] === "boolean" ? { archived: body["archived"] } : {}),
          // Un-settling by hand keeps the thread out of auto-settle until its next activity.
          ...(settled === true ? { settledOverride: "settled" as const, settledAt: nowIso(), unsettledAt: null } : {}),
          ...(settled === false ? { settledOverride: "active" as const, settledAt: null, unsettledAt: nowIso() } : {}),
        });
        this.sessionsChanged();
        this.json(res, 200, { session: record ? this.summary(record, found.cwd) : null });
        return true;
      }
      if (method === "POST" && action) {
        const body = await this.readBody(req);
        if (action === "resume") {
          this.json(res, 200, await this.loadTranscript(sessionId));
          return true;
        }
        const manager = await this.managerForSession(sessionId);
        if (action === "model") {
          if (!("model" in body)) {
            throw new HttpError(400, "model is required.");
          }
          await manager.setSessionModel(sessionId, body["model"]);
          const modelId = str(asRecord(body["model"])?.["modelId"]);
          if (modelId) {
            this.store.updateSession(sessionId, { modelId });
          }
          this.json(res, 200, { ok: true });
          return true;
        }
        if (action === "compact") {
          this.json(res, 200, { result: await manager.compactSession(sessionId) });
          return true;
        }
        if (action === "shell") {
          const command = str(body["command"])?.trim();
          if (!command) {
            throw new HttpError(400, "command is required.");
          }
          this.wake(sessionId);
          await manager.userShell(sessionId, command);
          this.store.updateSession(sessionId, { activityAt: nowIso() });
          this.json(res, 200, { ok: true });
          return true;
        }
        if (action === "fork") {
          this.json(res, 200, { session: await this.forkSession(sessionId, manager) });
          return true;
        }
        const mode = body["mode"];
        if (!isApprovalMode(mode)) {
          throw new HttpError(400, "Unknown mode.");
        }
        await manager.setSessionApprovalMode(sessionId, mode);
        this.json(res, 200, { ok: true });
        return true;
      }
    }

    if (method === "POST" && path === "/api/turns") {
      const body = await this.readBody(req);
      const sessionId = str(body["sessionId"]);
      const text = str(body["text"]);
      if (!sessionId || !text) {
        throw new HttpError(400, "sessionId and text are required.");
      }
      const ifBusy = body["ifBusy"];
      if (ifBusy !== undefined && ifBusy !== null && !isIfBusy(ifBusy)) {
        throw new HttpError(400, "Unknown ifBusy.");
      }
      const effort = body["reasoningEffort"];
      if (effort !== undefined && effort !== null && !isReasoningEffort(effort)) {
        throw new HttpError(400, "Unknown reasoningEffort.");
      }
      const manager = await this.managerForSession(sessionId);
      this.wake(sessionId);
      const ack = await manager.sendTurn(sessionId, text, {
        displayText: str(body["displayText"]) ?? undefined,
        ifBusy: typeof ifBusy === "string" ? ifBusy : undefined,
        reasoningEffort: typeof effort === "string" ? effort : undefined,
      });
      this.store.updateSession(sessionId, { activityAt: nowIso() });
      this.json(res, 200, { turnId: ack.turnId, status: ack.status, disposition: ack.disposition });
      return true;
    }

    const turnMatch = path.match(/^\/api\/turns\/(steer|interrupt|cancel|unqueue)$/);
    if (method === "POST" && turnMatch) {
      const action = turnMatch[1] as string;
      const body = await this.readBody(req);
      const sessionId = str(body["sessionId"]);
      const turnId = str(body["turnId"]);
      if (!sessionId) {
        throw new HttpError(400, "sessionId is required.");
      }
      const manager = await this.managerForSession(sessionId);
      if (action === "steer") {
        const text = str(body["text"]);
        if (!turnId || !text) {
          throw new HttpError(400, "turnId and text are required to steer.");
        }
        await manager.steerTurn(sessionId, turnId, text);
      } else if (action === "interrupt") {
        await manager.interruptTurn(sessionId, turnId ?? undefined, body["retract"] === true);
      } else if (action === "cancel") {
        if (!turnId) {
          throw new HttpError(400, "turnId is required.");
        }
        await manager.cancelTurn(sessionId, turnId);
      } else {
        if (!turnId) {
          throw new HttpError(400, "turnId is required.");
        }
        await manager.unqueueTurn(sessionId, turnId);
      }
      this.json(res, 200, { ok: true });
      return true;
    }

    if (method === "POST" && path === "/api/approvals/decide") {
      const body = await this.readBody(req);
      const sessionId = str(body["sessionId"]);
      const approvalId = str(body["approvalId"]);
      const choiceId = str(body["choiceId"]);
      if (!sessionId || !approvalId || !choiceId || !("requirementId" in body)) {
        throw new HttpError(400, "sessionId, approvalId, requirementId and choiceId are required.");
      }
      const manager = await this.managerForSession(sessionId);
      await manager.decideApproval({
        sessionId,
        approvalId,
        requirementId: body["requirementId"],
        choiceId,
        feedback: str(body["feedback"]),
      });
      this.json(res, 200, { ok: true });
      return true;
    }

    if (method === "GET" && path === "/api/models") {
      const sessionId = url.searchParams.get("sessionId") ?? undefined;
      const manager = sessionId ? await this.managerForSession(sessionId) : (await this.hostFor("")).manager;
      this.json(res, 200, { models: await manager.listModels(sessionId) });
      return true;
    }

    const inputMatch = path.match(/^\/api\/user-input\/(answer|cancel|clarify)$/);
    if (method === "POST" && inputMatch) {
      const action = inputMatch[1] as string;
      const body = await this.readBody(req);
      const sessionId = str(body["sessionId"]);
      const userInputId = str(body["userInputId"]);
      if (!sessionId || !userInputId) {
        throw new HttpError(400, "sessionId and userInputId are required.");
      }
      const manager = await this.managerForSession(sessionId);
      if (action === "answer") {
        const answers = body["answers"];
        if (!Array.isArray(answers)) {
          throw new HttpError(400, "answers are required.");
        }
        await manager.answerUserInput(sessionId, userInputId, answers as never);
      } else if (action === "cancel") {
        await manager.cancelUserInput(sessionId, userInputId, str(body["reason"]) ?? undefined);
      } else {
        const content = str(body["content"]);
        if (!content) {
          throw new HttpError(400, "content is required.");
        }
        await manager.clarifyUserInput(sessionId, userInputId, content);
      }
      this.json(res, 200, { ok: true });
      return true;
    }

    if (method === "POST" && path === "/api/open") {
      const body = await this.readBody(req);
      const cwd = str(body["cwd"]);
      if (!cwd || !this.store.getProject(cwd)) {
        throw new HttpError(404, "Unknown project folder.");
      }
      const target: OpenTarget = body["target"] === "editor" ? "editor" : "files";
      await this.opener(this.localPathFor(cwd), target);
      this.json(res, 200, { ok: true });
      return true;
    }
    return false;
  }

  private async environment(refresh: boolean): Promise<EnvView> {
    if (!refresh && this.envCache && Date.now() - this.envCache.at < ENV_CACHE_MS) {
      return this.envCache.value;
    }
    const probe = await probeEnvironment(defaultExec, this.options.platform);
    const value: EnvView = {
      platform: probe.platform,
      wslAvailable: probe.wslAvailable,
      defaultDistro: probe.defaultDistro,
      museFound: probe.musePath !== null,
      musePath: probe.musePath,
      version: HELICON_VERSION,
      persistent: this.options.dataDir !== ":memory:",
    };
    this.envCache = { at: Date.now(), value };
    return value;
  }

  private serveEvents(res: ServerResponse): void {
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });
    const sink: SseSink = (event, data) => {
      if (res.writableEnded) {
        this.sinks.delete(sink);
        return;
      }
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    this.sinks.add(sink);
    sink("helicon", { type: "hello", version: HELICON_VERSION });
    const heartbeat = setInterval(() => {
      if (res.writableEnded) {
        clearInterval(heartbeat);
        this.sinks.delete(sink);
        return;
      }
      res.write(": ping\n\n");
    }, 25000);
    res.on("close", () => {
      clearInterval(heartbeat);
      this.sinks.delete(sink);
    });
  }

  private async serveStatic(path: string, res: ServerResponse): Promise<boolean> {
    if (!this.options.staticDir) {
      return false;
    }
    const root = this.options.staticDir;
    const rel = path === "/" ? "/index.html" : path;
    const full = normalize(join(root, rel));
    if (!full.startsWith(root + sep) && full !== root) {
      return false;
    }
    try {
      const info = await stat(full);
      const file = info.isDirectory() ? join(full, "index.html") : full;
      const body = await readFile(file);
      const immutable = file.includes(`${sep}assets${sep}`);
      res.writeHead(200, {
        "content-type": MIME[extname(file)] ?? "application/octet-stream",
        "cache-control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
      });
      res.end(body);
      return true;
    } catch {
      return false;
    }
  }

  private liveFor(sessionId: string): LiveState {
    let state = this.live.get(sessionId);
    if (!state) {
      state = {
        activeTurnId: null,
        turnStartedAt: null,
        pendingApprovals: new Set(),
        pendingInputs: new Set(),
        lastTerminal: null,
        lastError: null,
        goal: null,
        goalSeq: 0,
      };
      this.live.set(sessionId, state);
    }
    return state;
  }

  private liveView(sessionId: string): LiveView | null {
    const state = this.live.get(sessionId);
    if (!state) {
      return null;
    }
    return {
      activeTurnId: state.activeTurnId,
      turnStartedAt: state.turnStartedAt,
      pendingApprovals: state.pendingApprovals.size,
      pendingInputs: state.pendingInputs.size,
      lastTerminal: state.lastTerminal,
      lastError: state.lastError,
      goal: state.goal,
    };
  }

  private emitStatus(sessionId: string): void {
    this.emit("helicon", { type: "session-status", sessionId, live: this.liveView(sessionId) });
  }

  private summary(record: SessionRecord, cwd: string): Record<string, unknown> {
    return {
      sessionId: record.id,
      cwd,
      title: record.title,
      titleSource: record.titleSource,
      turnCount: record.turnCount,
      modelId: record.modelId,
      origin: record.origin,
      archived: record.archived,
      createdAt: record.createdAt,
      activityAt: record.activityAt,
      settled: record.settledOverride === "settled",
      settledAt: record.settledAt,
      unsettledAt: record.unsettledAt,
      live: this.liveView(record.id),
    };
  }

  private isBusy(sessionId: string): boolean {
    const live = this.live.get(sessionId);
    return Boolean(live && (live.activeTurnId || live.pendingApprovals.size > 0 || live.pendingInputs.size > 0));
  }

  /** New activity wakes a settled thread, and lifts a manual "keep active" so auto-settle can apply again. */
  private wake(sessionId: string): void {
    const record = this.store.getSession(sessionId);
    if (!record || record.settledOverride === null) {
      return;
    }
    this.store.updateSession(sessionId, {
      settledOverride: null,
      settledAt: null,
      unsettledAt: record.settledOverride === "settled" ? nowIso() : record.unsettledAt,
    });
    this.sessionsChanged();
  }

  /** Settles threads nobody has touched for `autoSettleDays`, as T3 Code does; a busy thread is left alone. */
  private autoSettle(): void {
    const days = this.options.autoSettleDays;
    if (days === null || this.closed) {
      return;
    }
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
    let changed = false;
    for (const record of this.store.listSettleCandidates(cutoff)) {
      if (this.isBusy(record.id)) {
        continue;
      }
      this.store.updateSession(record.id, { settledOverride: "settled", settledAt: record.activityAt, unsettledAt: null });
      changed = true;
    }
    if (changed) {
      this.sessionsChanged();
    }
  }

  private spawnCwdFor(cwd: string): string {
    if (!cwd) {
      return process.cwd();
    }
    if (this.options.platform !== "win32") {
      return cwd;
    }
    if (isWslAbs(cwd)) {
      try {
        return toWindowsPath(cwd);
      } catch {
        return process.cwd();
      }
    }
    return cwd;
  }

  private hostPathFor(cwd: string): string {
    if (!cwd || this.options.platform !== "win32") {
      return cwd;
    }
    if (isWindowsAbs(cwd)) {
      try {
        return toWslPath(cwd);
      } catch {
        return cwd;
      }
    }
    return cwd;
  }

  private storePathFor(remoteRoot: string): string {
    if (this.options.platform !== "win32" || !isWslAbs(remoteRoot)) {
      return remoteRoot;
    }
    try {
      return toWindowsPath(remoteRoot);
    } catch {
      return remoteRoot;
    }
  }

  /** A path the local OS can open: WSL `/mnt/x` roots become `X:\` on Windows. */
  private localPathFor(cwd: string): string {
    if (this.options.platform === "win32" && isWslAbs(cwd)) {
      try {
        return toWindowsPath(cwd);
      } catch {
        return cwd;
      }
    }
    return cwd;
  }

  /** How typed paths map onto this machine. The WSL distro is only probed for Linux paths on Windows. */
  private async pathContext(forPath: string): Promise<PathContext> {
    const platform = this.options.platform ?? process.platform;
    const value = forPath.trim();
    let distro: string | null = this.options.distro ?? null;
    if (!distro && platform === "win32" && value.startsWith("/") && !/^\/mnt\/[A-Za-z](\/|$)/.test(value)) {
      distro = (await this.environment(false)).defaultDistro;
    }
    return { platform, home: this.options.home ?? homedir(), distro };
  }

  /** The stored form of a project folder: absolute, `~` expanded, one separator style. */
  private async canonicalCwd(raw: string, create: boolean): Promise<string> {
    const ctx = await this.pathContext(raw);
    try {
      const resolved = create ? await createDirectory(raw, ctx) : resolveUserPath(raw, ctx);
      return normalizeCwd(resolved.display);
    } catch (error) {
      if (create || !(error instanceof PathError)) {
        throw error;
      }
      return normalizeCwd(raw);
    }
  }

  private async addProjectFolder(cwd: string): Promise<Record<string, unknown>> {
    this.store.upsertProject(cwd);
    this.store.setHidden(cwd, false);
    let warning: string | null = null;
    let sessions: Record<string, unknown>[] = [];
    try {
      sessions = await this.discover(cwd);
    } catch (error) {
      warning = errorInfo(error).message;
    }
    this.sessionsChanged();
    return { project: { cwd, displayName: this.store.getProject(cwd)?.displayName ?? cwd }, sessions, warning };
  }

  private async cloneRepository(remote: string, target: string): Promise<string> {
    const ctx = await this.pathContext(target);
    const resolved = resolveUserPath(target, ctx);
    const existing = await readdir(resolved.local).catch(() => null);
    if (existing && existing.length > 0) {
      throw new HttpError(409, "That folder already exists and is not empty. Pick another name.");
    }
    await mkdir((ctx.platform === "win32" ? win32 : posix).dirname(resolved.local), { recursive: true });
    // A Linux folder under WSL is cloned by WSL's own git, so it gets Linux line endings and permissions.
    if (ctx.platform === "win32" && resolved.flavor === "posix" && !resolved.display.startsWith("/mnt/")) {
      await runProcess("wsl.exe", ["-d", ctx.distro ?? "", "--", "git", "clone", "--", remote, resolved.display], CLONE_TIMEOUT_MS);
    } else {
      await runProcess("git", ["clone", "--", remote, resolved.local], CLONE_TIMEOUT_MS);
    }
    return resolved.display;
  }

  /** The muse binary for one-off CLI calls; on Windows the environment probe finds it inside WSL. */
  private async cliMusePath(): Promise<string | null> {
    const configured = this.options.musePath ?? null;
    if (this.options.platform !== "win32" || (configured && (configured.includes("/") || configured.includes("\\")))) {
      return configured;
    }
    return (await this.environment(false)).musePath;
  }

  /** A workspace's skills as `muse skills list` reports them, kept for a minute. A failure comes back as `error`, never a throw. */
  private async listSkills(cwd: string): Promise<SkillListing> {
    const key = cwd || "__default__";
    const cached = this.skillCache.get(key);
    if (cached && !cached.error && Date.now() - cached.at < SKILL_CACHE_MS) {
      return cached;
    }
    const args = ["skills", "list", "--json"];
    const root = this.hostPathFor(cwd);
    if (root) {
      args.push("--workspace", root);
    }
    const plan = planMuseCli({ platform: this.options.platform, distro: this.options.distro, musePath: await this.cliMusePath(), args });
    const result = await this.options.exec(plan.command, plan.args);
    const parsed = parseSkillList(result.stdout);
    const listing: SkillListing = parsed
      ? { at: Date.now(), ...parsed, error: null }
      : {
          at: Date.now(),
          skills: [],
          paths: new Map(),
          error:
            result.exitCode === 0
              ? "Muse listed its skills in a form Helicon does not understand."
              : "Could not list Muse skills. Check that muse runs in a terminal.",
        };
    this.skillCache.set(key, listing);
    return listing;
  }

  /** A listed skill's instructions, read where Muse keeps them. The path comes from Muse, never from the request. */
  private async skillBody(cwd: string, id: string): Promise<string> {
    const path = (await this.listSkills(cwd)).paths.get(id);
    if (!path) {
      throw new HttpError(404, "Muse does not list that skill for this workspace.");
    }
    const bundled = /^bundled:\/\/(.+)$/.exec(path)?.[1];
    if (bundled?.split("/").includes("..")) {
      throw new HttpError(400, "That skill's path is not readable.");
    }
    // Bundled skills live in Muse's data folder; the others list a real file path.
    const script = bundled ? 'exec cat -- "${XDG_DATA_HOME:-$HOME/.local/share}/muse/skills/bundled/$1"' : 'exec cat -- "$1"';
    const plan = planHostCommand({
      platform: this.options.platform,
      distro: this.options.distro,
      program: "sh",
      args: ["-c", script, "sh", bundled ?? path],
    });
    const result = await this.options.exec(plan.command, plan.args);
    const body = result.exitCode === 0 ? stripFrontmatter(result.stdout) : "";
    if (!body) {
      throw new HttpError(502, "Could not read that skill's instructions.");
    }
    return body;
  }

  private async forkSession(sessionId: string, manager: SessionManager): Promise<Record<string, unknown>> {
    const found = this.store.findSession(sessionId);
    if (!found) {
      throw new HttpError(404, "Unknown session.");
    }
    const forked = await manager.forkSession(sessionId);
    const raw = asRecord(asRecord(forked.raw)?.["session"]);
    const record = this.store.recordSession({
      id: forked.sessionId,
      projectId: found.session.projectId,
      origin: "helicon",
      // The fork carries its source's name until the user renames it.
      title: `${found.session.title} (fork)`,
      titleSource: "auto",
      modelId: raw ? str(raw["modelId"]) : found.session.modelId,
      turnCount: num(raw?.["turnCount"]),
      createdAt: normalizeIso(raw?.["createdAt"]),
    });
    const hostKey = this.sessionHosts.get(sessionId);
    if (hostKey) {
      this.sessionHosts.set(forked.sessionId, hostKey);
    }
    this.liveFor(forked.sessionId);
    this.sessionsChanged();
    return this.summary(record, found.cwd);
  }

  private async startSession(cwd: string, approvalMode?: ApprovalMode, modelId?: string): Promise<Record<string, unknown>> {
    const project = this.store.upsertProject(cwd);
    this.store.setHidden(cwd, false);
    const host = await this.hostFor(cwd);
    const started = await host.manager.startSession({
      workspaceRoot: this.hostPathFor(cwd),
      approvalMode,
      modelId,
    });
    const raw = asRecord(asRecord(started.raw)?.["session"]);
    const record = this.store.recordSession({
      id: started.sessionId,
      projectId: project.id,
      origin: "helicon",
      modelId: raw ? str(raw["modelId"]) : null,
      createdAt: normalizeIso(raw?.["createdAt"]),
    });
    this.sessionHosts.set(started.sessionId, host.key);
    this.liveFor(started.sessionId);
    this.sessionsChanged();
    return this.summary(record, cwd);
  }

  private async loadTranscript(sessionId: string): Promise<Record<string, unknown>> {
    // A goal change can land while this load is in flight; history must not then write the older goal back.
    const goalSeqAtStart = this.liveFor(sessionId).goalSeq;
    const found = this.store.findSession(sessionId);
    const host = await this.hostFor(found?.cwd ?? "");
    const manager = host.manager;
    let readOnly = false;
    let readOnlyReason: string | null = null;
    let msp: Record<string, unknown> | null = null;
    try {
      msp = asRecord(asRecord(await manager.resumeSession(sessionId, true))?.["session"]);
      this.sessionHosts.set(sessionId, host.key);
    } catch (error) {
      const info = errorInfo(error);
      // Only another host holding the session makes it read-only here; any other failure is real and surfaces.
      if (info.kind !== "sessionInUse") {
        throw error;
      }
      readOnly = true;
      readOnlyReason = info.message;
      const read = await manager.readSession(sessionId, true).catch(() => null);
      msp = asRecord(asRecord(read)?.["session"]);
    }

    const pages: unknown[][] = [];
    let cursor: string | undefined;
    let truncated = false;
    for (let page = 0; page < MAX_HISTORY_PAGES; page += 1) {
      const result = await manager.pageView(sessionId, { cursor, direction: "backward", limit: HISTORY_PAGE_SIZE });
      pages.unshift(result.events);
      if (!result.nextCursor || result.events.length === 0) {
        break;
      }
      cursor = result.nextCursor;
      truncated = page === MAX_HISTORY_PAGES - 1;
    }
    const events = pages
      .flat()
      .map(stripEvent)
      .filter((e): e is NonNullable<typeof e> => e !== null);

    const pending = await manager.listPending(sessionId).catch(() => ({ approvals: [], userInputs: [] }));
    const approvals = pending.approvals.map((a) => stripSource(asRecord(a) ?? {}));
    const userInputs = pending.userInputs.map((u) => stripSource(asRecord(u) ?? {}));

    const live = this.liveFor(sessionId);
    if (msp) {
      const active = str(msp["activeTurnId"]);
      if (active !== live.activeTurnId) {
        live.activeTurnId = active;
        live.turnStartedAt = active ? (live.turnStartedAt ?? nowIso()) : null;
      }
    }
    live.pendingApprovals = new Set(approvals.map((a) => str(a["approvalId"])).filter((id): id is string => id !== null));
    live.pendingInputs = new Set(userInputs.map((u) => str(u["userInputId"])).filter((id): id is string => id !== null));
    // The history's last goal change is the goal as of now, unless a live one arrived while this load ran.
    for (let index = events.length - 1; live.goalSeq === goalSeqAtStart && index >= 0; index -= 1) {
      const event = events[index];
      const goal = event?.method === "session/goalChanged" ? goalOf(event.params["goal"]) : undefined;
      if (goal !== undefined) {
        live.goal = goal;
        break;
      }
    }
    this.emitStatus(sessionId);

    if (found) {
      this.store.recordSession({
        id: sessionId,
        projectId: found.session.projectId,
        turnCount: num(msp?.["turnCount"]),
        modelId: msp ? str(msp["modelId"]) : null,
        activityAt: normalizeIso(msp?.["updatedAt"]),
      });
      if (found.session.titleSource === "placeholder") {
        const title = titleFromEvents(events);
        if (title) {
          this.store.updateSession(sessionId, { title, titleSource: "auto" });
          this.sessionsChanged();
        }
      }
    }
    const record = this.store.getSession(sessionId);
    return {
      session: record && found ? this.summary(record, found.cwd) : null,
      msp: msp
        ? {
            status: str(msp["status"]),
            activeTurnId: str(msp["activeTurnId"]),
            modelId: str(msp["modelId"]),
            approvalMode: asRecord(msp["approvalMode"])?.["mode"] ?? null,
            workspaceRoot: str(msp["workspaceRoot"]),
            turnCount: num(msp["turnCount"]) ?? 0,
            // History pages carry no context readings, so pass along the session's own when it has them.
            contextUsage: asRecord(msp["contextUsage"]) ?? null,
            tokenUsage: asRecord(msp["tokenUsage"]) ?? null,
          }
        : null,
      events,
      truncated,
      pending: { approvals, userInputs },
      readOnly,
      readOnlyReason,
    };
  }

  private async discover(cwd?: string): Promise<Record<string, unknown>[]> {
    const host = await this.hostFor(cwd ?? "");
    const remote: unknown[] = [];
    let cursor: string | null = null;
    do {
      const page = await host.manager.listSessionsPage({
        workspaceRoot: cwd ? this.hostPathFor(cwd) : undefined,
        limit: 100,
        cursor,
      });
      remote.push(...page.sessions);
      cursor = page.nextCursor;
    } while (cursor && remote.length < DISCOVER_LIMIT);

    const views: Record<string, unknown>[] = [];
    let backfill = 0;
    for (const item of remote) {
      const record = asRecord(item);
      const session = (record && asRecord(record["session"])) ?? record;
      const sessionId = session ? str(session["sessionId"]) : null;
      if (!session || !sessionId) {
        continue;
      }
      const root = this.storePathFor(firstString(session, ["workspaceRoot"]) ?? cwd ?? "");
      if (!root) {
        continue;
      }
      const project = this.store.upsertProject(root);
      const existing = this.store.getSession(sessionId);
      // Muse names its own sessions, and that name is what the user sees in the CLI, so it wins here too.
      // Only a title the user typed in Helicon outranks it.
      const keepOurs = existing?.titleSource === "user";
      const title = keepOurs ? null : firstString(session, ["title", "name"]);
      const stored = this.store.recordSession({
        id: sessionId,
        projectId: project.id,
        origin: existing?.origin ?? "tui",
        title: title ?? undefined,
        titleSource: title ? "auto" : undefined,
        turnCount: num(session["turnCount"]),
        modelId: str(session["modelId"]),
        createdAt: normalizeIso(session["createdAt"]),
        activityAt: normalizeIso(session["updatedAt"]),
      });
      const running = str(session["status"]) === "running" && Boolean(str(session["activeTurnId"]));
      if (running) {
        const live = this.liveFor(sessionId);
        live.activeTurnId = str(session["activeTurnId"]);
        live.turnStartedAt = live.turnStartedAt ?? nowIso();
        this.sessionHosts.set(sessionId, host.key);
      }
      // A settled thread that moved on in another Muse client (running now, or updated since) comes back.
      let current = stored;
      if (stored.settledOverride === "settled" && (running || (stored.settledAt !== null && stored.activityAt > stored.settledAt))) {
        this.wake(sessionId);
        current = this.store.getSession(sessionId) ?? stored;
      }
      if (stored.titleSource === "placeholder" && backfill < TITLE_BACKFILL_LIMIT) {
        backfill += 1;
        this.queueTitle(sessionId);
      }
      views.push(this.summary(current, project.cwd));
    }
    this.sessionsChanged();
    return views;
  }

  private queueTitle(sessionId: string): void {
    if (this.closed || this.titleQueue.includes(sessionId)) {
      return;
    }
    this.titleQueue.push(sessionId);
    if (!this.titleWorker) {
      this.titleWorker = this.drainTitles().finally(() => {
        this.titleWorker = null;
      });
    }
  }

  private async drainTitles(): Promise<void> {
    while (this.titleQueue.length > 0 && !this.closed) {
      const sessionId = this.titleQueue.shift() as string;
      try {
        const current = this.store.getSession(sessionId);
        if (!current || current.titleSource !== "placeholder") {
          continue;
        }
        const host = await this.hostFor("");
        const page = await host.manager.pageView(sessionId, { direction: "forward", limit: 30 });
        if (this.closed) {
          return;
        }
        const title = titleFromEvents(page.events.map(stripEvent).filter((e): e is NonNullable<typeof e> => e !== null));
        if (title) {
          this.store.updateSession(sessionId, { title, titleSource: "auto" });
          this.sessionsChanged();
        }
      } catch {
        /* a title is a nicety; the placeholder stays */
      }
    }
  }

  private async managerForSession(sessionId: string): Promise<SessionManager> {
    const key = this.sessionHosts.get(sessionId);
    const loaded = key ? this.hosts.get(key) : undefined;
    if (loaded) {
      return loaded.manager;
    }
    const found = this.store.findSession(sessionId);
    return (await this.hostFor(found?.cwd ?? "")).manager;
  }

  private async hostFor(cwd: string): Promise<ManagedHost> {
    const key = this.hostPathFor(cwd) || "__default__";
    const existing = this.hosts.get(key);
    if (existing) {
      return existing;
    }
    const pending = this.starting.get(key);
    if (pending) {
      return pending;
    }
    if (this.closed) {
      throw new HttpError(503, "Helicon is shutting down.");
    }
    const startup = this.spawnHost(key, cwd);
    this.starting.set(key, startup);
    try {
      return await startup;
    } finally {
      this.starting.delete(key);
    }
  }

  private async spawnHost(key: string, cwd: string): Promise<ManagedHost> {
    const target = await this.serveTargetFor(cwd);
    const handle = this.options.hostFactory(target);
    let started: { fingerprintWarning?: unknown; initializeResult?: unknown } | null;
    try {
      started = (await handle.start(HELICON_VERSION)) as typeof started;
    } catch (error) {
      this.lastHostError = error instanceof Error ? error.message : String(error);
      this.emit("helicon", { type: "host", key, state: "failed", message: this.lastHostError });
      throw new HttpError(502, `Could not start Muse: ${this.lastHostError}`);
    }
    this.lastHostError = null;
    this.fingerprints.set(key, started?.fingerprintWarning ?? null);
    const manager = new SessionManager(handle.connection);
    manager.onNotification((notification) => this.forward(key, notification));
    const serverInfo = asRecord(asRecord(started?.initializeResult)?.["serverInfo"]);
    const managed: ManagedHost = {
      key,
      target,
      handle,
      manager,
      serverVersion: serverInfo ? str(serverInfo["version"]) : null,
      startedAt: nowIso(),
    };
    handle.onExit?.((exit) => this.hostExited(managed, exit));
    this.hosts.set(key, managed);
    return managed;
  }

  private hostExited(managed: ManagedHost, exit: HostExit): void {
    if (this.hosts.get(managed.key) !== managed) {
      return;
    }
    this.hosts.delete(managed.key);
    const detail = managed.handle.recentStderr?.trim();
    const message = `The Muse host exited (${exit.code ?? exit.signal ?? "unknown"}).${detail ? ` ${detail}` : ""}`;
    this.lastHostError = message;
    this.emit("helicon", { type: "host", key: managed.key, state: "exited", message });
    for (const [sessionId, key] of this.sessionHosts) {
      if (key !== managed.key) {
        continue;
      }
      this.sessionHosts.delete(sessionId);
      const live = this.live.get(sessionId);
      if (live && (live.activeTurnId || live.pendingApprovals.size || live.pendingInputs.size)) {
        live.activeTurnId = null;
        live.turnStartedAt = null;
        live.pendingApprovals.clear();
        live.pendingInputs.clear();
        live.lastTerminal = "failed";
        live.lastError = message;
        this.emitStatus(sessionId);
      }
    }
  }

  private async serveTargetFor(cwd: string): Promise<ServeTarget> {
    if (this.options.platform !== "win32") {
      return { command: this.options.musePath ?? "muse", args: ["serve"], cwd: cwd || process.cwd() };
    }
    let musePath = this.options.musePath ?? null;
    if (!musePath || (!musePath.includes("/") && !musePath.includes("\\"))) {
      const probe = await this.environment(false);
      musePath = probe.musePath;
    }
    const plan = planServe({
      platform: "win32",
      distro: this.options.distro ?? "Ubuntu",
      musePath,
      cwd: this.spawnCwdFor(cwd),
    });
    return { command: plan.command, args: plan.args, cwd: plan.cwd };
  }

  private forward(hostKey: string, notification: { method: string; params?: unknown; emittedAtMs?: number }): void {
    const params = asRecord(notification.params) ?? {};
    const event = toWireEvent(notification.method, params, notification.emittedAtMs);
    if (!event) {
      return;
    }
    this.sessionHosts.set(event.sessionId, hostKey);
    this.track(event.sessionId, notification.method, params);
    this.emit("helicon", event);
  }

  private track(sessionId: string, method: string, params: Record<string, unknown>): void {
    const live = this.liveFor(sessionId);
    let changed = false;
    switch (method) {
      case "turn/started": {
        live.activeTurnId = str(params["turnId"]);
        live.turnStartedAt = nowIso();
        live.lastError = null;
        changed = true;
        this.wake(sessionId);
        break;
      }
      case "turn/completed": {
        const turnId = str(params["turnId"]);
        if (!live.activeTurnId || live.activeTurnId === turnId) {
          live.activeTurnId = null;
          live.turnStartedAt = null;
        }
        const terminal = str(params["terminal"]) ?? "completed";
        live.lastTerminal = terminal;
        live.lastError = terminal === "failed" ? (str(asRecord(params["error"])?.["message"]) ?? "The turn failed.") : null;
        if (turnId) {
          try {
            this.store.recordTurn(turnId, sessionId);
            this.store.updateTurnStatus(turnId, terminal);
          } catch {
            /* session not tracked locally */
          }
        }
        changed = true;
        this.sessionsChanged();
        break;
      }
      case "approval/requested": {
        const id = str(params["approvalId"]);
        if (id && !live.pendingApprovals.has(id)) {
          live.pendingApprovals.add(id);
          changed = true;
          this.wake(sessionId);
        }
        break;
      }
      case "approval/resolved": {
        const id = str(params["approvalId"]);
        changed = id ? live.pendingApprovals.delete(id) : false;
        break;
      }
      case "userInput/requested": {
        const id = str(params["userInputId"]);
        if (id && !live.pendingInputs.has(id)) {
          live.pendingInputs.add(id);
          changed = true;
          this.wake(sessionId);
        }
        break;
      }
      case "userInput/settled": {
        const id = str(params["userInputId"]);
        changed = id ? live.pendingInputs.delete(id) : false;
        break;
      }
      case "session/closed": {
        changed = live.activeTurnId !== null || live.pendingApprovals.size > 0 || live.pendingInputs.size > 0;
        live.activeTurnId = null;
        live.turnStartedAt = null;
        live.pendingApprovals.clear();
        live.pendingInputs.clear();
        this.sessionHosts.delete(sessionId);
        break;
      }
      case "session/modelChanged": {
        const modelId = str(params["modelId"]);
        if (modelId) {
          this.store.updateSession(sessionId, { modelId });
        }
        break;
      }
      case "session/goalChanged": {
        const goal = goalOf(params["goal"]);
        // A block with no objective is not a goal; the last one stands.
        if (goal !== undefined) {
          live.goal = goal;
          live.goalSeq += 1;
          changed = true;
        }
        break;
      }
      case "item/completed": {
        const item = asRecord(params["item"]);
        if (item && item["kind"] === "userMessage") {
          this.maybeTitle(sessionId, item);
        }
        break;
      }
      default:
        break;
    }
    if (changed) {
      this.emitStatus(sessionId);
    }
  }

  private maybeTitle(sessionId: string, item: Record<string, unknown>): void {
    const record = this.store.getSession(sessionId);
    if (!record || record.titleSource !== "placeholder") {
      return;
    }
    const title = deriveTitle(str(item["displayText"]) ?? str(item["text"]) ?? "");
    if (title) {
      this.store.updateSession(sessionId, { title, titleSource: "auto" });
      this.sessionsChanged();
    }
  }
}

function titleFromEvents(events: { method: string; params: Record<string, unknown> }[]): string | null {
  for (const event of events) {
    const item = asRecord(event.params["item"]);
    if (item && item["kind"] === "userMessage") {
      const title = deriveTitle(str(item["displayText"]) ?? str(item["text"]) ?? "");
      if (title) {
        return title;
      }
    }
  }
  return null;
}

export async function resolveMusePath(
  platform: string,
  distro: string,
): Promise<string | null> {
  if (platform === "win32") {
    const probe = await probeEnvironment(defaultExec, platform);
    void distro;
    return probe.musePath;
  }
  const found = await defaultExec("sh", ["-lc", "command -v muse"]);
  if (found.exitCode !== 0) {
    return null;
  }
  return found.stdout.split("\n").map((l) => l.trim()).find((l) => l.length > 0) ?? null;
}

export { resolveMuseInDistro };
