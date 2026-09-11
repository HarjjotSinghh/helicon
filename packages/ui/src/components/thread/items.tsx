import {
  Bot,
  ChevronRight,
  CircleAlert,
  FilePen,
  FilePlus,
  FileText,
  FolderTree,
  Globe,
  ListTodo,
  Minimize2,
  MessageCircleQuestion,
  Search,
  SquareTerminal,
  Target,
  Workflow,
  Wrench,
} from "lucide-react";
import { Popover } from "radix-ui";
import { memo, useMemo, useRef, useState, type ReactNode } from "react";
import {
  basename,
  describeTool,
  diffStats,
  extractDiff,
  formatDuration,
  formatTokens,
  humanize,
  parseArgs,
  type DiffView,
  type ToolKind,
} from "../../model/format.js";
import type { MspItem, UserInputAnswer } from "../../types.js";
import { CodeBlock, Markdown } from "../ui/Markdown.js";
import { Shimmer, Spinner, cn } from "../ui/primitives.js";
import { Collapse } from "../ui/sourced.js";

const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;?]*[A-Za-z]`, "g");
const TERMINAL_FAILURES = new Set(["failed", "rejected", "cancelled", "timedOut"]);

export type Gate = "approval" | "input";

const TOOL_ICONS: Record<ToolKind, (props: { size: number; className?: string }) => ReactNode> = {
  shell: (p) => <SquareTerminal {...p} />,
  read: (p) => <FileText {...p} />,
  edit: (p) => <FilePen {...p} />,
  write: (p) => <FilePlus {...p} />,
  search: (p) => <Search {...p} />,
  list: (p) => <FolderTree {...p} />,
  web: (p) => <Globe {...p} />,
  question: (p) => <MessageCircleQuestion {...p} />,
  plan: (p) => <ListTodo {...p} />,
  agent: (p) => <Bot {...p} />,
  goal: (p) => <Target {...p} />,
  generic: (p) => <Wrench {...p} />,
};

/**
 * One work-log row: icon, label, an inline chip for what it acted on, and an expandable body.
 * Hovering swaps the icon for the disclosure chevron.
 * Layout via Beautiful UI ToolChips (beautifului.dev), MIT (c) 2026 Shane Levine.
 * Adapted: Helicon tokens, lucide icons, real tool data, Collapse body.
 */
function Row(props: {
  icon: ReactNode;
  label: ReactNode;
  chip?: ReactNode;
  mono?: boolean;
  detail?: ReactNode;
  trailing?: ReactNode;
  body?: ReactNode;
  preview?: ReactNode;
  tone?: "default" | "warn" | "danger";
  /** Starts expanded, for output the user asked to see. */
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(props.defaultOpen ?? false);
  const expandable = Boolean(props.body);
  return (
    <div className="enter-up">
      <button
        type="button"
        disabled={!expandable}
        aria-expanded={expandable ? open : undefined}
        onClick={() => setOpen((v) => !v)}
        className="group/row -mx-1.5 flex h-8 w-[calc(100%+0.75rem)] min-w-0 items-center gap-2 rounded-lg px-1.5 text-left transition-colors duration-100 enabled:hover:bg-hover disabled:cursor-default"
      >
        <span
          className={cn(
            "relative flex size-4 shrink-0 items-center justify-center",
            props.tone === "warn" ? "text-warn" : props.tone === "danger" ? "text-danger" : "text-subtle",
          )}
        >
          <span
            className={cn(
              "flex transition-opacity duration-100",
              expandable && "group-hover/row:opacity-0 group-focus-visible/row:opacity-0",
              expandable && open && "opacity-0",
            )}
          >
            {props.icon}
          </span>
          {expandable ? (
            <ChevronRight
              size={13}
              strokeWidth={2.2}
              className={cn(
                "absolute text-subtle opacity-0 transition-[opacity,transform] duration-150 ease-out group-hover/row:opacity-100 group-focus-visible/row:opacity-100",
                open && "rotate-90 opacity-100",
              )}
            />
          ) : null}
        </span>
        <span className={cn("shrink-0 text-sm font-medium", props.tone === "danger" ? "text-danger-text" : "text-fg")}>{props.label}</span>
        {props.chip ? (
          <span
            className={cn(
              "min-w-0 truncate rounded-md bg-sunken px-1.5 py-[3px] text-xs leading-4 text-muted shadow-[0_0_0_1px_var(--border)]",
              props.mono && "font-mono text-[11.5px]",
            )}
          >
            {props.chip}
          </span>
        ) : null}
        {props.detail ? <span className="min-w-0 truncate text-sm text-subtle">{props.detail}</span> : null}
        <span className="min-w-2 flex-1" />
        {props.trailing}
      </button>
      {!open && props.preview ? <div className="ml-6 pb-1">{props.preview}</div> : null}
      {expandable ? (
        <Collapse open={open}>
          <div className="mt-0.5 mb-2 ml-[7px] flex flex-col gap-2 border-l border-line py-0.5 pl-[17px]">{props.body}</div>
        </Collapse>
      ) : null}
    </div>
  );
}

export function OutputBlock(props: { text: string; truncated?: boolean; label?: string }) {
  const clean = props.text.replace(ANSI, "").replace(/\s+$/, "");
  if (!clean) {
    return null;
  }
  return (
    <div className="overflow-hidden rounded-lg bg-sunken shadow-[0_0_0_1px_var(--border)]">
      {props.label ? <div className="px-3 pt-2 font-sans text-2xs font-medium text-subtle">{props.label}</div> : null}
      <pre className="max-h-72 overflow-x-hidden overflow-y-auto px-3 py-2 font-mono text-xs leading-relaxed whitespace-pre-wrap text-muted [overflow-wrap:anywhere]">
        {clean}
      </pre>
      {props.truncated ? (
        <p className="border-t border-line px-3 py-1.5 text-2xs text-subtle">Output was trimmed here; the full log is in the Muse session.</p>
      ) : null}
    </div>
  );
}

export function DiffBlock(props: { diff: DiffView }) {
  const stats = diffStats(props.diff);
  const lines: { kind: "add" | "del" | "ctx" | "meta"; text: string }[] = [];
  if ("patch" in props.diff) {
    for (const line of props.diff.patch.split("\n")) {
      if (/^(\+\+\+|---|\*\*\*|@@|diff )/.test(line)) {
        lines.push({ kind: "meta", text: line });
      } else if (line.startsWith("+")) {
        lines.push({ kind: "add", text: line.slice(1) });
      } else if (line.startsWith("-")) {
        lines.push({ kind: "del", text: line.slice(1) });
      } else {
        lines.push({ kind: "ctx", text: line.startsWith(" ") ? line.slice(1) : line });
      }
    }
  } else {
    props.diff.hunks.forEach((hunk, index) => {
      if (index > 0) {
        lines.push({ kind: "meta", text: "..." });
      }
      for (const text of hunk.removed) {
        lines.push({ kind: "del", text });
      }
      for (const text of hunk.added) {
        lines.push({ kind: "add", text });
      }
    });
  }
  return (
    <div className="overflow-hidden rounded-lg bg-sunken shadow-[0_0_0_1px_var(--border)]">
      <div className="flex h-8 items-center gap-2 border-b border-line px-3 text-xs">
        <span className="min-w-0 flex-1 truncate font-mono text-muted">{props.diff.path ?? "Changes"}</span>
        <DiffCount added={stats.added} removed={stats.removed} />
      </div>
      <div className="max-h-80 overflow-x-hidden overflow-y-auto py-1 font-mono text-xs leading-[1.65]">
        {lines.map((line, i) => (
          <div
            key={i}
            className={cn(
              "flex pr-3",
              line.kind === "add" && "bg-diff-add",
              line.kind === "del" && "bg-diff-del",
              line.kind === "meta" && "text-subtle",
            )}
          >
            <span
              className={cn(
                "w-6 shrink-0 text-center select-none",
                line.kind === "add" ? "text-ok-text" : line.kind === "del" ? "text-danger-text" : "text-subtle",
              )}
              aria-hidden="true"
            >
              {line.kind === "add" ? "+" : line.kind === "del" ? "-" : " "}
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 whitespace-pre-wrap [overflow-wrap:anywhere]",
                line.kind === "ctx" || line.kind === "meta" ? "text-muted" : "text-fg",
              )}
            >
              {line.text || " "}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DiffCount(props: { added: number; removed: number }) {
  return (
    <span className="shrink-0 font-mono text-2xs tabular-nums">
      <span className="text-ok-text">+{props.added}</span> <span className="text-danger-text">-{props.removed}</span>
    </span>
  );
}

interface FileChanges {
  path: string;
  added: number;
  removed: number;
  diffs: DiffView[];
}

/**
 * The files a turn changed, as chips; hover or focus one to preview its diff.
 * via Beautiful UI ToolChips file-diff chips (beautifului.dev), MIT (c) 2026 Shane Levine.
 * Adapted: Radix Popover for keyboard access instead of a hand-positioned portal.
 */
export function DiffChips(props: { entries: MspItem[]; className?: string }) {
  const files = useMemo(() => {
    const byPath = new Map<string, FileChanges>();
    for (const item of props.entries) {
      if (item.kind !== "toolCall") {
        continue;
      }
      const diff = extractDiff(item);
      if (!diff) {
        continue;
      }
      const key = diff.path ?? item.itemId;
      const stats = diffStats(diff);
      const entry = byPath.get(key) ?? { path: diff.path ?? "file", added: 0, removed: 0, diffs: [] };
      entry.added += stats.added;
      entry.removed += stats.removed;
      entry.diffs.push(diff);
      byPath.set(key, entry);
    }
    return [...byPath.values()];
  }, [props.entries]);
  if (files.length === 0) {
    return null;
  }
  return (
    <div className={cn("flex max-w-full flex-wrap gap-1.5", props.className)} aria-label="Files changed">
      {files.map((file) => (
        <DiffChip key={file.path} file={file} />
      ))}
    </div>
  );
}

function DiffChip(props: { file: FileChanges }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const show = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
    }
    setOpen(true);
  };
  const hide = () => {
    timer.current = window.setTimeout(() => setOpen(false), 140);
  };
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          onMouseEnter={show}
          onMouseLeave={hide}
          title={props.file.path}
          className="inline-flex h-7 max-w-full items-center gap-2 rounded-lg bg-raised px-2 font-mono text-[11.5px] text-fg shadow-btn transition-colors duration-100 hover:bg-hover data-[state=open]:bg-hover"
        >
          <FilePen size={12} className="shrink-0 text-subtle" />
          <span className="min-w-0 truncate">{basename(props.file.path)}</span>
          <DiffCount added={props.file.added} removed={props.file.removed} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          onMouseEnter={show}
          onMouseLeave={hide}
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="pop z-[var(--z-dropdown)] flex max-h-[60vh] w-[min(560px,calc(100vw-32px))] flex-col gap-2 overflow-y-auto rounded-xl bg-raised p-2 shadow-pop outline-none"
        >
          {props.file.diffs.map((diff, index) => (
            <DiffBlock key={index} diff={diff} />
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function lastLine(text: string | undefined): string | null {
  if (!text) {
    return null;
  }
  const lines = text
    .replace(ANSI, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines[lines.length - 1] ?? null;
}

function QuestionSummary(props: { item: MspItem; answers: UserInputAnswer[] | null }) {
  const args = parseArgs(props.item.args);
  const questions = args && Array.isArray(args["questions"]) ? (args["questions"] as Record<string, unknown>[]) : [];
  return (
    <div className="flex flex-col gap-2 text-sm">
      {questions.map((q, i) => {
        const id = typeof q["id"] === "string" ? q["id"] : String(i);
        const answer = props.answers?.find((a) => a.questionId === id);
        const chosen = answer?.selectedLabel ?? answer?.selectedLabels?.join(", ") ?? answer?.freeText ?? null;
        return (
          <div key={id}>
            <p className="text-muted">{typeof q["question"] === "string" ? q["question"] : "Question"}</p>
            <p className="mt-0.5 font-medium text-fg">{chosen ?? (props.answers ? "Skipped" : "Waiting for your answer")}</p>
          </div>
        );
      })}
    </div>
  );
}

export const ToolRow = memo(function ToolRow(props: { item: MspItem; gate?: Gate; answers?: UserInputAnswer[] | null }) {
  const { item } = props;
  const d = useMemo(() => describeTool(item), [item]);
  const diff = useMemo(() => (d.kind === "edit" || d.kind === "write" ? extractDiff(item) : null), [d.kind, item]);
  const running = item.status === "inProgress";
  const failed = TERMINAL_FAILURES.has(item.status);
  const stats = diff ? diffStats(diff) : null;
  const Icon = TOOL_ICONS[d.kind];
  const args = parseArgs(item.args);

  let trailing: ReactNode = null;
  if (props.gate) {
    trailing = (
      <span className="shrink-0 text-xs font-medium text-warn-text">
        {props.gate === "approval" ? "Waiting for approval" : "Waiting for your answer"}
      </span>
    );
  } else if (running) {
    trailing = <Spinner size={12} className="text-accent-text" label="Running" />;
  } else if (failed) {
    trailing = <span className="shrink-0 text-xs text-danger-text">{humanize(item.status)}</span>;
  } else if (stats) {
    trailing = <DiffCount added={stats.added} removed={stats.removed} />;
  }

  const body: ReactNode[] = [];
  if (d.note) {
    body.push(
      <p key="note" className="text-xs text-muted">
        {d.note}
      </p>,
    );
  }
  if (d.kind === "question") {
    body.push(<QuestionSummary key="q" item={item} answers={props.answers ?? null} />);
  } else {
    if (d.kind === "shell" && d.subject && d.subject.includes("\n")) {
      body.push(<CodeBlock key="cmd" code={d.subject} language="bash" className="my-0" />);
    }
    if (diff) {
      body.push(<DiffBlock key="diff" diff={diff} />);
    }
    if (item.visibleOutput) {
      body.push(<OutputBlock key="out" text={item.visibleOutput} truncated={item.truncated} label={d.kind === "shell" ? "Output" : undefined} />);
    }
    if (d.kind === "generic" && args) {
      body.push(<CodeBlock key="args" code={JSON.stringify(args, null, 2)} language="json" className="my-0" />);
    }
  }
  if (item.failureReason) {
    body.push(
      <p key="fail" className="flex items-start gap-1.5 text-xs text-danger-text">
        <CircleAlert size={13} className="mt-px shrink-0" /> {item.failureReason}
      </p>,
    );
  }

  const tail = running && d.kind === "shell" ? lastLine(item.visibleOutput) : null;
  return (
    <Row
      icon={<Icon size={14} />}
      tone={props.gate ? "warn" : failed ? "danger" : "default"}
      label={d.verb}
      chip={d.subject ? d.subject.split("\n")[0] : undefined}
      mono={d.mono}
      trailing={trailing}
      body={body.length > 0 ? body : undefined}
      preview={tail ? <p className="truncate font-mono text-2xs text-subtle">{tail}</p> : undefined}
    />
  );
});

export const ReasoningRow = memo(function ReasoningRow(props: { item: MspItem }) {
  const { item } = props;
  const summary = (item.summary ?? []).filter((part) => part.trim().length > 0);
  const text = summary.length > 0 ? summary.join("\n\n") : (item.text ?? "");
  const running = item.status === "inProgress";
  const headline =
    (summary[summary.length - 1] ?? text)
      .split("\n")
      .find((l) => l.trim())
      ?.replace(/\*\*/g, "") ?? "";
  return (
    <Row
      icon={running ? <Spinner size={11} /> : <span className="size-1.5 rounded-full bg-[var(--border-strong)]" />}
      label={running ? <Shimmer>Thinking</Shimmer> : <span className="text-muted">Thought</span>}
      detail={headline || undefined}
      body={text ? <Markdown text={text} className="text-sm text-muted" /> : undefined}
    />
  );
});

export const ShellRow = memo(function ShellRow(props: { item: MspItem }) {
  const { item } = props;
  const running = item.status === "inProgress";
  const code = item.exitCode;
  // A command Muse could not start (no sandbox, say) fails without an exit code; its output says why.
  const failed = (code !== undefined && code !== 0) || TERMINAL_FAILURES.has(item.status);
  return (
    <Row
      icon={<SquareTerminal size={14} />}
      label="You ran"
      chip={item.commandText ?? "a command"}
      mono
      defaultOpen
      tone={failed ? "danger" : "default"}
      trailing={
        running ? (
          <Spinner size={12} className="text-accent-text" label="Running" />
        ) : code !== undefined && code !== 0 ? (
          <span className="text-xs text-danger-text">Exit {code}</span>
        ) : failed ? (
          <span className="text-xs text-danger-text">Not run</span>
        ) : item.durationMs ? (
          <span className="text-2xs text-subtle tabular-nums">{formatDuration(item.durationMs)}</span>
        ) : null
      }
      body={item.visibleOutput ? <OutputBlock text={item.visibleOutput} truncated={item.truncated} /> : undefined}
    />
  );
});

export const SubagentRow = memo(function SubagentRow(props: { item: MspItem }) {
  const { item } = props;
  const running = item.status === "inProgress";
  const result = item.result?.summary ?? item.result?.text ?? null;
  return (
    <Row
      icon={<Bot size={14} />}
      label={running ? "Subagent working on" : "Subagent"}
      detail={item.objective ?? item.role ?? "a task"}
      tone={TERMINAL_FAILURES.has(item.status) ? "danger" : "default"}
      trailing={
        running ? (
          <Spinner size={12} className="text-accent-text" label="Running" />
        ) : item.usage?.outputTokens ? (
          <span className="text-2xs text-subtle tabular-nums">{formatTokens((item.usage.inputTokens ?? 0) + item.usage.outputTokens)} tokens</span>
        ) : null
      }
      body={
        result || item.failureReason ? (
          <>
            {result ? <Markdown text={result} className="text-sm" /> : null}
            {item.failureReason ? <p className="text-xs text-danger-text">{item.failureReason}</p> : null}
          </>
        ) : undefined
      }
    />
  );
});

export const WorkflowRow = memo(function WorkflowRow(props: { item: MspItem }) {
  const { item } = props;
  const children = item.children ?? [];
  const done = children.filter((c) => c.terminal === "completed").length;
  const running = item.status === "inProgress";
  return (
    <Row
      icon={<Workflow size={14} />}
      label="Workflow"
      detail={typeof item["entryId"] === "string" ? item["entryId"] : undefined}
      trailing={
        <span className="flex items-center gap-2 text-2xs text-subtle tabular-nums">
          {children.length > 0 ? `${done} of ${children.length}` : null}
          {running ? <Spinner size={12} className="text-accent-text" /> : null}
        </span>
      }
      body={
        children.length > 0 || item.message ? (
          <>
            {children.length > 0 ? (
              <ul className="flex flex-col gap-1 text-sm">
                {children.map((child) => (
                  <li key={`${child.childId}:${child.attempt}`} className="flex items-center gap-2">
                    {child.terminal ? (
                      <span className={cn("size-1.5 rounded-full", child.terminal === "completed" ? "bg-ok" : "bg-danger")} />
                    ) : (
                      <Spinner size={10} />
                    )}
                    <span className="truncate text-muted">{child.label ?? child.childId}</span>
                    <span className="text-xs text-subtle">{humanize(child.phase ?? child.status)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {item.message ? <p className="text-sm text-muted">{item.message}</p> : null}
          </>
        ) : undefined
      }
    />
  );
});

export function CompactionRow(props: { item: MspItem }) {
  const { item } = props;
  const running = item.status === "inProgress";
  const saved =
    item.tokensBefore !== undefined && item.tokensAfter !== undefined
      ? `${formatTokens(item.tokensBefore)} to ${formatTokens(item.tokensAfter)} tokens`
      : null;
  const label = running
    ? "Compacting context"
    : item.outcome === "noop"
      ? "Nothing to compact"
      : item.outcome === "failed"
        ? "Context compaction failed"
        : "Context compacted";
  return (
    <div className="my-1 flex items-center gap-3 text-xs text-subtle" role="note">
      <span className="h-px flex-1 bg-line" />
      <span className="flex items-center gap-1.5">
        {running ? <Spinner size={10} /> : <Minimize2 size={12} />}
        {label}
        {saved ? <span className="tabular-nums">({saved})</span> : null}
      </span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function GenericRow(props: { item: MspItem }) {
  const { item } = props;
  return (
    <Row
      icon={<Wrench size={14} />}
      label={humanize(item.kind)}
      detail={item.fallbackText}
      trailing={item.status === "inProgress" ? <Spinner size={12} /> : null}
      body={item.text ? <Markdown text={item.text} className="text-sm" /> : undefined}
    />
  );
}

export function SteerBubble(props: { item: MspItem }) {
  return (
    <div className="enter-up flex flex-col items-end gap-1">
      <span className="text-2xs font-medium text-subtle">You added</span>
      <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-active px-3.5 py-2 text-sm whitespace-pre-wrap text-fg">
        {props.item.displayText ?? props.item.text}
      </div>
    </div>
  );
}

export function AgentText(props: { item: MspItem; streaming?: boolean }) {
  return <Markdown text={props.item.text ?? ""} className={cn(props.streaming && "streaming")} />;
}
