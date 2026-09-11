import {
  Archive,
  ChevronRight,
  Code,
  Copy,
  Ellipsis,
  Folder,
  FolderOpen,
  FolderPlus,
  Layers,
  ListFilter,
  Monitor,
  Moon,
  PanelLeftClose,
  Pencil,
  Pin,
  PinOff,
  RefreshCw,
  Search,
  SquarePen,
  Sun,
  X,
} from "lucide-react";
import { memo, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { shallowEqual, useApp, useController, useNow } from "../../app/context.js";
import { basename, relativeTime } from "../../model/format.js";
import {
  STATUS_LABEL,
  groupByProject,
  groupByStatus,
  isLive,
  threadStatus,
  type ProjectGroup,
  type SidebarEntry,
} from "../../model/status.js";
import { DEFAULT_SIDEBAR_WIDTH } from "../../model/store.js";
import type { ProjectView, SessionSummary } from "../../types.js";
import { Menu, MenuContent, MenuItem, MenuOption, MenuRadioGroup, MenuSeparator, MenuTrigger, Tip } from "../ui/overlays.js";
import { IconButton, Logo, MOD, Shortcut, Spinner, cn, isMac } from "../ui/primitives.js";
import { StatusGlyph } from "../ui/StatusGlyph.js";

const PROJECT_PREVIEW = 6;
const STATUS_PREVIEW = 30;

export function Sidebar() {
  const width = useApp((s) => s.prefs.sidebarWidth);
  return (
    <aside
      aria-label="Sidebar"
      className="relative flex h-full shrink-0 flex-col border-r border-line bg-sidebar"
      style={{ width }}
    >
      <SidebarTop />
      <ThreadList />
      <SidebarFooter />
      <ResizeHandle />
    </aside>
  );
}

function SidebarTop() {
  const controller = useController();
  const routeKind = useApp((s) => s.route.kind);
  return (
    <div data-drag-region className="flex flex-col gap-px px-2 pt-2 pb-1.5">
      <div className="mb-2 flex h-8 items-center gap-2 pr-0.5 pl-1.5">
        <Logo size={20} />
        <span className="text-[14px] font-semibold tracking-[-0.01em] text-fg">Helicon</span>
        <span className="flex-1" />
        <Tip label="Hide sidebar" shortcut={[MOD, "B"]}>
          <IconButton label="Hide sidebar" onClick={() => controller.toggleSidebar()}>
            <PanelLeftClose size={16} />
          </IconButton>
        </Tip>
      </div>
      <NavRow
        icon={<SquarePen size={15} />}
        label="New thread"
        keys={[MOD, "Shift", "O"]}
        active={routeKind === "new"}
        onClick={() => controller.newThread()}
      />
      <NavRow icon={<Search size={15} />} label="Search" keys={[MOD, "K"]} onClick={() => controller.setPaletteOpen(true)} />
    </div>
  );
}

function NavRow(props: { icon: ReactNode; label: string; keys: string[]; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-current={props.active ? "page" : undefined}
      className={cn(
        "group/nav flex h-8 w-full items-center gap-2.5 rounded-lg px-2 text-sm text-muted transition-colors duration-100 hover:bg-hover hover:text-fg",
        props.active && "bg-active text-fg",
      )}
    >
      <span className="flex size-4 items-center justify-center">{props.icon}</span>
      <span className="flex-1 text-left">{props.label}</span>
      <Shortcut keys={props.keys} className="opacity-0 transition-opacity duration-150 group-hover/nav:opacity-100" />
    </button>
  );
}

function useSidebarEntries(): { entries: SidebarEntry[]; activeId: string | null } {
  const sessions = useApp((s) => s.sessions);
  const threads = useApp((s) => s.threads);
  const lastSeen = useApp((s) => s.prefs.lastSeen);
  const baseline = useApp((s) => s.prefs.baseline);
  const activeId = useApp((s) => (s.route.kind === "thread" ? s.route.sessionId : null));
  const entries = useMemo(
    () =>
      Object.values(sessions).map((session) => ({
        session,
        status: threadStatus(session, {
          fold: threads[session.sessionId]?.fold ?? null,
          lastSeen: lastSeen[session.sessionId] ?? null,
          baseline,
          active: session.sessionId === activeId,
        }),
      })),
    [sessions, threads, lastSeen, baseline, activeId],
  );
  return { entries, activeId };
}

function ThreadList() {
  const controller = useController();
  const projects = useApp((s) => s.projects);
  const groupBy = useApp((s) => s.prefs.groupBy);
  const collapsed = useApp((s) => s.prefs.collapsedProjects);
  const loaded = useApp((s) => s.sessionsLoaded);
  const now = useNow(30_000);
  const { entries, activeId } = useSidebarEntries();

  const projectGroups = useMemo(() => groupByProject(projects, entries), [projects, entries]);
  const statusGroups = useMemo(() => groupByStatus(entries), [entries]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-7 items-center justify-between pr-2 pl-3.5">
        <h2 className="text-xs font-medium text-subtle">{groupBy === "project" ? "Projects" : "By status"}</h2>
        <div className="flex items-center gap-0.5">
          <GroupByMenu />
          <Tip label="Add project">
            <IconButton size="xs" label="Add project" onClick={() => controller.setAddProjectOpen(true)}>
              <FolderPlus size={14} />
            </IconButton>
          </Tip>
        </div>
      </div>
      <nav aria-label="Threads" className="min-h-0 flex-1 overflow-y-auto px-2 pt-1 pb-6">
        {!loaded ? (
          <SidebarSkeleton />
        ) : projects.length === 0 ? (
          <SidebarEmpty />
        ) : groupBy === "project" ? (
          projectGroups.map((group) => (
            <ProjectSection
              key={group.project.cwd}
              group={group}
              collapsed={collapsed.includes(group.project.cwd)}
              activeId={activeId}
              now={now}
            />
          ))
        ) : (
          statusGroups.map((group) => (
            <StatusSection key={group.id} label={group.label} entries={group.entries} activeId={activeId} now={now} cap={group.id === "idle"} />
          ))
        )}
      </nav>
    </div>
  );
}

const ProjectSection = memo(function ProjectSection(props: {
  group: ProjectGroup;
  collapsed: boolean;
  activeId: string | null;
  now: number;
}) {
  const controller = useController();
  const [expanded, setExpanded] = useState(false);
  const { project, entries } = props.group;
  const activeIndex = entries.findIndex((e) => e.session.sessionId === props.activeId);
  const liveCount = entries.filter((e) => isLive(e.status)).length;
  const limit = expanded ? entries.length : Math.max(PROJECT_PREVIEW, liveCount, activeIndex + 1);
  const visible = entries.slice(0, limit);
  return (
    <section className="mb-1" aria-label={project.displayName}>
      <div className="group/project flex h-8 items-center gap-0.5 rounded-lg pr-1 transition-colors duration-100 hover:bg-hover">
        <button
          type="button"
          aria-expanded={!props.collapsed}
          onClick={() => controller.toggleProjectCollapsed(project.cwd)}
          className="flex h-full min-w-0 flex-1 items-center gap-1.5 pl-1.5 text-left"
          title={project.cwd}
        >
          <ChevronRight
            size={13}
            className={cn("shrink-0 text-subtle transition-transform duration-150 ease-out", !props.collapsed && "rotate-90")}
          />
          {props.collapsed ? (
            <Folder size={15} className="shrink-0 text-subtle" />
          ) : (
            <FolderOpen size={15} className="shrink-0 text-subtle" />
          )}
          <span className="truncate text-sm font-medium text-fg">{project.displayName}</span>
          {project.pinned ? <Pin size={11} className="shrink-0 text-subtle" aria-label="Pinned" /> : null}
          {props.collapsed && props.group.attention > 0 ? (
            <span className="mr-1 ml-auto size-1.5 shrink-0 rounded-full bg-warn" aria-label={`${props.group.attention} need you`} />
          ) : props.collapsed && props.group.running > 0 ? (
            <Spinner size={10} className="mr-1 ml-auto text-accent-text" label="Working" />
          ) : null}
        </button>
        <div className="flex shrink-0 items-center opacity-0 transition-opacity duration-100 group-hover/project:opacity-100 focus-within:opacity-100 has-[[data-state=open]]:opacity-100">
          <Tip label={`New thread in ${project.displayName}`}>
            <IconButton size="xs" label={`New thread in ${project.displayName}`} onClick={() => controller.newThread(project.cwd)}>
              <SquarePen size={13} />
            </IconButton>
          </Tip>
          <ProjectMenu project={project} />
        </div>
      </div>
      {props.collapsed ? null : (
        <ul className="flex flex-col gap-px pt-px">
          {visible.map((entry) => (
            <ThreadRow key={entry.session.sessionId} entry={entry} active={entry.session.sessionId === props.activeId} now={props.now} />
          ))}
          {entries.length === 0 ? (
            <li>
              <button
                type="button"
                onClick={() => controller.newThread(project.cwd)}
                className="flex h-7 w-full items-center rounded-lg pl-[30px] text-left text-xs text-subtle hover:bg-hover hover:text-fg"
              >
                Start the first thread
              </button>
            </li>
          ) : null}
          {entries.length > visible.length || (expanded && entries.length > PROJECT_PREVIEW) ? (
            <li>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex h-7 w-full items-center rounded-lg pl-[30px] text-left text-xs text-subtle hover:bg-hover hover:text-fg"
              >
                {expanded ? "Show fewer" : `Show ${entries.length - visible.length} more`}
              </button>
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
});

function StatusSection(props: { label: string; entries: SidebarEntry[]; activeId: string | null; now: number; cap: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const limit = props.cap && !expanded ? STATUS_PREVIEW : props.entries.length;
  return (
    <section className="mb-2" aria-label={props.label}>
      <h3 className="flex h-7 items-center gap-2 px-2 text-xs font-medium text-subtle">
        <span>{props.label}</span>
        <span className="tabular-nums">{props.entries.length}</span>
      </h3>
      <ul className="flex flex-col gap-px">
        {props.entries.slice(0, limit).map((entry) => (
          <ThreadRow
            key={entry.session.sessionId}
            entry={entry}
            active={entry.session.sessionId === props.activeId}
            now={props.now}
            showProject
          />
        ))}
        {props.entries.length > limit ? (
          <li>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="flex h-7 w-full items-center rounded-lg pl-[30px] text-left text-xs text-subtle hover:bg-hover hover:text-fg"
            >
              Show {props.entries.length - limit} more
            </button>
          </li>
        ) : null}
      </ul>
    </section>
  );
}

function metaFor(entry: SidebarEntry, now: number): { text: string; className: string } {
  switch (entry.status) {
    case "approval":
      return { text: "Approve", className: "font-medium text-warn-text" };
    case "input":
      return { text: "Answer", className: "font-medium text-warn-text" };
    case "running":
      return { text: "Working", className: "text-accent-text" };
    case "failed":
      return { text: "Failed", className: "text-danger-text" };
    default:
      return { text: relativeTime(entry.session.activityAt, now), className: "text-subtle" };
  }
}

export const ThreadRow = memo(
  function ThreadRow(props: { entry: SidebarEntry; active: boolean; now: number; showProject?: boolean }) {
    const controller = useController();
    const { session, status } = props.entry;
    const [renaming, setRenaming] = useState(false);
    const meta = metaFor(props.entry, props.now);
    const emphasized = props.active || status === "unread" || isLive(status);
    return (
      <li>
        <div
          className={cn(
            "group/row relative flex items-center gap-2 rounded-lg pr-1 pl-[30px] transition-colors duration-100",
            props.showProject ? "min-h-11 py-1" : "h-8",
            props.active ? "bg-active" : "hover:bg-hover",
          )}
        >
          <span className="absolute top-1/2 left-[10px] flex size-4 -translate-y-1/2 items-center justify-center">
            <StatusGlyph status={status} />
          </span>
          {renaming ? (
            <RenameField
              initial={session.title}
              onDone={(title) => {
                setRenaming(false);
                if (title !== null) {
                  void controller.rename(session.sessionId, title);
                }
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => controller.openThread(session.sessionId)}
              onDoubleClick={() => setRenaming(true)}
              aria-current={props.active ? "page" : undefined}
              title={session.title}
              className="min-w-0 flex-1 text-left outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-accent focus-visible:after:outline"
            >
              <span
                className={cn(
                  "block truncate text-sm",
                  emphasized ? "text-fg" : "text-muted",
                  status === "unread" && "font-medium",
                )}
              >
                {session.title}
              </span>
              {props.showProject ? <span className="block truncate text-xs text-subtle">{basename(session.cwd)}</span> : null}
              <span className="sr-only">{`, ${STATUS_LABEL[status]}`}</span>
            </button>
          )}
          {renaming ? null : (
            <>
              <span
                className={cn(
                  "shrink-0 text-2xs tabular-nums group-focus-within/row:hidden group-hover/row:hidden group-has-[[data-state=open]]/row:hidden",
                  meta.className,
                )}
                aria-hidden="true"
              >
                {meta.text}
              </span>
              <div className="relative z-10 hidden items-center group-focus-within/row:flex group-hover/row:flex group-has-[[data-state=open]]/row:flex">
                <ThreadMenu session={session} onRename={() => setRenaming(true)} />
                <Tip label="Archive">
                  <IconButton size="xs" label="Archive thread" onClick={() => void controller.archive(session.sessionId)}>
                    <Archive size={13} />
                  </IconButton>
                </Tip>
              </div>
            </>
          )}
        </div>
      </li>
    );
  },
  (a, b) => a.entry.session === b.entry.session && a.entry.status === b.entry.status && a.active === b.active && a.now === b.now && a.showProject === b.showProject,
);

function RenameField(props: { initial: string; onDone: (title: string | null) => void }) {
  const done = useRef(false);
  const finish = (value: string | null) => {
    if (!done.current) {
      done.current = true;
      props.onDone(value);
    }
  };
  return (
    <input
      autoFocus
      defaultValue={props.initial}
      aria-label="Thread title"
      onFocus={(e) => e.currentTarget.select()}
      onBlur={(e) => finish(e.currentTarget.value)}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          finish(e.currentTarget.value);
        } else if (e.key === "Escape") {
          finish(null);
        }
      }}
      className="relative z-10 h-6 min-w-0 flex-1 rounded-md bg-raised px-1.5 text-sm text-fg outline-none shadow-[0_0_0_1.5px_var(--accent)]"
    />
  );
}

function ThreadMenu(props: { session: SessionSummary; onRename: () => void }) {
  const controller = useController();
  return (
    <Menu>
      <MenuTrigger asChild>
        <IconButton size="xs" label="Thread actions">
          <Ellipsis size={14} />
        </IconButton>
      </MenuTrigger>
      <MenuContent align="end">
        <MenuItem icon={<Pencil size={14} />} onSelect={props.onRename}>
          Rename
        </MenuItem>
        <MenuItem icon={<Copy size={14} />} onSelect={() => void navigator.clipboard?.writeText(props.session.sessionId)}>
          Copy session ID
        </MenuItem>
        <MenuItem icon={<FolderOpen size={14} />} onSelect={() => void controller.openFolder(props.session.cwd, "files")}>
          {revealLabel()}
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={<Archive size={14} />} onSelect={() => void controller.archive(props.session.sessionId)}>
          Archive thread
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

export function revealLabel(): string {
  if (isMac) {
    return "Reveal in Finder";
  }
  return typeof navigator !== "undefined" && /Win/.test(navigator.platform) ? "Open in File Explorer" : "Open folder";
}

function ProjectMenu(props: { project: ProjectView }) {
  const controller = useController();
  const { project } = props;
  return (
    <Menu>
      <MenuTrigger asChild>
        <IconButton size="xs" label={`${project.displayName} actions`}>
          <Ellipsis size={14} />
        </IconButton>
      </MenuTrigger>
      <MenuContent align="end">
        <MenuItem icon={<SquarePen size={14} />} onSelect={() => controller.newThread(project.cwd)}>
          New thread
        </MenuItem>
        <MenuItem
          icon={project.pinned ? <PinOff size={14} /> : <Pin size={14} />}
          onSelect={() => void controller.togglePin(project.cwd)}
        >
          {project.pinned ? "Unpin" : "Pin to top"}
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={<FolderOpen size={14} />} onSelect={() => void controller.openFolder(project.cwd, "files")}>
          {revealLabel()}
        </MenuItem>
        <MenuItem icon={<Code size={14} />} onSelect={() => void controller.openFolder(project.cwd, "editor")}>
          Open in VS Code
        </MenuItem>
        <MenuItem icon={<Copy size={14} />} onSelect={() => void navigator.clipboard?.writeText(project.cwd)}>
          Copy path
        </MenuItem>
        <MenuItem icon={<RefreshCw size={14} />} onSelect={() => void controller.refreshProject(project.cwd)}>
          Refresh threads
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={<X size={14} />} tone="danger" onSelect={() => void controller.hideProject(project.cwd)}>
          Remove from sidebar
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

function GroupByMenu() {
  const controller = useController();
  const groupBy = useApp((s) => s.prefs.groupBy);
  return (
    <Menu>
      <Tip label="Group threads">
        <MenuTrigger asChild>
          <IconButton size="xs" label="Group threads">
            <ListFilter size={14} />
          </IconButton>
        </MenuTrigger>
      </Tip>
      <MenuContent align="end">
        <MenuRadioGroup value={groupBy} onValueChange={(v) => controller.setGroupBy(v === "status" ? "status" : "project")}>
          <MenuOption value="project" icon={<Folder size={14} />} label="By project" description="Each project with its threads" />
          <MenuOption value="status" icon={<Layers size={14} />} label="By status" description="Needs you, working, ready for review" />
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  );
}

function SidebarFooter() {
  const controller = useController();
  const env = useApp((s) => s.env);
  const connection = useApp((s) => s.connection);
  const discovering = useApp((s) => s.discovering);
  const hostError = useApp((s) => s.hostError);
  const status =
    connection === "lost"
      ? { dot: "bg-warn", text: "Reconnecting to Helicon" }
      : hostError
        ? { dot: "bg-danger", text: "Muse needs attention" }
        : env?.platform === "win32"
          ? { dot: "bg-ok", text: `Muse in WSL (${env.defaultDistro ?? "Ubuntu"})` }
          : { dot: "bg-ok", text: "Muse ready" };
  const detail = hostError ?? (env?.musePath ? `${env.musePath}  |  Helicon ${env.version}` : `Helicon ${env?.version ?? ""}`);
  return (
    <div className="flex h-11 shrink-0 items-center gap-0.5 border-t border-line px-2">
      <Tip label={detail} side="top" align="start">
        <div className="flex min-w-0 flex-1 items-center gap-2 px-1.5 text-xs text-muted" tabIndex={0}>
          <span className={cn("size-1.5 shrink-0 rounded-full", status.dot)} aria-hidden="true" />
          <span className="truncate">{status.text}</span>
        </div>
      </Tip>
      <Tip label="Refresh threads from Muse" side="top">
        <IconButton label="Refresh threads from Muse" onClick={() => void controller.discoverAll()} disabled={discovering}>
          <RefreshCw size={14} className={cn(discovering && "animate-spin")} />
        </IconButton>
      </Tip>
      <ThemeMenu />
    </div>
  );
}

function ThemeMenu() {
  const controller = useController();
  const theme = useApp((s) => s.prefs.theme);
  const icon = theme === "light" ? <Sun size={15} /> : theme === "dark" ? <Moon size={15} /> : <Monitor size={15} />;
  return (
    <Menu>
      <Tip label="Theme" side="top">
        <MenuTrigger asChild>
          <IconButton label="Theme">{icon}</IconButton>
        </MenuTrigger>
      </Tip>
      <MenuContent side="top" align="end" className="min-w-[160px]">
        <MenuRadioGroup value={theme} onValueChange={(v) => controller.setTheme(v === "light" || v === "dark" ? v : "system")}>
          <MenuOption value="system" icon={<Monitor size={14} />} label="System" />
          <MenuOption value="light" icon={<Sun size={14} />} label="Light" />
          <MenuOption value="dark" icon={<Moon size={14} />} label="Dark" />
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  );
}

function ResizeHandle() {
  const controller = useController();
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const handle = event.currentTarget;
    const startX = event.clientX;
    const startWidth = controller.store.get().prefs.sidebarWidth;
    handle.setPointerCapture(event.pointerId);
    document.body.style.cursor = "col-resize";
    const move = (e: globalThis.PointerEvent) => controller.setSidebarWidth(startWidth + e.clientX - startX);
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
      document.body.style.cursor = "";
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  };
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onDoubleClick={() => controller.setSidebarWidth(DEFAULT_SIDEBAR_WIDTH)}
      onKeyDown={(e) => {
        const width = controller.store.get().prefs.sidebarWidth;
        if (e.key === "ArrowLeft") {
          controller.setSidebarWidth(width - 16);
        } else if (e.key === "ArrowRight") {
          controller.setSidebarWidth(width + 16);
        }
      }}
      className="absolute top-0 right-[-3px] z-[var(--z-resize)] h-full w-1.5 cursor-col-resize transition-colors duration-150 hover:bg-accent/35 focus-visible:bg-accent/35 focus-visible:outline-none"
    />
  );
}

function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-2 pt-2" aria-hidden="true">
      {[62, 80, 54, 70, 46, 66].map((w, i) => (
        <div key={i} className="h-3 rounded bg-hover" style={{ width: `${w}%`, marginLeft: i % 3 === 0 ? 0 : 22 }} />
      ))}
    </div>
  );
}

function SidebarEmpty() {
  const controller = useController();
  const discovering = useApp((s) => s.discovering);
  return (
    <div className="px-2 pt-3 text-sm">
      <p className="font-medium text-fg">No projects yet</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Add a folder to start a thread. Threads you ran from the Muse terminal show up here on their own.
      </p>
      <button
        type="button"
        onClick={() => controller.setAddProjectOpen(true)}
        className="mt-3 inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-accent-text hover:bg-hover"
      >
        <FolderPlus size={14} /> Add project
      </button>
      {discovering ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-subtle">
          <Spinner size={10} /> Looking for Muse threads
        </p>
      ) : null}
    </div>
  );
}

export { useSidebarEntries, shallowEqual };
