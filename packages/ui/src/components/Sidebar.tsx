import React from "react";
import { Icon, Logo } from "../icons.js";
import type { ProjectView, SessionView } from "../types.js";

export interface SidebarProps {
  projects: ProjectView[];
  sessionsByCwd: Record<string, SessionView[]>;
  activeSessionId: string | null;
  workingSessionIds: string[];
  search: string;
  onSearchChange: (value: string) => void;
  onSelectSession: (session: SessionView) => void;
  onNewSession: (cwd: string) => void;
  onTogglePin: (cwd: string, pinned: boolean) => void;
  onRefreshProject: (cwd: string) => void;
  onOpenSettings: () => void;
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return "";
  }
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  return `${Math.round(hours / 24)}d`;
}

export function Sidebar(props: SidebarProps): React.ReactElement {
  const query = props.search.trim().toLowerCase();
  const visible = props.projects.filter(
    (p) =>
      query.length === 0 ||
      p.displayName.toLowerCase().includes(query) ||
      p.cwd.toLowerCase().includes(query),
  );
  const settled: { session: SessionView; project: ProjectView }[] = [];
  for (const project of visible) {
    for (const session of props.sessionsByCwd[project.cwd] ?? []) {
      if (session.sessionId !== props.activeSessionId && !props.workingSessionIds.includes(session.sessionId)) {
        settled.push({ session, project });
      }
    }
  }
  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col border-r border-night-700 bg-night-900">
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <Logo />
        <span className="text-[15px] font-semibold tracking-tight">Helicon</span>
        <span className="ml-auto" />
        <button
          className="rounded-md p-1.5 text-ink-500 hover:bg-night-800 hover:text-ink-100"
          title="Refresh all projects"
          onClick={() => visible.forEach((p) => props.onRefreshProject(p.cwd))}
        >
          <Icon name="refresh" />
        </button>
        <button
          className="rounded-md p-1.5 text-ink-500 hover:bg-night-800 hover:text-ink-100"
          title="Settings"
          onClick={props.onOpenSettings}
        >
          <Icon name="gear" />
        </button>
      </div>

      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 rounded-lg border border-night-700 bg-night-850 px-2.5 py-1.5">
          <span className="text-ink-600">
            <Icon name="search" size={15} />
          </span>
          <input
            className="w-full bg-transparent text-[13px] placeholder:text-ink-600 focus:outline-none"
            placeholder="Search threads or projects"
            value={props.search}
            onChange={(e) => props.onSearchChange(e.currentTarget.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {visible.map((project) => {
          const sessions = props.sessionsByCwd[project.cwd] ?? [];
          const live = sessions.filter(
            (s) => s.sessionId === props.activeSessionId || props.workingSessionIds.includes(s.sessionId),
          );
          return (
            <div key={project.cwd} className="mb-1">
              <div className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-night-800">
                <span className="text-accent-400">
                  <Icon name="folder" size={15} />
                </span>
                <span className="flex-1 truncate text-[13px] font-medium" title={project.cwd}>
                  {project.displayName}
                </span>
                <button
                  className="rounded p-1 text-ink-600 opacity-0 hover:text-ink-100 group-hover:opacity-100"
                  title={project.pinned ? "Unpin project" : "Pin project"}
                  onClick={() => props.onTogglePin(project.cwd, !project.pinned)}
                >
                  {project.pinned ? <Icon name="check" size={13} /> : <Icon name="plus" size={13} />}
                </button>
                <button
                  className="rounded p-1 text-ink-600 opacity-0 hover:text-ink-100 group-hover:opacity-100"
                  title={`New session in ${project.displayName}`}
                  onClick={() => props.onNewSession(project.cwd)}
                >
                  <Icon name="plus" size={14} />
                </button>
              </div>
              {live.map((session) => {
                const working =
                  session.sessionId === props.activeSessionId ||
                  props.workingSessionIds.includes(session.sessionId);
                return (
                  <button
                    key={session.sessionId}
                    onClick={() => props.onSelectSession(session)}
                    className={`mb-1 block w-full rounded-xl border px-3 py-2.5 text-left ${
                      session.sessionId === props.activeSessionId
                        ? "border-night-600 bg-night-800"
                        : "border-transparent bg-night-850 hover:border-night-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={working ? "text-accent-400 helicon-pulse" : "text-ok-500"}>
                        <Icon name="dot" size={12} />
                      </span>
                      <span className="flex-1 truncate text-[13px] font-medium">{session.title}</span>
                      {working && <span className="text-[11px] font-medium text-accent-400">Working</span>}
                    </div>
                    <div className="mt-1 flex items-center gap-2 pl-5 text-[11px] text-ink-500">
                      <span>{session.origin === "tui" ? "terminal" : "helicon"}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {session.turnCount} turn{session.turnCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}

        {settled.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center gap-2 px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-ink-600">
              <span>Settled</span>
              <span className="h-px flex-1 bg-night-700" />
            </div>
            {settled.slice(0, 30).map(({ session, project }) => (
              <button
                key={session.sessionId}
                onClick={() => props.onSelectSession(session)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-night-800"
              >
                <span className="text-ink-600">
                  <Icon name="file" size={14} />
                </span>
                <span className="flex-1 truncate text-[13px] text-ink-300">{session.title}</span>
                <span className="shrink-0 text-[11px] text-ink-600" title={project.cwd}>
                  {project.displayName}
                </span>
              </button>
            ))}
          </div>
        )}

        {visible.length === 0 && (
          <p className="px-2 py-6 text-center text-[13px] text-ink-500">
            No projects match. Add a folder above to start.
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 border-t border-night-700 px-3 py-2 text-ink-500">
        <span className="text-[11px]">Unofficial client</span>
      </div>
    </aside>
  );
}
