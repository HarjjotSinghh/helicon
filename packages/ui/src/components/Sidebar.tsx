import React from "react";
import type { ProjectView, SessionView } from "../types.js";

export interface SidebarProps {
  projects: ProjectView[];
  sessionsByCwd: Record<string, SessionView[]>;
  activeSessionId: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelectSession: (session: SessionView) => void;
  onNewSession: (cwd: string) => void;
  onTogglePin: (cwd: string, pinned: boolean) => void;
  onOpenFolder: (cwd: string) => void;
}

export function Sidebar(props: SidebarProps): React.ReactElement {
  const query = props.search.trim().toLowerCase();
  const visible = props.projects.filter(
    (p) =>
      query.length === 0 ||
      p.displayName.toLowerCase().includes(query) ||
      p.cwd.toLowerCase().includes(query),
  );
  return (
    <aside className="helicon-sidebar">
      <input
        className="helicon-search"
        placeholder="Search projects"
        value={props.search}
        onChange={(e) => props.onSearchChange(e.currentTarget.value)}
      />
      {visible.map((project) => {
        const sessions = props.sessionsByCwd[project.cwd] ?? [];
        return (
          <section key={project.cwd} className="helicon-project">
            <header className="helicon-project-head">
              <span className="helicon-project-name" title={project.cwd}>
                {project.pinned ? "[pinned] " : ""}
                {project.displayName}
              </span>
              <button
                title={project.pinned ? "Unpin" : "Pin"}
                onClick={() => props.onTogglePin(project.cwd, !project.pinned)}
              >
                {project.pinned ? "-" : "+"}
              </button>
              <button title="New session" onClick={() => props.onNewSession(project.cwd)}>
                New
              </button>
              <button title="Open folder" onClick={() => props.onOpenFolder(project.cwd)}>
                Open
              </button>
            </header>
            <ul className="helicon-sessions">
              {sessions.map((session) => (
                <li key={session.sessionId}>
                  <button
                    className={
                      session.sessionId === props.activeSessionId
                        ? "helicon-session active"
                        : "helicon-session"
                    }
                    onClick={() => props.onSelectSession(session)}
                  >
                    {session.title}
                    {session.origin === "tui" ? " (terminal)" : ""}
                  </button>
                </li>
              ))}
              {sessions.length === 0 && <li className="helicon-empty">No sessions yet</li>}
            </ul>
          </section>
        );
      })}
    </aside>
  );
}
