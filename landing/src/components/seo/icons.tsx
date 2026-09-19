import {
  AppWindow,
  ArrowCounterClockwise,
  ArrowsLeftRight,
  BookBookmark,
  BookOpen,
  Briefcase,
  Broadcast,
  Browsers,
  ChartBar,
  ClockCounterClockwise,
  Code,
  Command,
  Cube,
  CurrencyDollar,
  CursorClick,
  DownloadSimple,
  FileText,
  FolderOpen,
  FolderSimple,
  Gauge,
  Gavel,
  GitBranch,
  GitCommit,
  GitDiff,
  GitFork,
  Globe,
  HardDrives,
  Keyboard,
  Lightning,
  MagnifyingGlass,
  Plugs,
  PlugsConnected,
  PuzzlePiece,
  Queue,
  Question,
  Robot,
  Scales,
  ShieldCheck,
  Sparkle,
  SquaresFour,
  Stack,
  Tag,
  Target,
  Terminal,
  TerminalWindow,
  TreeStructure,
  UsersThree,
  WarningCircle,
  Wind,
} from "@phosphor-icons/react/ssr";
import type { ComponentType } from "react";
import { AppleLogo, GitHubLogo, LinuxLogo, WindowsLogo } from "../os-logos";
import type { IconKey } from "@/lib/seo/types";
import { cn } from "../ui";

/**
 * The glyph set for generated pages, drawn the same way the landing page draws its own: Phosphor
 * duotone in a tinted square, with the platform marks coming from os-logos so an install card and
 * the install section on the home page show the same Windows, Apple and Linux logos.
 */

type Glyph = ComponentType<{ className?: string }>;

type PhosphorIcon = ComponentType<{ className?: string; weight?: "duotone" | "bold" | "regular" | "fill" }>;

/** Phosphor ships several weights; duotone is the one the landing page uses for section marks. */
function duotone(Icon: PhosphorIcon): Glyph {
  return function DuotoneGlyph({ className }: { className?: string }) {
    return <Icon weight="duotone" className={className} />;
  };
}

export const ICONS: Record<IconKey, Glyph> = {
  windows: WindowsLogo,
  apple: AppleLogo,
  linux: LinuxLogo,
  github: GitHubLogo,
  terminal: duotone(Terminal),
  terminalWindow: duotone(TerminalWindow),
  code: duotone(Code),
  lightning: duotone(Lightning),
  browsers: duotone(Browsers),
  appWindow: duotone(AppWindow),
  robot: duotone(Robot),
  cursor: duotone(CursorClick),
  wind: duotone(Wind),
  gitBranch: duotone(GitBranch),
  gitCommit: duotone(GitCommit),
  gitDiff: duotone(GitDiff),
  gitFork: duotone(GitFork),
  puzzle: duotone(PuzzlePiece),
  squares: duotone(SquaresFour),
  tag: duotone(Tag),
  clock: duotone(ClockCounterClockwise),
  shield: duotone(ShieldCheck),
  chart: duotone(ChartBar),
  gauge: duotone(Gauge),
  folder: duotone(FolderSimple),
  folderOpen: duotone(FolderOpen),
  command: duotone(Command),
  file: duotone(FileText),
  globe: duotone(Globe),
  tree: duotone(TreeStructure),
  target: duotone(Target),
  queue: duotone(Queue),
  rewind: duotone(ArrowCounterClockwise),
  drives: duotone(HardDrives),
  currency: duotone(CurrencyDollar),
  search: duotone(MagnifyingGlass),
  keyboard: duotone(Keyboard),
  warning: duotone(WarningCircle),
  swap: duotone(ArrowsLeftRight),
  stack: duotone(Stack),
  broadcast: duotone(Broadcast),
  briefcase: duotone(Briefcase),
  sparkle: duotone(Sparkle),
  plugsConnected: duotone(PlugsConnected),
  plugs: duotone(Plugs),
  cube: duotone(Cube),
  scales: duotone(Scales),
  bookmark: duotone(BookBookmark),
  book: duotone(BookOpen),
  people: duotone(UsersThree),
  download: duotone(DownloadSimple),
  question: duotone(Question),
  gavel: duotone(Gavel),
};

/**
 * The tinted square the landing page puts every section mark in. `lead` is the large one that
 * sits above a heading; the default is the smaller one that sits beside a card title and tilts
 * on hover, exactly as the feature cells on the home page do.
 */
export function IconTile({
  name,
  lead,
  className,
}: {
  name: IconKey;
  lead?: boolean;
  className?: string;
}) {
  const Glyph = ICONS[name];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[10px] bg-tint text-accent-text",
        lead
          ? "size-10 shadow-[inset_0_0_0_1px_var(--tint-strong)] [&_svg]:size-5"
          : "size-9 transition-transform duration-300 ease-[var(--reveal-ease)] [&_svg]:size-[18px] [@media(hover:hover)]:group-hover:-rotate-6 [@media(hover:hover)]:group-hover:scale-110",
        className,
      )}
    >
      <Glyph />
    </span>
  );
}
