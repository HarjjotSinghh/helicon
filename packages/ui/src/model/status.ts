import type { ProjectView, SessionSummary } from "../types.js";
import type { ThreadFold } from "./fold.js";

/** What a thread needs from the user right now, most urgent first. */
export type ThreadStatus = "approval" | "input" | "running" | "failed" | "unread" | "idle";

export const STATUS_PRIORITY: Record<ThreadStatus, number> = {
  approval: 0,
  input: 1,
  running: 2,
  failed: 3,
  unread: 4,
  idle: 5,
};

export const STATUS_LABEL: Record<ThreadStatus, string> = {
  approval: "Needs approval",
  input: "Needs your answer",
  running: "Working",
  failed: "Failed",
  unread: "Ready for review",
  idle: "Idle",
};

export interface StatusContext {
  fold?: ThreadFold | null;
  /** When the user last looked at this thread (ISO). */
  lastSeen?: string | null;
  /** Activity before this instant counts as seen; set on first run so old history is not "unread". */
  baseline: string;
  /** The thread is open on screen. */
  active: boolean;
}

function later(a: string | null | undefined, b: string): string {
  return a && a > b ? a : b;
}

export function threadStatus(session: SessionSummary, ctx: StatusContext): ThreadStatus {
  const fold = ctx.fold ?? null;
  const approvals = fold ? Object.keys(fold.approvals).length : (session.live?.pendingApprovals ?? 0);
  if (approvals > 0) {
    return "approval";
  }
  const inputs = fold ? Object.keys(fold.userInputs).length : (session.live?.pendingInputs ?? 0);
  if (inputs > 0) {
    return "input";
  }
  const running = fold ? fold.activeTurnId !== null : Boolean(session.live?.activeTurnId);
  if (running) {
    return "running";
  }
  if (ctx.active) {
    return "idle";
  }
  if (session.activityAt > later(ctx.lastSeen, ctx.baseline)) {
    return session.live?.lastTerminal === "failed" ? "failed" : "unread";
  }
  return "idle";
}

export function isLive(status: ThreadStatus): boolean {
  return status === "approval" || status === "input" || status === "running";
}

export interface SidebarEntry {
  session: SessionSummary;
  status: ThreadStatus;
}

export interface ProjectGroup {
  project: ProjectView;
  entries: SidebarEntry[];
  attention: number;
  running: number;
}

function byActivity(a: SidebarEntry, b: SidebarEntry): number {
  return a.session.activityAt < b.session.activityAt ? 1 : a.session.activityAt > b.session.activityAt ? -1 : 0;
}

/** Threads that need the user or are working float to the top of their project; the rest follow recency. */
function projectOrder(a: SidebarEntry, b: SidebarEntry): number {
  const liveA = isLive(a.status);
  const liveB = isLive(b.status);
  if (liveA !== liveB) {
    return liveA ? -1 : 1;
  }
  if (liveA && liveB && a.status !== b.status) {
    return STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
  }
  return byActivity(a, b);
}

export function groupByProject(projects: ProjectView[], entries: SidebarEntry[]): ProjectGroup[] {
  const buckets = new Map<string, SidebarEntry[]>();
  for (const project of projects) {
    buckets.set(project.cwd, []);
  }
  for (const entry of entries) {
    buckets.get(entry.session.cwd)?.push(entry);
  }
  return projects.map((project) => {
    const list = (buckets.get(project.cwd) ?? []).sort(projectOrder);
    return {
      project,
      entries: list,
      attention: list.filter((e) => e.status === "approval" || e.status === "input").length,
      running: list.filter((e) => e.status === "running").length,
    };
  });
}

export type StatusGroupId = "attention" | "running" | "review" | "idle";

export interface StatusGroup {
  id: StatusGroupId;
  label: string;
  entries: SidebarEntry[];
}

const STATUS_GROUPS: { id: StatusGroupId; label: string; statuses: ThreadStatus[] }[] = [
  { id: "attention", label: "Needs you", statuses: ["approval", "input"] },
  { id: "running", label: "Working", statuses: ["running"] },
  { id: "review", label: "Ready for review", statuses: ["failed", "unread"] },
  { id: "idle", label: "Idle", statuses: ["idle"] },
];

export function groupByStatus(entries: SidebarEntry[]): StatusGroup[] {
  return STATUS_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    entries: entries
      .filter((e) => group.statuses.includes(e.status))
      .sort((a, b) =>
        a.status !== b.status && group.statuses.length > 1
          ? STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]
          : byActivity(a, b),
      ),
  })).filter((group) => group.entries.length > 0);
}
