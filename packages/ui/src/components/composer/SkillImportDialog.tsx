import { useApp, useController } from "../../app/context.js";
import { importSourceName } from "../../model/slash.js";
import type { SkillImportReport } from "../../types.js";
import { Modal } from "../ui/overlays.js";
import { Button } from "../ui/primitives.js";

/** The `/import-skills` preview: what Muse would copy from each agent, and what it would keep aside. */
export function SkillImportDialog(props: { sessionId: string | null }) {
  const controller = useController();
  const pending = useApp((s) => (s.skillImport && s.skillImport.sessionId === props.sessionId ? s.skillImport : null));
  const count = pending?.previews.reduce((sum, preview) => sum + preview.installed.length, 0) ?? 0;
  return (
    <Modal
      open={pending !== null}
      onOpenChange={(next) => (next ? undefined : controller.closeSkillImport())}
      title={count > 0 ? "Import these skills into Muse?" : "Nothing to import yet"}
      description="Muse reads each agent's own skills folder. Nothing is copied until you import."
    >
      <div className="mt-4 flex max-h-[50vh] flex-col gap-4 overflow-auto">
        {pending?.previews.map((preview) => <SourcePreview key={preview.source} preview={preview} />)}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" disabled={pending?.running} onClick={() => controller.closeSkillImport()}>
          {count > 0 ? "Cancel" : "Close"}
        </Button>
        {count > 0 ? (
          <Button variant="primary" loading={pending?.running} onClick={() => void controller.confirmSkillImport()}>
            Import {count} {count === 1 ? "skill" : "skills"}
          </Button>
        ) : null}
      </div>
    </Modal>
  );
}

function SourcePreview(props: { preview: SkillImportReport }) {
  const { preview } = props;
  const name = importSourceName(preview.source);
  return (
    <section aria-label={`From ${name}`}>
      <h3 className="text-sm font-medium text-fg">From {name}</h3>
      {preview.installed.length > 0 ? (
        <ul className="mt-1.5 flex flex-col gap-1">
          {preview.installed.map((id) => (
            <li key={id} className="font-mono text-xs text-fg">
              {id}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs text-muted">No new skills here.</p>
      )}
      {preview.quarantined.length > 0 ? (
        <div className="mt-2">
          <p className="text-xs text-warn-text">Kept aside and not loaded:</p>
          <ul className="mt-1 flex flex-col gap-1">
            {preview.quarantined.map((entry) => (
              <li key={entry.id} className="text-xs text-muted">
                <span className="font-mono text-fg">{entry.id}</span>
                {entry.reasons.length > 0 ? `: ${entry.reasons.join(", ")}` : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {preview.failed.length > 0 ? (
        <div className="mt-2">
          <p className="text-xs text-danger-text">Could not be read:</p>
          <ul className="mt-1 flex flex-col gap-1">
            {preview.failed.map((entry, index) => (
              <li key={`${entry.id ?? "unnamed"}-${index}`} className="text-xs text-muted">
                {entry.id ? <span className="font-mono text-fg">{entry.id}</span> : "A skill"}
                {entry.reason ? `: ${entry.reason}` : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {preview.skipped.length > 0 ? (
        <p className="mt-2 text-xs text-subtle">
          Already in Muse: {preview.skipped.length} {preview.skipped.length === 1 ? "skill" : "skills"}
        </p>
      ) : null}
    </section>
  );
}
