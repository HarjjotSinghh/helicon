import { CaretRightIcon, PencilSimpleLineIcon } from "../ui/icons";
import { useMemo } from "react";
import { useApp, useController } from "../../app/context";
import { basename } from "../../model/format";
import { fileTarget } from "../../model/files";
import { cn } from "../ui/primitives";
import { collectFileChanges, DiffCount } from "./items";

/** The folder part of a path, without the file name; "" at the top level. */
function dirname(path: string): string {
  const cut = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return cut > 0 ? path.slice(0, cut) : "";
}

/**
 * Every file the thread has edited, above the composer: how many, with line counts per file, and
 * a click opens the file (in the editor when Helicon runs inside one, else in the file viewer).
 */
export function ChangedFiles(props: { sessionId: string }) {
  const controller = useController();
  const cwd = useApp((s) => s.sessions[props.sessionId]?.cwd ?? null);
  const fold = useApp((s) => s.threads[props.sessionId]?.fold ?? null);
  const key = `files:${props.sessionId}`;
  const open = useApp((s) => !s.prefs.collapsedCards.includes(key));
  const files = useMemo(() => (fold ? collectFileChanges(fold.order.map((id) => fold.items[id]).filter((item) => item !== undefined)) : []), [fold]);
  if (files.length === 0) {
    return null;
  }
  const added = files.reduce((sum, f) => sum + f.added, 0);
  const removed = files.reduce((sum, f) => sum + f.removed, 0);
  const listId = `changed-files-${props.sessionId}`;
  return (
    <section aria-label="Files changed in this thread" className="rounded-xl bg-raised shadow-card">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => controller.setCardOpen(key, !open)}
        className="flex h-8 w-full items-center gap-1.5 rounded-xl px-2.5 text-left text-xs text-muted transition-colors duration-100 hover:text-fg"
      >
        <CaretRightIcon size={11} className={cn("shrink-0 transition-transform duration-150 motion-reduce:transition-none", open && "rotate-90")} />
        <span className="font-medium text-fg">{files.length === 1 ? "1 file changed" : `${files.length} files changed`}</span>
        <DiffCount added={added} removed={removed} />
      </button>
      {open ? (
        <ul id={listId} className="max-h-40 overflow-y-auto px-1 pb-1">
          {files.map((file) => {
            const target = cwd ? fileTarget(file.path, cwd) : null;
            const path = target?.path ?? file.path;
            const dir = dirname(path);
            return (
              <li key={file.path}>
                <button
                  type="button"
                  title={`Open ${path}`}
                  onClick={() => controller.openFile(props.sessionId, path)}
                  className="flex h-7 w-full items-center gap-2 rounded-lg px-1.5 text-left transition-colors duration-100 hover:bg-hover"
                >
                  <PencilSimpleLineIcon size={12} className="shrink-0 text-subtle" />
                  <span className="shrink-0 font-mono text-[11.5px] text-fg">{basename(path)}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-2xs text-subtle">{dir}</span>
                  <DiffCount added={file.added} removed={file.removed} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
