function usage(): string {
  return [
    "helicon-server: local bridge between the Helicon UI and Muse MSP hosts.",
    "",
    "Options:",
    "  --port <n>        HTTP port (default 3127, 0 picks a free port)",
    "  --host <addr>     bind address (default 127.0.0.1)",
    "  --data-dir <dir>  sqlite directory, or :memory: (default)",
    "  --static <dir>    serve a built frontend from this directory",
    "  --token <value>   require a token for non-loopback access",
    "  --distro <name>   WSL distro for muse on Windows (default Ubuntu)",
    "  --muse <path>     explicit muse binary path",
  ].join("\n");
}

function flagValue(argv: string[], name: string): string | null {
  const index = argv.indexOf(name);
  if (index === -1 || index + 1 >= argv.length) {
    return null;
  }
  return argv[index + 1] as string;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(usage() + "\n");
    return;
  }
  const { HeliconServer } = await import("./server.js");
  const portRaw = flagValue(argv, "--port");
  const server = new HeliconServer({
    port: portRaw ? Number.parseInt(portRaw, 10) : 3127,
    host: flagValue(argv, "--host") ?? "127.0.0.1",
    dataDir: flagValue(argv, "--data-dir") ?? ":memory:",
    staticDir: flagValue(argv, "--static"),
    token: flagValue(argv, "--token"),
    distro: flagValue(argv, "--distro") ?? undefined,
    musePath: flagValue(argv, "--muse") ?? undefined,
  });
  const bound = await server.listen();
  process.stdout.write(`helicon-server listening on http://${bound.host}:${bound.port}\n`);
  const shutdown = () => {
    void server.close().then(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void main().catch((error) => {
  process.stderr.write(`helicon-server failed: ${String(error)}\n`);
  process.exit(1);
});
