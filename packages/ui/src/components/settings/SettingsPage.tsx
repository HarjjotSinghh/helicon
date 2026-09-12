import { ArrowDownToLine, ArrowLeft, RefreshCw, RotateCw } from "lucide-react";
import { Switch } from "radix-ui";
import { useState, type ReactNode } from "react";
import { useApp, useController, useNow } from "../../app/context.js";
import { modelDisplayName } from "../../model/format.js";
import { CODE_THEMES, type CodeTheme, type GroupBy, type ThemePref } from "../../model/store.js";
import type { ApprovalMode, ReasoningEffort } from "../../types.js";
import { LEVELS, MODES } from "../composer/Composer.js";
import { CODE_THEME_LABELS, updateSummary } from "../sidebar/Sidebar.js";
import { Modal } from "../ui/overlays.js";
import { Button, cn } from "../ui/primitives.js";

/** A row's control: one choice out of a few, laid out as a segmented strip that wraps when it must. */
function Pick<T extends string | null>(props: {
  value: T;
  options: readonly { value: T; label: string; hint?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg bg-sunken p-0.5">
      {props.options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          title={option.hint}
          aria-pressed={props.value === option.value}
          onClick={() => props.onChange(option.value)}
          className={cn(
            "h-7 rounded-md px-2.5 text-xs font-medium transition-colors duration-100",
            props.value === option.value ? "bg-raised text-fg shadow-btn" : "text-muted hover:text-fg",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Toggle(props: { checked: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <Switch.Root
      checked={props.checked}
      onCheckedChange={props.onChange}
      aria-label={props.label}
      className="relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full bg-line-strong outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent data-[state=checked]:bg-accent"
    >
      <Switch.Thumb className="block size-3.5 translate-x-0.5 rounded-full bg-white shadow-[0_1px_2px_oklch(0_0_0/0.3)] transition-transform duration-150 ease-out data-[state=checked]:translate-x-4" />
    </Switch.Root>
  );
}

function Section(props: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-2xs font-semibold tracking-wide text-subtle uppercase">{props.title}</h2>
      <div className="overflow-hidden rounded-2xl bg-raised shadow-card">{props.children}</div>
    </section>
  );
}

function Row(props: { label: string; description?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-t border-line px-4 py-3 first:border-t-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-fg">{props.label}</p>
        {props.description ? <p className="mt-0.5 text-xs text-pretty text-muted">{props.description}</p> : null}
      </div>
      {props.children ? <div className="shrink-0">{props.children}</div> : null}
    </div>
  );
}

/** A fact about the install rather than a setting: shown so the answer is here and not in a tooltip. */
function Fact(props: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line px-4 py-2.5 first:border-t-0">
      <p className="text-sm text-muted">{props.label}</p>
      <p className="min-w-0 font-mono text-xs break-all text-fg">{props.value}</p>
    </div>
  );
}

const THEMES: readonly { value: ThemePref; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const GROUPS: readonly { value: GroupBy; label: string }[] = [
  { value: "project", label: "Project" },
  { value: "status", label: "Status" },
];

/** Everything Helicon lets you set, in one place: the menus around the app are shortcuts into this. */
export function SettingsPage() {
  const controller = useController();
  const prefs = useApp((s) => s.prefs);
  const models = useApp((s) => s.models);
  const env = useApp((s) => s.env);
  const updates = useApp((s) => s.updates);
  const bypassAll = useApp((s) => s.bypassAll);
  const armedThreads = useApp((s) => s.bypassThreads.length);
  const [confirmBypass, setConfirmBypass] = useState(false);
  const now = useNow(60_000);
  const busy = updates?.status === "checking" || updates?.status === "downloading" || updates?.status === "installing";

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="mx-auto flex w-full max-w-[720px] shrink-0 items-center gap-3 px-6 pt-8 pb-1">
        <Button size="sm" variant="ghost" onClick={() => controller.navigate({ kind: "home" })}>
          <ArrowLeft size={14} /> Back
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-fg">Settings</h1>
          <p className="text-xs text-muted">Kept on this device. Nothing here changes a thread that is already running.</p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[720px] px-6 pb-16">
        <Section title="Appearance">
          <Row label="Theme" description="Light, dark, or whatever this device is set to.">
            <Pick value={prefs.theme} options={THEMES} onChange={(value) => controller.setTheme(value)} />
          </Row>
          <Row label="Code" description="Colours for code and diffs, independent of the app's own theme.">
            <Pick
              value={prefs.codeTheme}
              options={CODE_THEMES.map((name) => ({ value: name as CodeTheme, label: CODE_THEME_LABELS[name] }))}
              onChange={(value) => controller.setCodeTheme(value)}
            />
          </Row>
        </Section>

        <Section title="New threads">
          <Row label="Model" description="What a new thread starts on. Changing it here leaves running threads alone.">
            {models.length === 0 ? (
              <p className="text-xs text-subtle">No models loaded</p>
            ) : (
              <Pick
                value={prefs.defaultModelId}
                options={models.map((model) => ({
                  value: model.modelId,
                  label: modelDisplayName(model.modelId),
                  hint: model.contributor ? "Contributor tier: prompts and outputs may be used for product improvement." : undefined,
                }))}
                onChange={(value) => void controller.setModel(value as string)}
              />
            )}
          </Row>
          <Row label="Permissions" description="What Muse may do before it asks you.">
            <Pick
              value={prefs.defaultMode}
              options={MODES.map((mode) => ({ value: mode.value as ApprovalMode, label: mode.label, hint: mode.description }))}
              onChange={(value) => void controller.setMode(value as ApprovalMode)}
            />
          </Row>
          <Row label="Reasoning effort" description="How long the model thinks before answering. Auto lets Muse choose per turn.">
            <Pick<ReasoningEffort | null>
              value={prefs.effort}
              options={[
                { value: null, label: "Auto", hint: "Muse picks the effort for each turn" },
                ...LEVELS.map((level) => ({ value: level.value, label: level.label, hint: level.description })),
              ]}
              onChange={(value) => controller.setEffort(value)}
            />
          </Row>
        </Section>

        <Section title="Threads list">
          <Row label="Group by" description="How the sidebar arranges threads.">
            <Pick value={prefs.groupBy} options={GROUPS} onChange={(value) => controller.setGroupBy(value)} />
          </Row>
        </Section>

        <Section title="Approvals">
          <Row
            label="Answer approvals for me"
            description={
              bypassAll
                ? "Every request is allowed once, in every thread, without showing you the command. Off when Helicon closes."
                : "Muse asks whenever it cannot resolve a command, whatever its permission mode. This answers those for you, until Helicon closes."
            }
          >
            <Toggle
              checked={bypassAll}
              label="Answer approvals for me"
              onChange={(on) => (on ? setConfirmBypass(true) : controller.setBypassAll(false))}
            />
          </Row>
          {armedThreads > 0 ? (
            <Row label={`${armedThreads} thread${armedThreads === 1 ? "" : "s"} answering on their own`} description="Armed from an approval card.">
              <Button size="sm" variant="secondary" onClick={() => controller.clearThreadBypass()}>
                Ask again in all threads
              </Button>
            </Row>
          ) : null}
        </Section>

        {updates ? (
          <Section title="Updates">
            <Row label={`Helicon ${updates.currentVersion ?? ""}`} description={updateSummary(updates, prefs.autoUpdate, prefs.updatesPaused, now)}>
              <div className="flex flex-wrap items-center gap-2">
                {updates.status === "ready" ? (
                  <Button size="sm" variant="primary" onClick={() => controller.restartToUpdate()}>
                    <RotateCw size={13} /> Restart to update
                  </Button>
                ) : null}
                {updates.status === "available" ? (
                  <Button size="sm" variant="secondary" onClick={() => controller.downloadUpdate()}>
                    <ArrowDownToLine size={13} /> Download
                  </Button>
                ) : null}
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => controller.checkForUpdates()}>
                  <RefreshCw size={13} className={cn(updates.status === "checking" && "animate-spin")} /> Check now
                </Button>
              </div>
            </Row>
            {updates.error ? <Row label="Last error" description={updates.error} /> : null}
            <Row label="Automatic updates" description="Download new versions in the background and install them when Helicon closes.">
              <Toggle checked={prefs.autoUpdate} label="Automatic updates" onChange={(on) => controller.setAutoUpdate(on)} />
            </Row>
            <Row label="Pause updates" description="No checking, downloading or installing until you resume.">
              <Toggle checked={prefs.updatesPaused} label="Pause updates" onChange={(on) => controller.setUpdatesPaused(on)} />
            </Row>
          </Section>
        ) : null}

        <Section title="Environment">
          <Fact label="Helicon" value={env?.version ?? "Unknown"} />
          <Fact label="Platform" value={env?.platform ?? "Unknown"} />
          {env?.platform === "win32" ? <Fact label="WSL" value={env.wslAvailable ? (env.defaultDistro ?? "Available") : "Not available"} /> : null}
          <Fact label="Muse" value={env?.musePath ?? (env?.museFound ? "Found" : "Not found")} />
          <Fact label="Sessions" value={env?.persistent ? "Kept on disk" : "In memory only"} />
        </Section>
      </div>

      <Modal
        open={confirmBypass}
        onOpenChange={setConfirmBypass}
        title="Answer approvals for you?"
        description="Every approval Muse raises, in any thread, is allowed once without showing you the command first. Muse asks about the commands it could not resolve, so these are the ones nothing else has checked. This lasts until you close Helicon."
      >
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmBypass(false)}>
            Keep asking
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setConfirmBypass(false);
              controller.setBypassAll(true);
            }}
          >
            Answer them for me
          </Button>
        </div>
      </Modal>
    </div>
  );
}
