/**
 * The strip above the hosted demo at helicon.sh/try: says plainly that this is sample data, and gives the
 * two ways to get the real thing. Demo builds only; release builds never import it.
 */
const DOWNLOAD = "https://helicon.sh/?utm_source=try&utm_medium=demo&utm_campaign=try#install";
const EXTENSION = "https://marketplace.visualstudio.com/items?itemName=harjjotsinghh.helicon";

export function TryBanner() {
  return (
    <div
      role="region"
      aria-label="About this demo"
      className="flex h-10 shrink-0 items-center gap-3 border-b border-line bg-sidebar px-3 text-sm text-muted"
    >
      <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
      <p className="min-w-0 flex-1 truncate">
        <span className="font-medium text-fg sm:hidden">Demo, sample data</span>
        <span className="hidden font-medium text-fg sm:inline">You're trying Helicon on sample data.</span>
        <span className="hidden md:inline"> Click around, open a thread, send a prompt. Nothing runs on your machine.</span>
      </p>
      <a
        href={EXTENSION}
        target="_blank"
        rel="noopener"
        className="hidden shrink-0 rounded-md px-2.5 py-1 text-xs font-medium text-muted transition-colors duration-150 hover:bg-hover hover:text-fg sm:inline-block"
      >
        Get the VS Code extension
      </a>
      <a
        href={DOWNLOAD}
        className="shrink-0 rounded-md bg-accent px-3 py-1 text-xs font-semibold text-accent-fg transition-colors duration-150 hover:bg-accent-hover"
      >
        Download Helicon, free
      </a>
    </div>
  );
}
