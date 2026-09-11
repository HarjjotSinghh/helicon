import { spawnMspConnection } from "@muse-code/sdk";
import type { CommandConnection } from "./sessions.js";

export type SpawnMspConnection = typeof spawnMspConnection;
export type MspHandshake = Awaited<ReturnType<SpawnMspConnection>>;
export type MspSession = Awaited<ReturnType<MspHandshake["initialize"]>>;

export interface ServeTarget {
  command: string;
  args: string[];
  cwd: string;
  env?: Record<string, string | undefined>;
}

export interface ServeExit {
  code: number | null;
  signal: string | null;
}

export const HELICON_CLIENT_NAME = "helicon";
export const SDK_TIER_OFF_EXIT_CODE = 5;

export type ServeExitClass = "clean" | "sdk-tier-off" | "signalled" | "error";

export function classifyServeExit(code: number | null): ServeExitClass {
  if (code === 0) {
    return "clean";
  }
  if (code === SDK_TIER_OFF_EXIT_CODE) {
    return "sdk-tier-off";
  }
  if (code === null) {
    return "signalled";
  }
  return "error";
}

export function serveExitMessage(exitClass: ServeExitClass): string {
  switch (exitClass) {
    case "clean":
      return "The Muse host exited cleanly.";
    case "sdk-tier-off":
      return "This Muse build has its experimental SDK tier switched off, so no invocation of that binary will serve. Upgrade the CLI or use a build with MSP serving enabled.";
    case "signalled":
      return "The Muse host was killed by a signal before it reported an exit code.";
    case "error":
      return "The Muse host exited with an error. Check that you are logged in (muse login) and that the workspace is readable.";
  }
}

export class HeliconMspHost {
  private handshake: MspHandshake | null = null;
  private msp: MspSession | null = null;

  constructor(
    private readonly target: ServeTarget,
    private readonly spawnFn: SpawnMspConnection = spawnMspConnection,
    private readonly onStderr: (chunk: string) => void = () => {},
  ) {}

  async start(
    clientVersion: string,
  ): Promise<{ initializeResult: unknown; fingerprintWarning: unknown }> {
    const onStderr = this.onStderr;
    this.handshake = this.spawnFn({
      command: this.target.command,
      args: this.target.args,
      cwd: this.target.cwd,
      env: this.target.env,
      onStderr: (chunk: unknown) => onStderr(String(chunk)),
    } as Parameters<SpawnMspConnection>[0]);
    this.msp = await this.handshake.initialize({
      clientInfo: { name: HELICON_CLIENT_NAME, version: clientVersion },
    });
    return {
      initializeResult: this.msp.initializeResult,
      fingerprintWarning: this.msp.fingerprintWarning ?? null,
    };
  }

  get connection(): CommandConnection {
    if (!this.msp) {
      throw new Error("HeliconMspHost: call start() before using the connection.");
    }
    return this.msp.connection as unknown as CommandConnection;
  }

  async close(): Promise<ServeExit> {
    if (!this.msp) {
      throw new Error("HeliconMspHost: call start() before close().");
    }
    const exit = await this.msp.close();
    return { code: exit.code, signal: exit.signal };
  }
}
