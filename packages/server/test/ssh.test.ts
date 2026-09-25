import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { HeliconServer, type HostExit, type HostHandle } from "../src/server.js";
import type { ExecFn, ServeTarget } from "@helicon/daemon";
import {
  SSH_OPTS,
  SshError,
  discoveredProjectRoot,
  isSshCwd,
  listSshDirectory,
  normalizeSshCwd,
  parseSshLs,
  parseSshProject,
  remoteListScript,
  resolveSshPath,
  shellQuote,
  sshArgv,
  stripAnsiCodes,
  sshParent,
  sshServeArgs,
  validateSshHost,
} from "../src/ssh.js";

describe("ssh paths", () => {
  it("validates hostnames without letting options or shell through", () => {
    assert.equal(validateSshHost("devbox.example.com"), "devbox.example.com");
    assert.equal(validateSshHost("deploy@db1"), "deploy@db1");
    assert.equal(validateSshHost("Example.COM"), "example.com");
    assert.equal(validateSshHost("deploy@DB1"), "deploy@db1");
    for (const bad of ["", "  ", "a b", "a;b", "a|b", "a&b", "a$b", "-h", ".h", "h-", "h.", "a..b", "ssh://h/x", "h/x", "-oFoo", "-Elog@h", "-deploy@h", "x".repeat(256)]) {
      assert.equal(validateSshHost(bad), null, bad);
    }
  });

  it("splits ssh://host/path projects", () => {
    assert.deepEqual(parseSshProject("ssh://h/app"), { host: "h", remotePath: "/app" });
    assert.deepEqual(parseSshProject("ssh://deploy@H/"), { host: "deploy@h", remotePath: "/" });
    assert.deepEqual(parseSshProject("ssh://h"), { host: "h", remotePath: "/" });
    assert.equal(parseSshProject("ssh://bad;host/x"), null);
    assert.equal(parseSshProject("/local/path"), null);
    assert.equal(isSshCwd("ssh://h/app"), true);
    assert.equal(isSshCwd("  ssh://h/app "), true);
    assert.equal(isSshCwd("/srv/app"), false);
  });

  it("normalizes stored SSH keys and rejects unexpanded or relative paths", () => {
    assert.equal(normalizeSshCwd("ssh://H/MyApp//"), "ssh://h/MyApp");
    assert.equal(normalizeSshCwd("ssh://h/"), "ssh://h/");
    assert.equal(normalizeSshCwd("ssh://h/a/../b"), "ssh://h/b");
    // `~` forms only resolve with a remote `$HOME` lookup, so they never live in a stored key.
    assert.equal(normalizeSshCwd("ssh://h/~/code"), null);
    assert.equal(normalizeSshCwd("ssh://h/relative"), "ssh://h/relative");
    assert.equal(normalizeSshCwd("ssh://bad;host/x"), null);
    assert.equal(sshParent("ssh://h/a/b"), "ssh://h/a");
    assert.equal(sshParent("ssh://h/a"), "ssh://h/");
    assert.equal(sshParent("ssh://h/"), null);
  });

  it("resolves remote paths against the remote home", () => {
    assert.equal(resolveSshPath("h", "~/code", "/home/dev"), "/home/dev/code");
    assert.equal(resolveSshPath("h", "~", "/home/dev"), "/home/dev");
    assert.equal(resolveSshPath("h", "/~/code", "/home/dev"), "/home/dev/code");
    assert.equal(resolveSshPath("h", "/~", "/home/dev"), "/home/dev");
    assert.equal(resolveSshPath("h", "/srv//app/", null), "/srv/app");
    assert.throws(() => resolveSshPath("h", "relative", null), (e) => e instanceof SshError && e.status === 400);
    assert.throws(() => resolveSshPath("h", "~/x", null), (e) => e instanceof SshError && e.status === 502);
  });

  it("builds strict ssh argv for the agent", () => {
    assert.deepEqual(sshServeArgs("h", "muse", ["serve"]), [...SSH_OPTS, "--", "h", "muse", "serve"]);
    assert.deepEqual(sshServeArgs("deploy@h", "/opt/muse", ["serve", "--disable-sandbox"]), [
      ...SSH_OPTS,
      "--",
      "deploy@h",
      "/opt/muse",
      "serve",
      "--disable-sandbox",
    ]);
    assert.deepEqual(sshArgv("h", "ls"), [...SSH_OPTS, "--", "h", "ls"]);
  });

  it("quotes remote paths for a single remote shell string", () => {
    assert.equal(shellQuote("/srv/app"), "'/srv/app'");
    assert.equal(shellQuote("/srv/o'clock"), "'/srv/o'\\''clock'");
  });

  it("runs the listing under sh, not the remote login shell", () => {
    // fish/csh cannot parse the POSIX script, so it travels as one `sh -c` argument.
    // (Exact nested quoting belongs to shellQuote's own test above.)
    const script = remoteListScript("/srv/o'clock");
    assert.match(script, /^sh -c '/);
    assert.match(script, /'$/);
    assert.match(script, /command ls -1 -p -A -- "\$p"/);
    assert.match(script, /\/srv\/o/);
  });

  it("parses remote listings, keeping folders only", () => {
    assert.deepEqual(parseSshLs("b/\na.txt\nA/\n"), {
      exists: true,
      entries: [{ name: "A" }, { name: "b" }],
    });
    assert.deepEqual(parseSshLs("__helicon_noent__"), { exists: false, entries: [] });
    assert.deepEqual(parseSshLs("__helicon_notdir__"), { exists: false, entries: [] });
    assert.deepEqual(parseSshLs(""), { exists: true, entries: [] });
  });

  it("survives a colorized ls alias from the remote shell's rc files", () => {
    // `command` bypasses aliases and functions, so `alias ls='ls --color=always'`
    // (or an exa wrapper) cannot change the output shape. `-A` keeps hidden folders.
    const script = remoteListScript("/srv/app");
    assert.match(script, /^sh -c '/);
    assert.match(script, /command ls -1 -p -A -- "\$p"/);
    // Belt and braces: color codes from any source still parse.
    assert.equal(stripAnsiCodes("\x1b[01;34mproj/\x1b[0m"), "proj/");
    assert.deepEqual(parseSshLs("\x1b[01;34mproj/\x1b[0m\nnotes.txt\n\x1b[01;34m.hidden/\x1b[0m\n"), {
      exists: true,
      entries: [{ name: ".hidden" }, { name: "proj" }],
    });
  });

  it("re-keys discovered remote roots onto their ssh:// project", () => {
    assert.equal(discoveredProjectRoot("ssh://h/MyApp", "/MyApp"), "ssh://h/MyApp");
    assert.equal(discoveredProjectRoot("ssh://deploy@h/a", "/x"), "ssh://deploy@h/x");
    assert.equal(discoveredProjectRoot("/local", "/MyApp"), "/MyApp");
    assert.equal(discoveredProjectRoot("ssh://h/a", "relative"), "relative");
    assert.equal(discoveredProjectRoot("ssh://h/a", null), "ssh://h/a");
    assert.equal(discoveredProjectRoot(undefined, undefined), "");
  });

  it("lists over ssh and reports an unreachable host", async () => {
    const ok: ExecFn = async () => ({ stdout: "proj/\nnotes.txt\n", exitCode: 0 });
    assert.deepEqual(await listSshDirectory("h", "/srv", ok), { exists: true, entries: [{ name: "proj" }] });
    const down: ExecFn = async () => ({ stdout: "", exitCode: 255 });
    await assert.rejects(() => listSshDirectory("h", "/srv", down), (e) => e instanceof SshError && e.status === 502);
    const missing: ExecFn = async () => ({ stdout: "__helicon_noent__", exitCode: 0 });
    assert.deepEqual(await listSshDirectory("h", "/nope", missing), { exists: false, entries: [] });
  });
});

class FakeConnection {
  calls: { method: string; params: Record<string, unknown> }[] = [];
  replies = new Map<string, unknown>();

  async command(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    this.calls.push({ method, params });
    return this.replies.get(method) ?? { ok: true };
  }

  async request(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    return this.command(method, params);
  }

  onNotification(): void {}
}

interface Probe {
  targets: ServeTarget[];
}

function fakeFactory(connection: FakeConnection, probe?: Probe): (target: ServeTarget) => HostHandle {
  return (target) => {
    probe?.targets.push(target);
    return {
      start: async () => ({ initializeResult: { serverInfo: { name: "muse", version: "1.1.1" } } }),
      connection: connection as never,
      close: async () => ({ code: 0, signal: null }),
      onExit: (_handler: (exit: HostExit) => void) => {},
    };
  };
}

async function request(base: string, path: string, body?: unknown, method = body === undefined ? "GET" : "POST") {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as any };
}

describe("ssh routes", () => {
  it("browses remote folders through the picker endpoint, caching the remote home", async () => {
    const execCalls: { command: string; args: string[] }[] = [];
    const exec: ExecFn = async (command, args) => {
      execCalls.push({ command, args });
      if (args[args.length - 1] === 'printf %s "$HOME"') {
        return { stdout: "/home/dev\n", exitCode: 0 };
      }
      return { stdout: "proj/\nnotes.txt\n", exitCode: 0 };
    };
    const server = new HeliconServer({
      port: 0,
      dataDir: ":memory:",
      platform: "linux",
      musePath: "muse",
      hostFactory: () => {
        throw new Error("no Muse host in this test");
      },
      opener: async () => {},
      exec,
    });
    after(() => server.close());
    const base = `http://127.0.0.1:${(await server.listen()).port}`;

    const first = await request(base, `/api/fs/list?path=${encodeURIComponent("ssh://h/~/")}`);
    assert.equal(first.status, 200);
    assert.equal(first.json.directory, "ssh://h/home/dev");
    assert.equal(first.json.parent, "ssh://h/home");
    assert.equal(first.json.separator, "/");
    assert.equal(first.json.exists, true);
    assert.deepEqual(first.json.entries, [{ name: "proj" }]);

    const second = await request(base, `/api/fs/list?path=${encodeURIComponent("ssh://h/~/")}`);
    assert.equal(second.status, 200);
    assert.equal(
      execCalls.filter((c) => c.args[c.args.length - 1] === 'printf %s "$HOME"').length,
      1,
      "the remote home is cached",
    );

    assert.equal((await request(base, `/api/fs/list?path=${encodeURIComponent("ssh://bad;host/x")}`)).status, 400);
  });

  it("answers 502 when the remote host is unreachable", async () => {
    const server = new HeliconServer({
      port: 0,
      dataDir: ":memory:",
      platform: "linux",
      musePath: "muse",
      hostFactory: () => {
        throw new Error("no Muse host in this test");
      },
      opener: async () => {},
      exec: async () => ({ stdout: "", exitCode: 255 }),
    });
    after(() => server.close());
    const base = `http://127.0.0.1:${(await server.listen()).port}`;
    const res = await request(base, `/api/fs/list?path=${encodeURIComponent("ssh://h/srv")}`);
    assert.equal(res.status, 502);
  });

  it("adds ssh:// projects and starts their threads through ssh", async () => {
    const connection = new FakeConnection();
    connection.replies.set("session/start", { session: { sessionId: "s1" } });
    const probe: Probe = { targets: [] };
    const server = new HeliconServer({
      port: 0,
      dataDir: ":memory:",
      platform: "linux",
      musePath: "muse",
      hostFactory: fakeFactory(connection, probe),
      opener: async () => {},
      exec: async () => ({ stdout: "", exitCode: 127 }),
    });
    after(() => server.close());
    const base = `http://127.0.0.1:${(await server.listen()).port}`;

    const added = await request(base, "/api/projects", { cwd: "ssh://H/MyApp/" });
    assert.equal(added.status, 200);
    assert.equal(added.json.project.cwd, "ssh://h/MyApp");

    const projects = (await (await fetch(`${base}/api/projects`)).json()) as { projects: { cwd: string }[] };
    assert.deepEqual(projects.projects.map((p) => p.cwd), ["ssh://h/MyApp"]);

    const started = await request(base, "/api/sessions", { cwd: "ssh://h/MyApp" });
    assert.equal(started.status, 200);
    assert.equal(started.json.session.sessionId, "s1");
    assert.equal(probe.targets[0]?.command, "ssh");
    assert.deepEqual(probe.targets[0]?.args, [...SSH_OPTS, "--", "h", "muse", "serve"]);
    assert.equal(
      connection.calls.find((c) => c.method === "session/start")?.params["workspaceRoot"],
      "/MyApp",
      "the remote agent gets the remote path",
    );

    const files = await request(base, `/api/files/list?cwd=${encodeURIComponent("ssh://h/MyApp")}&path=`);
    assert.equal(files.status, 400);

    const proxy = await request(base, "/api/sessions/s1/shell-proxy", { command: "ls" });
    assert.equal(proxy.status, 400);
  });

  it("files discovered remote sessions under their ssh:// project", async () => {
    const connection = new FakeConnection();
    connection.replies.set("session/list", {
      sessions: [{ sessionId: "s9", workspaceRoot: "/MyApp", name: "Remote work" }],
      nextCursor: null,
    });
    const server = new HeliconServer({
      port: 0,
      dataDir: ":memory:",
      platform: "linux",
      musePath: "muse",
      hostFactory: fakeFactory(connection),
      opener: async () => {},
      exec: async () => ({ stdout: "", exitCode: 127 }),
    });
    after(() => server.close());
    const base = `http://127.0.0.1:${(await server.listen()).port}`;

    const found = await request(base, "/api/discover", { cwd: "ssh://h/MyApp" });
    assert.equal(found.status, 200);
    assert.equal(found.json.sessions[0]?.cwd, "ssh://h/MyApp");
    const projects = (await (await fetch(`${base}/api/projects`)).json()) as { projects: { cwd: string }[] };
    assert.deepEqual(projects.projects.map((p) => p.cwd), ["ssh://h/MyApp"]);
  });

  it("refuses to create remote folders", async () => {
    const server = new HeliconServer({
      port: 0,
      dataDir: ":memory:",
      platform: "linux",
      musePath: "muse",
      hostFactory: () => {
        throw new Error("no Muse host in this test");
      },
      opener: async () => {},
      exec: async () => ({ stdout: "", exitCode: 127 }),
    });
    after(() => server.close());
    const base = `http://127.0.0.1:${(await server.listen()).port}`;
    assert.equal((await request(base, "/api/projects", { cwd: "ssh://h/fresh", create: true })).status, 400);
  });

  it("runs the remote agent from the remote PATH, not the local muse path", async () => {
    const connection = new FakeConnection();
    connection.replies.set("session/start", { session: { sessionId: "s1" } });
    const probe: Probe = { targets: [] };
    const server = new HeliconServer({
      port: 0,
      dataDir: ":memory:",
      platform: "linux",
      musePath: "/opt/homebrew/bin/muse",
      hostFactory: fakeFactory(connection, probe),
      opener: async () => {},
      exec: async () => ({ stdout: "", exitCode: 127 }),
    });
    after(() => server.close());
    const base = `http://127.0.0.1:${(await server.listen()).port}`;
    assert.equal((await request(base, "/api/sessions", { cwd: "ssh://h/app" })).status, 200);
    assert.equal(probe.targets[0]?.command, "ssh");
    assert.deepEqual(probe.targets[0]?.args, [...SSH_OPTS, "--", "h", "muse", "serve"]);
  });

  it("rejects malformed ssh:// projects", async () => {
    const server = new HeliconServer({
      port: 0,
      dataDir: ":memory:",
      platform: "linux",
      musePath: "muse",
      hostFactory: () => {
        throw new Error("no Muse host in this test");
      },
      opener: async () => {},
      exec: async () => ({ stdout: "", exitCode: 127 }),
    });
    after(() => server.close());
    const base = `http://127.0.0.1:${(await server.listen()).port}`;
    assert.equal((await request(base, "/api/projects", { cwd: "ssh://bad;host/x" })).status, 400);
    assert.equal((await request(base, "/api/sessions", { cwd: "ssh://bad;host/x" })).status, 400);
  });
});
