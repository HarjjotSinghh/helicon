import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import {
  HeliconMspHost,
  HeliconStore,
  SessionManager,
  isApprovalMode,
  planServe,
  probeEnvironment,
  resolveMuseInDistro,
  defaultExec,
  toWslPath,
  toWindowsPath,
  type ApprovalMode,
  type CommandConnection,
  type ServeTarget,
} from "@helicon/daemon";

export const HELICON_VERSION = "0.1.0";

export interface HostHandle {
  start(version: string): Promise<unknown>;
  connection: CommandConnection;
  close(): Promise<unknown>;
}

export type HostFactory = (target: ServeTarget) => HostHandle;

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
}

interface ManagedHost {
  target: ServeTarget;
  handle: HostHandle;
  manager: SessionManager;
  started: boolean;
}

type SseSink = (event: string, data: unknown) => void;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }
  return null;
}

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
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

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".map": "application/json; charset=utf-8",
};

export class HeliconServer {
  private readonly server: Server;
  private readonly store: HeliconStore;
  private readonly hosts = new Map<string, ManagedHost>();
  private readonly fingerprints = new Map<string, unknown>();
  private readonly sinks = new Set<SseSink>();
  private readonly options: Required<
    Omit<ServerOptions, "staticDir" | "token" | "platform" | "distro" | "musePath" | "hostFactory">
  > &
    Pick<ServerOptions, "staticDir" | "token"> & {
      platform: string;
      distro?: string;
      musePath?: string | null;
      hostFactory: HostFactory;
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
    };
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
    return { port, host: this.options.host };
  }

  async close(): Promise<void> {
    for (const sink of [...this.sinks]) {
      this.sinks.delete(sink);
    }
    for (const managed of this.hosts.values()) {
      try {
        await managed.handle.close();
      } catch {
        /* best effort */
      }
    }
    this.hosts.clear();
    await new Promise<void>((resolve, reject) =>
      this.server.close((error) => (error ? reject(error) : resolve())),
    );
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
    res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
    res.end(text);
  }

  private fail(res: ServerResponse, status: number, message: string): void {
    if (!res.headersSent) {
      this.json(res, status, { error: message });
    } else {
      res.end();
    }
  }

  private async readBody(req: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    const text = Buffer.concat(chunks).toString("utf8").trim();
    if (!text) {
      return {};
    }
    return JSON.parse(text) as unknown;
  }

  private async route(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", "http://localhost");
    const path = url.pathname;
    if (!this.authorized(req)) {
      this.fail(res, 401, "Missing or invalid token.");
      return;
    }
    const method = (req.method ?? "GET").toUpperCase();

    if (method === "GET" && path === "/api/health") {
      this.json(res, 200, {
        ok: true,
        version: HELICON_VERSION,
        fingerprintWarnings: Object.fromEntries(this.fingerprints),
      });
      return;
    }
    if (method === "GET" && path === "/api/env") {
      const probe = await probeEnvironment(defaultExec, this.options.platform);
      this.json(res, 200, {
        platform: probe.platform,
        wslAvailable: probe.wslAvailable,
        defaultDistro: probe.defaultDistro,
        museFound: probe.musePath !== null,
        musePath: probe.musePath,
      });
      return;
    }
    if (method === "GET" && path === "/api/events") {
      this.serveEvents(res);
      return;
    }
    if (method === "GET" && path === "/api/projects") {
      this.json(res, 200, { projects: this.store.listProjects() });
      return;
    }
    if (method === "PATCH" && path === "/api/projects/pin") {
      const body = asRecord(await this.readBody(req));
      const cwd = body ? str(body["cwd"]) : null;
      if (!cwd) {
        this.fail(res, 400, "cwd is required.");
        return;
      }
      this.store.upsertProject(cwd);
      this.store.setPinned(cwd, body?.["pinned"] === true);
      this.json(res, 200, { ok: true });
      return;
    }
    if (method === "GET" && path === "/api/sessions") {
      const cwd = url.searchParams.get("cwd");
      if (cwd) {
        const project = this.store.upsertProject(cwd);
        this.json(res, 200, { sessions: this.store.listSessionsByProject(project.id) });
      } else {
        const all = this.store.listProjects().flatMap((p) => this.store.listSessionsByProject(p.id));
        this.json(res, 200, { sessions: all });
      }
      return;
    }
    if (method === "POST" && path === "/api/discover") {
      const body = asRecord(await this.readBody(req));
      const cwd = body ? str(body["cwd"]) ?? undefined : undefined;
      const found = await this.discover(cwd);
      this.json(res, 200, { sessions: found });
      return;
    }
    if (method === "POST" && path === "/api/sessions") {
      const body = asRecord(await this.readBody(req)) ?? {};
      const cwd = str(body["cwd"]);
      if (!cwd) {
        this.fail(res, 400, "cwd is required.");
        return;
      }
      const mode = body["approvalMode"];
      if (mode !== undefined && !isApprovalMode(mode)) {
        this.fail(res, 400, "Unknown approvalMode.");
        return;
      }
      const project = this.store.upsertProject(cwd);
      const manager = await this.managerFor(cwd);
      const started = await manager.startSession({
        workspaceRoot: this.hostPathFor(cwd),
        approvalMode: mode === undefined ? undefined : (mode as ApprovalMode),
        modelId: str(body["modelId"]) ?? undefined,
      });
      const sessionId = started.sessionId;
      const known = this.knownSessionIds();
      const record = this.store.recordSession({
        id: sessionId,
        projectId: project.id,
        origin: known.has(sessionId) ? "tui" : "helicon",
      });
      this.json(res, 200, { session: this.toSessionView(record, cwd) });
      return;
    }

    const sessionMatch = path.match(/^\/api\/sessions\/([^/]+)\/(resume|read|model|approval-mode)$/);
    if (method === "POST" && sessionMatch) {
      const sessionId = decodeURIComponent(sessionMatch[1] as string);
      const action = sessionMatch[2] as string;
      const body = asRecord(await this.readBody(req)) ?? {};
      const stored = this.findSession(sessionId);
      const manager = await this.managerFor(stored?.cwd ?? "");
      if (action === "resume") {
        const resumed = await manager.resumeSession(sessionId, body["excludeItems"] === true);
        this.json(res, 200, { resumed });
        return;
      }
      if (action === "read") {
        this.json(res, 200, { session: await manager.readSession(sessionId) });
        return;
      }
      if (action === "model") {
        if (!("model" in body)) {
          this.fail(res, 400, "model is required.");
          return;
        }
        await manager.setSessionModel(sessionId, body["model"]);
        this.json(res, 200, { ok: true });
        return;
      }
      const mode = body["mode"];
      if (!isApprovalMode(mode)) {
        this.fail(res, 400, "Unknown mode.");
        return;
      }
      await manager.setSessionApprovalMode(sessionId, mode);
      this.json(res, 200, { ok: true });
      return;
    }

    if (method === "POST" && path === "/api/turns") {
      const body = asRecord(await this.readBody(req)) ?? {};
      const sessionId = str(body["sessionId"]);
      const text = str(body["text"]);
      if (!sessionId || !text) {
        this.fail(res, 400, "sessionId and text are required.");
        return;
      }
      const manager = await this.managerFor(this.findSession(sessionId)?.cwd ?? "");
      const ack = await manager.sendTurn(sessionId, text, {
        displayText: str(body["displayText"]) ?? undefined,
        ifBusy: str(body["ifBusy"]) ?? undefined,
        reasoningEffort: str(body["reasoningEffort"]) ?? undefined,
      });
      if (ack.turnId) {
        this.safeRecordTurn(sessionId, ack.turnId);
      }
      this.json(res, 200, { turnId: ack.turnId, status: ack.status, disposition: ack.disposition });
      return;
    }

    const turnMatch = path.match(/^\/api\/turns\/(steer|interrupt|cancel|unqueue)$/);
    if (method === "POST" && turnMatch) {
      const action = turnMatch[1] as string;
      const body = asRecord(await this.readBody(req)) ?? {};
      const sessionId = str(body["sessionId"]);
      const turnId = str(body["turnId"]);
      if (!sessionId) {
        this.fail(res, 400, "sessionId is required.");
        return;
      }
      const manager = await this.managerFor(this.findSession(sessionId)?.cwd ?? "");
      if (action === "steer") {
        const text = str(body["text"]);
        if (!turnId || !text) {
          this.fail(res, 400, "turnId and text are required to steer.");
          return;
        }
        await manager.steerTurn(sessionId, turnId, text);
      } else if (action === "interrupt") {
        await manager.interruptTurn(sessionId, turnId ?? undefined, body["retract"] === true);
      } else if (action === "cancel") {
        if (!turnId) {
          this.fail(res, 400, "turnId is required.");
          return;
        }
        await manager.cancelTurn(sessionId, turnId);
      } else {
        if (!turnId) {
          this.fail(res, 400, "turnId is required.");
          return;
        }
        await manager.unqueueTurn(sessionId, turnId);
      }
      this.json(res, 200, { ok: true });
      return;
    }

    if (method === "POST" && path === "/api/approvals/decide") {
      const body = asRecord(await this.readBody(req)) ?? {};
      const sessionId = str(body["sessionId"]);
      const approvalId = str(body["approvalId"]);
      const choiceId = str(body["choiceId"]);
      if (!sessionId || !approvalId || !choiceId || !("requirementId" in body)) {
        this.fail(res, 400, "sessionId, approvalId, requirementId and choiceId are required.");
        return;
      }
      const manager = await this.managerFor(this.findSession(sessionId)?.cwd ?? "");
      await manager.decideApproval({
        sessionId,
        approvalId,
        requirementId: body["requirementId"],
        choiceId,
        feedback: str(body["feedback"]),
      });
      this.json(res, 200, { ok: true });
      return;
    }

    if (method === "GET" && path === "/api/models") {
      const sessionId = url.searchParams.get("sessionId") ?? undefined;
      const manager = await this.managerFor(
        (sessionId ? this.findSession(sessionId)?.cwd : undefined) ?? "",
      );
      this.json(res, 200, { models: await manager.listModels(sessionId) });
      return;
    }

    if (method === "POST" && path === "/api/user-input/answer") {
      const body = asRecord(await this.readBody(req)) ?? {};
      const sessionId = str(body["sessionId"]);
      const userInputId = str(body["userInputId"]);
      const answers = body["answers"];
      if (!sessionId || !userInputId || !Array.isArray(answers)) {
        this.fail(res, 400, "sessionId, userInputId and answers are required.");
        return;
      }
      const manager = await this.managerFor(this.findSession(sessionId)?.cwd ?? "");
      await manager.answerUserInput(sessionId, userInputId, answers as never);
      this.json(res, 200, { ok: true });
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
      res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
      res.end(body);
      return true;
    } catch {
      return false;
    }
  }

  private knownSessionIds(): Set<string> {
    const ids = new Set<string>();
    for (const project of this.store.listProjects()) {
      for (const session of this.store.listSessionsByProject(project.id)) {
        ids.add(session.id);
      }
    }
    return ids;
  }

  private findSession(sessionId: string): { cwd: string } | null {
    for (const project of this.store.listProjects()) {
      const match = this.store.listSessionsByProject(project.id).find((s) => s.id === sessionId);
      if (match) {
        return { cwd: project.cwd };
      }
    }
    return null;
  }

  private safeRecordTurn(sessionId: string, turnId: string): void {
    try {
      this.store.recordTurn(turnId, sessionId);
    } catch {
      /* session not tracked locally; turns still flow over MSP */
    }
  }

  private toSessionView(
    record: { id: string; title: string; status: string; turnCount: number; modelId: string | null; origin: string },
    cwd: string,
  ): Record<string, unknown> {
    return {
      sessionId: record.id,
      cwd,
      title: record.title,
      status: record.status,
      turnCount: record.turnCount,
      modelId: record.modelId,
      origin: record.origin,
    };
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

  private async discover(cwd?: string): Promise<Record<string, unknown>[]> {
    const manager = await this.managerFor(cwd ?? "");
    const remote = await manager.listSessions(cwd ? this.hostPathFor(cwd) : undefined);
    const known = this.knownSessionIds();
    const views: Record<string, unknown>[] = [];
    for (const item of remote) {
      const record = asRecord(item);
      const session = record && asRecord(record["session"]);
      const sessionId = (session && str(session["sessionId"])) || (record && str(record["sessionId"]));
      if (!sessionId) {
        continue;
      }
      const root = this.storePathFor(
        (session && str(session["workspaceRoot"])) || (record && str(record["workspaceRoot"])) || cwd || "",
      );
      if (!root) {
        continue;
      }
      const project = this.store.upsertProject(root);
      const title =
        (session && firstString(session, ["title", "name"])) ||
        (record && firstString(record, ["title", "name"])) ||
        "Session";
      const stored = this.store.recordSession({
        id: sessionId,
        projectId: project.id,
        title: known.has(sessionId) ? this.store.listSessionsByProject(project.id).find((s) => s.id === sessionId)?.title ?? title : title,
        origin: known.has(sessionId) ? "helicon" : "tui",
      });
      views.push(this.toSessionView(stored, root));
      known.add(sessionId);
    }
    this.emit("sessions-changed", { cwd: cwd ?? null });
    return views;
  }

  private async managerFor(cwd: string): Promise<SessionManager> {
    const key = this.hostPathFor(cwd) || "__default__";
    const existing = this.hosts.get(key);
    if (existing) {
      return existing.manager;
    }
    const target = await this.serveTargetFor(cwd);
    const handle = this.options.hostFactory(target);
    const started = (await handle.start(HELICON_VERSION)) as {
      fingerprintWarning?: unknown;
    } | null;
    this.fingerprints.set(key, started?.fingerprintWarning ?? null);
    const manager = new SessionManager(handle.connection);
    manager.onNotification((notification) => this.forward(notification));
    this.hosts.set(key, { target, handle, manager, started: true });
    return manager;
  }

  private async serveTargetFor(cwd: string): Promise<ServeTarget> {
    if (this.options.platform !== "win32") {
      return { command: this.options.musePath ?? "muse", args: ["serve"], cwd: cwd || process.cwd() };
    }
    let musePath = this.options.musePath ?? null;
    if (!musePath) {
      const probe = await probeEnvironment(defaultExec, "win32");
      musePath = probe.musePath;
    } else if (!musePath.includes("/") && !musePath.includes("\\")) {
      const probe = await probeEnvironment(defaultExec, "win32");
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

  private forward(notification: { method: string; params?: unknown }): void {
    const params = asRecord(notification.params) ?? {};
    const sessionId = str(params["sessionId"]);
    switch (notification.method) {
      case "item/delta": {
        const itemId = str(params["itemId"]) ?? "";
        const text = str(params["text"]) ?? str(params["delta"]) ?? "";
        this.emit("helicon", {
          type: "delta",
          sessionId,
          itemId,
          kind: str(params["kind"]) ?? "message",
          text,
        });
        break;
      }
      case "item/started": {
        this.emit("helicon", {
          type: "delta",
          sessionId,
          itemId: str(params["itemId"]) ?? "",
          kind: str(params["kind"]) ?? "message",
          text: "",
        });
        break;
      }
      case "item/completed": {
        this.emit("helicon", {
          type: "item-final",
          sessionId,
          itemId: str(params["itemId"]) ?? "",
          kind: str(params["kind"]) ?? "message",
          text: str(params["text"]) ?? "",
        });
        break;
      }
      case "turn/completed": {
        this.emit("helicon", {
          type: "turn-terminal",
          sessionId,
          turnId: str(params["turnId"]) ?? "",
          terminal: str(params["terminal"]) ?? "completed",
        });
        break;
      }
      case "approval/requested": {
        const view = this.toApprovalView(sessionId ?? "", params);
        if (view) {
          this.emit("helicon", { type: "approval", approval: view });
        }
        break;
      }
      case "approval/resolved": {
        const approvalId = str(params["approvalId"]);
        if (approvalId) {
          this.emit("helicon", { type: "approval-resolved", approvalId });
        }
        break;
      }
      case "userInput/requested": {
        const view = this.toUserInputView(sessionId ?? "", params);
        if (view) {
          this.emit("helicon", { type: "user-input", prompt: view });
        }
        break;
      }
      default:
        break;
    }
  }

  private toApprovalView(
    sessionId: string,
    params: Record<string, unknown>,
  ): Record<string, unknown> | null {
    const approvalId = str(params["approvalId"]);
    if (!approvalId) {
      return null;
    }
    const rawChoices = Array.isArray(params["availableChoices"]) ? params["availableChoices"] : [];
    const choices = rawChoices.map((choice, index) => {
      const record = asRecord(choice) ?? {};
      const choiceId = str(record["choiceId"]) ?? str(record["id"]) ?? `choice-${index}`;
      return {
        choiceId,
        label: firstString(record, ["label", "title", "name"]) ?? choiceId,
        acceptsFeedback: record["acceptsFeedback"] === true,
      };
    });
    return {
      approvalId,
      sessionId,
      requirementId: params["currentRequirementId"] ?? params["requirementId"] ?? null,
      subject:
        firstString(params, ["subject", "title", "summary", "description"]) ??
        `Approval ${approvalId}`,
      choices,
    };
  }

  private toUserInputView(
    sessionId: string,
    params: Record<string, unknown>,
  ): Record<string, unknown> | null {
    const userInputId = str(params["userInputId"]) ?? str(params["id"]);
    if (!userInputId) {
      return null;
    }
    const rawQuestions = Array.isArray(params["questions"]) ? params["questions"] : [];
    const questions = rawQuestions.map((question) => {
      const record = asRecord(question) ?? {};
      const options = Array.isArray(record["options"])
        ? record["options"].map((o) => {
            const option = asRecord(o);
            return str(option?.["label"] ?? o) ?? "";
          })
        : [];
      return {
        questionId: str(record["questionId"]) ?? "",
        prompt: firstString(record, ["prompt", "question", "text"]) ?? "",
        mode: str(record["mode"]) ?? "freeText",
        options,
      };
    });
    return { userInputId, sessionId, questions };
  }
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
