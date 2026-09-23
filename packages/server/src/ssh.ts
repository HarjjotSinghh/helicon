import { posix } from "node:path";
import type { ExecFn } from "@helicon/daemon";
import type { DirectoryListing } from "./paths.js";

/**
 * SSH projects: `ssh://host/absolute/path`. The host reaches Muse on a remote
 * machine over a passwordless `ssh` connection, and MSP speaks over that
 * connection's stdio exactly as it does over a local `muse serve` pipe.
 */

/** An SSH failure carrying the HTTP status the route should answer with. */
export class SshError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Keeps SSH non-interactive: never prompt, stay quiet, fail fast. */
export const SSH_OPTS = ["-o", "BatchMode=yes", "-o", "LogLevel=ERROR", "-o", "ConnectTimeout=10"];

/** How long a remote `$HOME` answer is trusted. */
export const SSH_HOME_CACHE_MS = 60_000;

/** `ssh://host/absolute/path`. `remotePath` is absolute and never uses `~`. */
export interface SshProject {
  host: string;
  remotePath: string;
}

const HOST_PATTERN = /^(?:([A-Za-z0-9_.-]+)@)?([A-Za-z0-9_.-]+)$/;

/**
 * A validated SSH host (`hostname` or `user@hostname`) with its host part
 * lowercased, or null. Mirrors `parseSshHost` in the UI picker's paths module;
 * keep the two in sync. Strict argv plus this charset is what stops a typed
 * hostname from becoming an ssh option or a shell escape.
 */
export function validateSshHost(input: string): string | null {
  const value = input.trim();
  if (!value || value.length > 255) {
    return null;
  }
  const match = HOST_PATTERN.exec(value);
  if (!match) {
    return null;
  }
  const host = (match[2] as string).toLowerCase();
  if (/^[.-]|[.-]$/.test(host) || host.includes("..")) {
    return null;
  }
  return match[1] ? `${match[1]}@${host}` : host;
}

/** Whether a path names a folder on an SSH host. */
export function isSshCwd(value: string): boolean {
  return value.trim().startsWith("ssh://");
}

/** Splits `ssh://host/path`; the path may still be `~`-relative or relative. Null when malformed. */
export function parseSshProject(value: string): SshProject | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith("ssh://")) {
    return null;
  }
  const rest = trimmed.slice("ssh://".length);
  const slash = rest.indexOf("/");
  const host = validateSshHost(slash < 0 ? rest : rest.slice(0, slash));
  if (!host) {
    return null;
  }
  return { host, remotePath: slash < 0 ? "/" : rest.slice(slash) };
}

/**
 * The stored form of an SSH project: lowercased host, absolute normalized
 * path, no trailing slash except the root. `~` is rejected here: it is
 * expanded to an absolute path at creation time, so stored keys never depend
 * on a remote `$HOME` lookup. Null when malformed.
 */
export function normalizeSshCwd(value: string): string | null {
  const parsed = parseSshProject(value);
  if (!parsed) {
    return null;
  }
  const raw = parsed.remotePath;
  // `~` forms need a remote `$HOME` lookup, so they only resolve at creation and listing time, never in a stored key.
  if (needsSshHome(raw) || !raw.startsWith("/")) {
    return null;
  }
  const normal = posix.normalize(raw);
  if (!normal.startsWith("/")) {
    return null;
  }
  return `ssh://${parsed.host}${normal === "/" ? "/" : normal.replace(/\/+$/, "")}`;
}

/** The parent of a normalized SSH path, or null at the host root. Null when malformed. */
export function sshParent(normalized: string): string | null {
  const parsed = parseSshProject(normalized);
  if (!parsed || parsed.remotePath === "/") {
    return null;
  }
  const dir = posix.dirname(parsed.remotePath);
  return `ssh://${parsed.host}${dir === "/" ? "/" : dir}`;
}

/** Whether a remote path needs the remote home to resolve: `~`, `~/x`, `/~` or `/~/x`. */
export function needsSshHome(remotePath: string): boolean {
  return /^\/?~(?=\/|$)/.test(remotePath);
}

/**
 * Resolves a remote path the user typed against the remote home: `~` forms
 * expand with the given home, absolute paths normalize. Throws SshError.
 */
export function resolveSshPath(host: string, input: string, home: string | null): string {
  if (needsSshHome(input)) {
    if (!home || !home.startsWith("/")) {
      throw new SshError(502, `Could not read the home folder on "${host}" over SSH.`);
    }
    const rest = input.replace(/^\/?~/, "");
    const joined = rest ? posix.join(home, rest) : home;
    return joined.length > 1 ? joined.replace(/\/+$/, "") : joined;
  }
  if (!input.startsWith("/")) {
    throw new SshError(400, "SSH folders look like ssh://host/absolute/path.");
  }
  const normal = posix.normalize(input);
  if (!normal.startsWith("/")) {
    throw new SshError(400, "SSH folders look like ssh://host/absolute/path.");
  }
  return normal.length > 1 ? normal.replace(/\/+$/, "") : normal;
}

/** `ssh` argv for running one remote command, as a single shell string. No shell quoting happens locally. */
export function sshArgv(host: string, remoteCommand: string): string[] {
  return [...SSH_OPTS, host, remoteCommand];
}

/** `ssh` argv whose remote end is the agent: `ssh [opts] host muse serve ...`. */
export function sshServeArgs(host: string, musePath: string, serveArgs: string[]): string[] {
  return [...SSH_OPTS, host, musePath, ...serveArgs];
}

/** Single-quotes a value for a remote POSIX shell. */
export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

const NOENT = "__helicon_noent__";
const NOTDIR = "__helicon_notdir__";

/**
 * One remote command listing a folder's subfolders, reporting missing ones with a sentinel.
 * `command` bypasses aliases and shell functions, so an `ls` alias from a remote rc file
 * (colorize flags, exa wrappers) cannot change the output shape. `-A` keeps hidden folders,
 * matching the local picker's `readdir` behavior.
 */
export function remoteListScript(absPath: string): string {
  const quoted = shellQuote(absPath);
  return `p=${quoted}; if [ -d "$p" ]; then command ls -1 -p -A -- "$p" 2>/dev/null || true; elif [ -e "$p" ]; then printf '%s' ${NOTDIR}; else printf '%s' ${NOENT}; fi`;
}

/** Strips ANSI color sequences, so a colorized `ls` from any source still parses. */
export function stripAnsiCodes(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/\x1b\[[0-9;]*m/g, "");
}

/** Parses the listing script's stdout: sentinels mean missing, otherwise `/`-suffixed lines are folders. */
export function parseSshLs(stdout: string): { exists: boolean; entries: { name: string }[] } {
  const text = stripAnsiCodes(stdout).replace(/\r\n/g, "\n").trim();
  if (text === NOENT || text === NOTDIR) {
    return { exists: false, entries: [] };
  }
  if (!text) {
    // An unreadable folder lists as empty, matching the local picker's EACCES behavior.
    return { exists: true, entries: [] };
  }
  const entries: { name: string }[] = [];
  for (const line of text.split("\n")) {
    if (!line.endsWith("/")) {
      continue;
    }
    const name = line.slice(0, -1);
    if (!name || name === "." || name === "..") {
      continue;
    }
    entries.push({ name });
  }
  entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true }));
  return { exists: true, entries };
}

/**
 * Lists a remote folder's subfolders over SSH. Throws SshError: 502 when the
 * host is unreachable, with the sentinel parse deciding missing vs. present.
 */
export async function listSshDirectory(host: string, absPath: string, exec: ExecFn): Promise<{ exists: boolean; entries: { name: string }[] }> {
  const result = await exec("ssh", sshArgv(host, remoteListScript(absPath)));
  if (!result.stdout.trim()) {
    if (result.exitCode !== 0) {
      throw new SshError(
        502,
        `Could not list folders on "${host}" (ssh exited with code ${result.exitCode}). Check that \`ssh ${host}\` works without a password.`,
      );
    }
    return { exists: true, entries: [] };
  }
  return parseSshLs(result.stdout);
}

/** The full picker listing for a normalized `ssh://host/abs/path` directory. */
export function sshDirectoryListing(host: string, absPath: string, listed: { exists: boolean; entries: { name: string }[] }): DirectoryListing {
  return {
    directory: `ssh://${host}${absPath}`,
    parent: absPath === "/" ? null : `ssh://${host}${posix.dirname(absPath) === "/" ? "/" : posix.dirname(absPath)}`,
    separator: "/",
    exists: listed.exists,
    entries: listed.entries,
  };
}
