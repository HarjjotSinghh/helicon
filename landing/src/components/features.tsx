import {
  AppWindow,
  ArrowsClockwise,
  Browsers,
  ChartBar,
  Command,
  FileTs,
  FolderSimple,
  GitDiff,
  Globe,
  LockSimple,
  MagnifyingGlass,
  NotePencil,
  ShieldCheck,
  SidebarSimple,
  SquaresFour,
  Sun,
  TerminalWindow,
} from "@phosphor-icons/react/ssr";
import type { ComponentProps, ReactNode } from "react";
import { highlight } from "sugar-high";
import { DemoApp } from "@/demo/demo-app";
import { ApprovalDemo } from "./approval-demo";
import { CellGrid, Rule, SectionHeading, bandX, cn } from "./ui";

function Cell({
  icon,
  title,
  body,
  className,
  children,
  order = 0,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  className?: string;
  children?: ReactNode;
  /** Position in the grid, so neighbouring cells cascade instead of arriving together. */
  order?: number;
}) {
  return (
    <article
      data-stagger="60"
      data-base={order * 70}
      className={cn(
        "group relative flex flex-col bg-bg p-6 sm:p-8",
        className,
      )}
    >
      <div data-reveal className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="inline-flex size-9 items-center justify-center rounded-[10px] bg-tint text-accent-text transition-transform duration-300 ease-[var(--reveal-ease)] [@media(hover:hover)]:group-hover:-rotate-6 [@media(hover:hover)]:group-hover:scale-110 [&_svg]:size-[18px]"
        >
          {icon}
        </span>
        <h3 className="font-headline text-[20px] leading-tight font-semibold text-fg">{title}</h3>
      </div>
      <p data-reveal className="mt-3 max-w-[48ch] text-[15px] leading-relaxed text-muted">
        {body}
      </p>
      {children}
    </article>
  );
}

/** A panel drawn with the product's own surfaces, for the small previews inside cards. */
function Panel({ className, children, ...rest }: ComponentProps<"div">) {
  return (
    <div className={cn("overflow-hidden rounded-xl bg-bg shadow-[0_0_0_1px_var(--border)] dark:bg-sunken", className)} {...rest}>
      {children}
    </div>
  );
}

type DiffLine = { kind: "ctx" | "add" | "del"; old?: number; new?: number; text: string };

const DIFF: DiffLine[] = [
  { kind: "ctx", old: 10, new: 10, text: 'import { spawnServe } from "./serve";' },
  { kind: "ctx", old: 11, new: 11, text: "export async function openWorkspace(cwd: string) {" },
  { kind: "del", old: 12, text: '  const pty = spawn("muse", ["--tui"], { cwd });' },
  { kind: "del", old: 13, text: "  const host = scrapeTerminal(pty);" },
  { kind: "del", old: 14, text: '  host.on("data", parseAnsi);' },
  { kind: "add", new: 12, text: "  const host = await spawnServe(cwd);" },
  { kind: "add", new: 13, text: "  const session = await host.connect({" },
  { kind: "add", new: 14, text: '    protocol: "msp",' },
  { kind: "add", new: 15, text: '    approvals: "onRequest",' },
  { kind: "add", new: 16, text: "  });" },
  { kind: "add", new: 17, text: '  session.on("item/completed", render);' },
  { kind: "ctx", old: 15, new: 18, text: "  return host;" },
  { kind: "ctx", old: 16, new: 19, text: "}" },
  { kind: "ctx", old: 17, new: 20, text: "" },
  { kind: "ctx", old: 18, new: 21, text: "export function closeWorkspace(host: Host) {" },
  { kind: "ctx", old: 19, new: 22, text: "  host.dispose();" },
  { kind: "ctx", old: 20, new: 23, text: "}" },
];

function DiffPreview() {
  return (
    <Panel data-reveal="scale" className="mt-7 flex h-[450px] flex-col font-mono text-[12px] leading-[22px]">
      <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-3 py-2 font-sans text-[12.5px]">
        <FileTs aria-hidden="true" weight="duotone" className="size-4 text-accent-text" />
        <span className="font-medium text-fg">src/daemon/host.ts</span>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[11.5px] tabular-nums">
          <span className="text-add-fg">+6</span>
          <span className="text-del-fg">-3</span>
        </span>
        <span className="rounded-md bg-tint px-1.5 py-0.5 text-[11px] font-medium text-accent-text">Edited</span>
      </div>
      <div className="border-b border-line bg-tint/50 px-3 text-pretty text-subtle">@@ -10,11 +10,14 @@ openWorkspace</div>
      <div
        data-stagger="30"
        data-base="230"
        className="flex-1 overflow-x-hidden overflow-y-auto py-1"
        role="img"
        aria-label="Diff of src/daemon/host.ts: three lines removed, six added"
      >
        {DIFF.map((l, i) => (
          <div
            key={i}
            aria-hidden="true"
            data-reveal="slide"
            className={cn(
              "grid grid-cols-[2rem_2rem_1rem_minmax(0,1fr)] pr-2 sm:pr-4",
              l.kind === "add" && "bg-add-bg",
              l.kind === "del" && "bg-del-bg",
            )}
          >
            <span className="pr-2 text-right text-subtle/70 tabular-nums">{l.old ?? ""}</span>
            <span className="pr-2 text-right text-subtle/70 tabular-nums">{l.new ?? ""}</span>
            <span className={cn(l.kind === "add" ? "text-add-fg" : l.kind === "del" ? "text-del-fg" : "text-subtle")}>
              {l.kind === "add" ? "+" : l.kind === "del" ? "-" : ""}
            </span>
            {/* Same highlighter and --sh-* token colors as the app's own diffs, so it follows the theme. */}
            <span className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]" dangerouslySetInnerHTML={{ __html: highlight(l.text) || " " }} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

// Thirty days of sample spend, split by model: [contributor tier, standard].
const DAYS: [number, number][] = [
  [8, 0], [12, 4], [5, 0], [3, 0], [14, 9], [18, 11], [16, 6], [20, 14], [9, 0], [4, 0],
  [15, 8], [22, 17], [19, 12], [24, 15], [11, 3], [6, 0], [17, 10], [21, 13], [26, 20], [23, 16],
  [10, 2], [5, 0], [18, 12], [25, 19], [28, 22], [20, 14], [13, 5], [7, 0], [22, 15], [27, 21],
];

function CostPreview() {
  const peak = Math.max(...DAYS.map(([a, b]) => a + b));
  return (
    <Panel data-reveal="scale" className="flex flex-1 flex-col p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[12px] text-subtle">Cost at API rates, 30 days</p>
          <p className="mt-0.5 font-headline text-[26px] leading-none font-semibold text-fg tabular-nums">$5.29</p>
        </div>
        <p className="rounded-md bg-add-bg px-1.5 py-0.5 text-[11.5px] font-medium text-add-fg tabular-nums">$5.51 saved by cache</p>
      </div>
      <div
        data-stagger="20"
        data-base="195"
        className="mt-4 flex min-h-20 flex-1 items-end gap-[3px]"
        role="img"
        aria-label="Daily cost over the last 30 days"
      >
        {DAYS.map(([a, b], i) => (
          <div
            key={i}
            aria-hidden="true"
            data-reveal="grow"
            className="flex flex-1 flex-col justify-end overflow-hidden rounded-[2px]"
            style={{ height: `${((a + b) / peak) * 100}%` }}
          >
            <span className="block bg-accent" style={{ height: `${(b / (a + b)) * 100}%` }} />
            <span className="block flex-1 bg-accent/35" />
          </div>
        ))}
      </div>
      <dl className="mt-3.5 space-y-1.5 border-t border-line pt-3 text-[12.5px] tabular-nums">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2 rounded-[2px] bg-accent" />
          <dt className="text-muted">muse-spark-1.3</dt>
          <dd className="ml-auto font-medium text-fg">$4.55</dd>
        </div>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2 rounded-[2px] bg-accent/35" />
          <dt className="text-muted">muse-spark-1.3 contributor</dt>
          <dd className="ml-auto font-medium text-fg">$0.74</dd>
        </div>
      </dl>
    </Panel>
  );
}

function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] bg-surface px-1 font-sans text-[11px] font-medium text-muted shadow-[0_0_0_1px_var(--border)]">
      {children}
    </kbd>
  );
}

function PalettePreview() {
  const rows = [
    { icon: NotePencil, label: "New thread", keys: ["⌘", "⇧", "O"], active: true },
    { icon: SidebarSimple, label: "Toggle sidebar", keys: ["⌘", "B"] },
    { icon: ArrowsClockwise, label: "Refresh threads from Muse" },
    { icon: Sun, label: "Use light theme" },
  ];
  return (
    <Panel data-reveal="scale" className="flex flex-1 flex-col text-[13px]">
      <div className="flex items-start gap-2 border-b border-line px-3 py-2.5 text-subtle">
        <MagnifyingGlass aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span className="min-w-0 flex-1 text-pretty">Search threads, projects and&nbsp;actions</span>
        <span className="ml-auto flex shrink-0 gap-1">
          <Key>⌘</Key>
          <Key>K</Key>
        </span>
      </div>
      <ul data-stagger="45" data-base="195" className="flex-1 p-1.5" aria-label="Command palette actions">
        {rows.map(({ icon: Icon, label, keys, active }) => (
          <li
            key={label}
            data-reveal="slide"
            className={cn("flex items-center gap-2.5 rounded-lg px-2 py-1.5", active ? "bg-tint text-fg" : "text-muted")}
          >
            <Icon aria-hidden="true" className={cn("size-4", active ? "text-accent-text" : "text-subtle")} />
            {label}
            {keys ? (
              <span className="ml-auto flex gap-1">
                {keys.map((k) => (
                  <Key key={k}>{k}</Key>
                ))}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-3 py-2.5 font-mono text-[11.5px]">
        {["/plan", "/review", "/compact", "!git status"].map((c) => (
          <span key={c} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-muted shadow-[0_0_0_1px_var(--border)]">
            {c}
          </span>
        ))}
      </div>
    </Panel>
  );
}

function ShellPreview({ kind }: { kind: "desktop" | "web" }) {
  const desktop = kind === "desktop";
  return (
    <figure data-reveal="scale" className="min-w-0">
      <Panel>
        <div className="flex h-8 items-center gap-2 border-b border-line bg-surface-2 px-3">
          {desktop ? (
            <span aria-hidden="true" className="flex gap-1">
              <span className="size-2 rounded-full bg-[#ff5f57]" />
              <span className="size-2 rounded-full bg-[#febc2e]" />
              <span className="size-2 rounded-full bg-[#28c840]" />
            </span>
          ) : (
            <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-bg px-2 py-0.5 font-mono text-[11px] text-subtle shadow-[0_0_0_1px_var(--border)]">
              <LockSimple aria-hidden="true" weight="fill" className="size-3 shrink-0" />
              <span className="truncate">your-server:4186</span>
            </span>
          )}
          {desktop ? <span className="mx-auto pr-8 text-[11px] font-medium text-subtle">Helicon</span> : null}
        </div>
        <div aria-hidden="true" className="flex h-[92px]">
          <div className="flex w-[38%] flex-col gap-1.5 border-r border-line bg-surface-2 p-2.5">
            <span className="h-1.5 w-3/4 rounded-full bg-line-strong" />
            <span className="h-1.5 w-1/2 rounded-full bg-line" />
            <span className="mt-1 h-4 w-full rounded-md bg-tint" />
            <span className="h-1.5 w-2/3 rounded-full bg-line" />
            <span className="h-1.5 w-3/5 rounded-full bg-line" />
          </div>
          <div className="flex flex-1 flex-col justify-end gap-1.5 p-2.5">
            <span className="ml-auto h-3 w-2/3 rounded-md bg-line" />
            <span className="h-1.5 w-5/6 rounded-full bg-line" />
            <span className="h-1.5 w-2/3 rounded-full bg-line" />
            <span className="mt-1 h-5 w-full rounded-lg shadow-[0_0_0_1px_var(--border-strong)]" />
          </div>
        </div>
      </Panel>
      <figcaption className="mt-3 flex items-start gap-2.5">
        {desktop ? (
          <AppWindow aria-hidden="true" weight="duotone" className="mt-0.5 size-5 shrink-0 text-accent-text" />
        ) : (
          <Globe aria-hidden="true" weight="duotone" className="mt-0.5 size-5 shrink-0 text-accent-text" />
        )}
        <span>
          <span className="block text-[14px] font-semibold text-fg">{desktop ? "Desktop app" : "Web app"}</span>
          <span className="block text-[13px] text-subtle">
            {desktop ? "Tauri, with auto-update on Windows and macOS" : "Any browser, pointed at a remote daemon"}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

export function Features({ title, body }: { title: string; body: string }) {
  return (
    <section id="features" aria-labelledby="features-title">
      <div className={`${bandX} py-14 sm:py-20`}>
      <SectionHeading id="features-title" icon={<SquaresFour weight="duotone" />} title={title}>
        {body}
      </SectionHeading>
      </div>

      <Rule />
      <CellGrid className="md:grid-cols-6">
        <Cell
          className="md:col-span-3"
          icon={<FolderSimple weight="duotone" />}
          title="Every project, grouped"
          order={0}
          body="Threads grouped by folder, worktrees included. Resume any of them in one click."
        >
          <Panel className="mt-7 h-[450px]">
            <DemoApp
              view="sidebar"
              fluid
              route="#/t/api-paginate"
              height={450}
              label="Live demo: the Helicon sidebar with projects grouped by folder"
            />
          </Panel>
        </Cell>

        <Cell
          className="md:col-span-3"
          icon={<GitDiff weight="duotone" />}
          title="Inline diffs"
          order={1}
          body="Every edit lands in the thread as a diff, right where it happened. No scrollback digging."
        >
          <DiffPreview />
        </Cell>

        <Cell
          className="md:col-span-3 xl:col-span-2"
          icon={<ShieldCheck weight="duotone" />}
          title="Approvals stay approvals"
          order={0}
          body="Every approval is surfaced the moment it arrives. None are batched or bypassed."
        >
          <ApprovalDemo />
        </Cell>

        <Cell
          className="md:col-span-3 xl:col-span-2"
          icon={<ChartBar weight="duotone" />}
          title="Cost, in the open"
          order={1}
          body="What each thread would cost at API rates, so you see what your plan is doing."
        >
          <div className="mt-7 flex flex-1 flex-col">
            <CostPreview />
            <p data-reveal className="mt-2 text-[12px] text-subtle">
              Sample figures
            </p>
          </div>
        </Cell>

        <Cell
          className="md:col-span-6 xl:col-span-2"
          icon={<Command weight="duotone" />}
          title="Keyboard first"
          order={2}
          body="Command palette, slash commands and a model picker. Reach any thread by keyboard."
        >
          <div className="mt-7 flex flex-1 flex-col">
            <PalettePreview />
            <p data-reveal className="mt-2 text-[12px] text-subtle">
              Press ⌘K inside any live demo to open it.
            </p>
          </div>
        </Cell>

        <article data-stagger="70" className="grid gap-8 bg-bg p-6 sm:p-8 md:col-span-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] md:items-center md:gap-12">
          <div data-reveal>
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="inline-flex size-9 items-center justify-center rounded-[10px] bg-tint text-accent-text"
              >
                <Browsers weight="duotone" className="size-[18px]" />
              </span>
              <h3 className="font-headline text-[20px] leading-tight font-semibold text-fg">One UI, two shells</h3>
            </div>
            <p className="mt-3 max-w-[44ch] text-[15px] leading-relaxed text-muted">
              The same React interface ships as a Tauri desktop app and as a web app pointed at a remote
              daemon.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-surface-2 py-1 pr-3 pl-2 text-[13px] text-muted shadow-[0_0_0_1px_var(--border)]">
              <TerminalWindow aria-hidden="true" weight="duotone" className="size-4 text-accent-text" />
              Same daemon, same threads, either way
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <ShellPreview kind="desktop" />
            <ShellPreview kind="web" />
          </div>
        </article>
      </CellGrid>
    </section>
  );
}
