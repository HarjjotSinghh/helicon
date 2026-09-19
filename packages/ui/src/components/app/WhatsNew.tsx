import { useEffect, useState } from "react";
import { useApp, useController } from "../../app/context.js";
import { newEntries } from "../../model/changelog.js";
import { Markdown } from "../ui/Markdown.js";
import { Modal } from "../ui/overlays.js";
import { Button } from "../ui/primitives.js";

/**
 * What changed, after the app has updated itself. The notes are built in, so this costs no request
 * and says the same thing offline; nothing is sent anywhere by opening it.
 *
 * It waits for the running version to be known, which only the desktop shell reports, so a browser
 * never shows it. A first run records the version and stays quiet: there is nothing to have missed.
 */
export function WhatsNew() {
  const controller = useController();
  const current = useApp((s) => s.updates?.currentVersion ?? null);
  const seen = useApp((s) => s.prefs.lastSeenVersion);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // A version with nothing to show is recorded straight away, so the notes are not kept waiting
    // for a release that happens to have an entry.
    if (current && seen === null) {
      controller.setPrefs({ lastSeenVersion: current });
    }
  }, [controller, current, seen]);

  const entries = newEntries(seen, current);
  const open = entries.length > 0 && !dismissed;

  const close = () => {
    setDismissed(true);
    if (current) {
      controller.setPrefs({ lastSeenVersion: current });
    }
  };

  if (!open) {
    return null;
  }
  const title = entries.length === 1 ? `What's new in ${entries[0].version}` : `What's new since ${seen}`;
  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title={title}
      description={entries.length === 1 ? undefined : `${entries.length} releases while you were away.`}
      className="w-[min(560px,calc(100dvw-32px))]"
    >
      <div className="mt-4 flex max-h-[min(60dvh,520px)] flex-col gap-6 overflow-y-auto">
        {entries.map((entry) => (
          <section key={entry.version} className="flex flex-col gap-2">
            {entries.length > 1 ? <h3 className="text-[13px] font-semibold text-fg tabular-nums">{entry.version}</h3> : null}
            <Markdown text={entry.body} className="text-[14px] leading-relaxed text-muted" />
          </section>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <Button onClick={close}>Got it</Button>
      </div>
    </Modal>
  );
}
