import { ArrowDownToLine, ArrowLeft, Minus, Pencil, Plus, RefreshCw, RotateCw, Trash2 } from "lucide-react";
import { Switch } from "radix-ui";
import { useEffect, useState, type ReactNode } from "react";
import { useApp, useController, useNow } from "../../app/context.js";
import { useOverlayDragProps } from "../../app/frame.js";
import { modelDisplayName } from "../../model/format.js";
import { providerKey } from "../../model/providers.js";
import { CODE_THEMES, ZOOM_MAX, ZOOM_MIN, type CodeTheme, type GroupBy, type ThemePref } from "../../model/store.js";
import type { ApprovalMode, EndpointSummary, ReasoningEffort } from "../../types.js";
import { LEVELS, MODES } from "../composer/Composer.js";
import { CODE_THEME_LABELS, updateSummary } from "../sidebar/Sidebar.js";
import { Modal } from "../ui/overlays.js";
import { TopBar } from "../chrome.js";
import { Button, IconButton, MOD, cn } from "../ui/primitives.js";

/** A row's control: one choice out of a few. Scrolls sideways when the row is too narrow to wrap. */
function Pick<T extends string | null>(props: {
  value: T;
  options: readonly { value: T; label: string; hint?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex max-w-full min-w-0 items-center gap-1 overflow-x-auto overscroll-x-contain rounded-lg bg-sunken p-0.5 [scrollbar-width:thin]">
      {props.options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          title={option.hint}
          aria-pressed={props.value === option.value}
          onClick={() => props.onChange(option.value)}
          className={cn(
            "h-7 shrink-0 rounded-md px-2.5 text-xs font-medium whitespace-nowrap transition-colors duration-100",
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
      {/* A floor on the label, or a wide row of choices squeezes it to one word per line instead of wrapping. */}
      <div className="min-w-[13rem] flex-1 basis-64">
        <p className="text-sm text-fg">{props.label}</p>
        {props.description ? <p className="mt-0.5 text-xs text-pretty text-muted">{props.description}</p> : null}
      </div>
      {props.children ? <div className="min-w-0 w-full @min-[520px]:w-auto">{props.children}</div> : null}
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

type EndpointForm = { id: string | null; name: string; baseUrl: string; apiKey: string; defaultModel: string };

const BLANK_ENDPOINT_FORM: EndpointForm = { id: null, name: "", baseUrl: "", apiKey: "", defaultModel: "" };

const FIELD =
  "h-9 w-full rounded-lg bg-sunken px-3 text-sm text-fg shadow-[0_0_0_1px_var(--border)] outline-none placeholder:text-subtle focus-visible:shadow-[0_0_0_1px_var(--accent)]";

/** Everything Helicon lets you set, in one place: the menus around the app are shortcuts into this. */
export function SettingsPage() {
  const controller = useController();
  const prefs = useApp((s) => s.prefs);
  const models = useApp((s) => s.models);
  const titleSettings = useApp((s) => s.titleSettings);
  const env = useApp((s) => s.env);
  const updates = useApp((s) => s.updates);
  const bypassAll = useApp((s) => s.bypassAll);
  const armedThreads = useApp((s) => s.bypassThreads.length);
  const endpoints = useApp((s) => s.endpoints);
  const activeEndpointId = useApp((s) => s.activeEndpointId);
  const providerModels = models.filter((model) => model.providerId === activeEndpointId);
  const [confirmBypass, setConfirmBypass] = useState(false);
  const [endpointForm, setEndpointForm] = useState<EndpointForm | null>(null);
  const [deleteEndpointId, setDeleteEndpointId] = useState<string | null>(null);
  const now = useNow(60_000);
  const busy = updates?.status === "checking" || updates?.status === "downloading" || updates?.status === "installing";
  const drag = useOverlayDragProps();
  const collapsed = useApp((s) => s.prefs.sidebarCollapsed);

  useEffect(() => {
    void controller.loadEndpoints();
  }, [controller]);

  const openEndpointForm = (endpoint: EndpointSummary | null) =>
    setEndpointForm(
      endpoint
        ? { id: endpoint.id, name: endpoint.name, baseUrl: endpoint.baseUrl, apiKey: "", defaultModel: endpoint.defaultModel ?? "" }
        : { ...BLANK_ENDPOINT_FORM },
    );

  const saveEndpointForm = async (): Promise<void> => {
    if (!endpointForm) {
      return;
    }
    const saved = await controller.saveEndpoint({
      ...(endpointForm.id ? { id: endpointForm.id } : {}),
      name: endpointForm.name.trim(),
      baseUrl: endpointForm.baseUrl.trim(),
      // A blank key on an edit keeps the stored one: only a key the user typed is sent.
      ...(endpointForm.apiKey.trim() ? { apiKey: endpointForm.apiKey.trim() } : {}),
      defaultModel: endpointForm.defaultModel.trim() || null,
    });
    if (saved) {
      setEndpointForm(null);
    }
  };

  const editing = endpointForm?.id ? (endpoints.find((endpoint) => endpoint.id === endpointForm.id) ?? null) : null;
  const deleting = endpoints.find((endpoint) => endpoint.id === deleteEndpointId) ?? null;

  return (
    <div className="@container flex h-full min-w-0 flex-col">
      {collapsed ? <TopBar /> : null}
      <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
      <header {...drag} className="mx-auto flex w-full max-w-[720px] shrink-0 items-center gap-3 px-4 pt-8 pb-1 @min-[520px]:px-6">
        <Button size="sm" variant="ghost" onClick={() => controller.goBack()}>
          <ArrowLeft size={14} /> Back
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-fg">Settings</h1>
          <p className="text-xs text-muted">Kept on this device. Nothing here changes a thread that is already running.</p>
        </div>
      </header>

      <div className="mx-auto w-full min-w-0 max-w-[720px] px-4 pb-16 @min-[520px]:px-6">
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
          <Row
            label="Zoom"
            description={`How big the whole interface is. ${MOD} plus, ${MOD} minus and ${MOD} 0 adjust it anywhere; the percentage resets it.`}
          >
            <div className="flex items-center gap-1">
              <IconButton label="Zoom out" size="xs" onClick={() => controller.zoomOut()} disabled={prefs.zoom <= ZOOM_MIN}>
                <Minus size={14} />
              </IconButton>
              <button
                type="button"
                title="Reset zoom to 100%"
                onClick={() => controller.resetZoom()}
                className="h-6 min-w-11 rounded-md px-1.5 text-xs text-muted tabular-nums transition-colors duration-100 hover:bg-hover hover:text-fg"
              >
                {Math.round(prefs.zoom * 100)}%
              </button>
              <IconButton label="Zoom in" size="xs" onClick={() => controller.zoomIn()} disabled={prefs.zoom >= ZOOM_MAX}>
                <Plus size={14} />
              </IconButton>
            </div>
          </Row>
          <Row
            label="Session statistics"
            description="Telemetry pills above the composer: turns, speed and token usage for the open thread."
          >
            <Toggle
              checked={prefs.showTelemetry}
              label="Session statistics"
              onChange={(on) => controller.setPrefs({ showTelemetry: on })}
            />
          </Row>
        </Section>

        <Section title="New threads">
          <Row label="Model" description="What a new thread on the default provider starts on. Changing it here leaves running threads alone.">
            {providerModels.length === 0 ? (
              <p className="text-xs text-subtle">No models loaded</p>
            ) : (
              <Pick
                value={prefs.modelByProvider[providerKey(activeEndpointId)] ?? (activeEndpointId === null ? prefs.defaultModelId : null)}
                options={providerModels.map((model) => ({
                  value: model.modelId,
                  // The contributor variants share a display name, so without this the list offers the same
                  // word twice and there is no way to tell which button is which.
                  label: model.contributor ? `${modelDisplayName(model.modelId)} · Contributor` : modelDisplayName(model.modelId),
                  hint: model.contributor ? "Contributor tier: prompts and outputs may be used for product improvement." : undefined,
                }))}
                onChange={(value) => void controller.setModel(value as string, activeEndpointId)}
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

        <Section title="Model endpoints">
          <Row
            label="Default provider"
            description="Where new threads send their model calls. A running thread keeps the provider it was created with."
          >
            <Pick<string | null>
              value={activeEndpointId}
              options={[
                { value: null, label: "Muse — your own login" },
                ...endpoints.map((endpoint) => ({ value: endpoint.id, label: endpoint.name, hint: endpoint.baseUrl })),
              ]}
              onChange={(value) => void controller.activateEndpoint(value)}
            />
          </Row>
          {endpoints.map((endpoint) => (
            <Row
              key={endpoint.id}
              label={endpoint.name}
              description={`${endpoint.baseUrl}${endpoint.hasApiKey ? " · API key saved" : ""}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => openEndpointForm(endpoint)}>
                  <Pencil size={13} /> Edit
                </Button>
                <Button size="sm" variant="secondary" onClick={() => void controller.refreshEndpointModels(endpoint.id)}>
                  <RefreshCw size={13} /> Refresh models
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setDeleteEndpointId(endpoint.id)}>
                  <Trash2 size={13} /> Delete
                </Button>
              </div>
            </Row>
          ))}
          <Row
            label="Add an endpoint"
            description="An OpenAI-compatible gateway serving muse models. Its API key is kept by the Helicon server and never sent here."
          >
            <Button size="sm" variant="secondary" onClick={() => openEndpointForm(null)}>
              <Plus size={13} /> Add endpoint
            </Button>
          </Row>
        </Section>

        <Section title="Threads list">
          <Row label="Group by" description="How the sidebar arranges threads.">
            <Pick value={prefs.groupBy} options={GROUPS} onChange={(value) => controller.setGroupBy(value)} />
          </Row>
        </Section>

        <Section title="Thread titles">
          <Row
            label="Generate titles"
            description="Name new threads with one cheap model call instead of echoing the first prompt, and rename up to 30 recent threads that still echo. The calls run on your Muse Code plan. Off keeps the echo and makes no calls at all."
          >
            {titleSettings ? (
              <Toggle
                checked={titleSettings.enabled}
                label="Generate titles"
                onChange={(on) => void controller.setTitleEnabled(on)}
              />
            ) : (
              <p className="text-xs text-subtle">Loading…</p>
            )}
          </Row>
          {titleSettings?.enabled ? (
            <Row label="Title model" description="Which model writes the titles. Muse default lets the CLI choose.">
              {models.length === 0 ? (
                <p className="text-xs text-subtle">No models loaded</p>
              ) : (
                <Pick<string | null>
                  value={titleSettings.modelId}
                  options={[
                    { value: null, label: "Muse default" },
                    ...models.map((model) => ({
                      value: model.modelId as string | null,
                      label: model.contributor ? `${modelDisplayName(model.modelId)} · Contributor` : modelDisplayName(model.modelId),
                      hint: model.contributor ? "Contributor tier: prompts and outputs may be used for product improvement." : undefined,
                    })),
                  ]}
                  onChange={(value) => void controller.setTitleModel(value)}
                />
              )}
            </Row>
          ) : null}
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

        <Section title="Notifications">
          <Row
            label="Tell me when a thread needs me"
            description="A system notification when a thread asks for approval, asks a question, finishes, fails, or its goal stops moving. Only while this window is in the background."
          >
            <Toggle
              checked={prefs.notifications}
              label="Notifications"
              // Switching on has to ask, and a browser only grants permission from a real press.
              onChange={(on) => (on ? void controller.askToNotify() : controller.setPrefs({ notifications: false }))}
            />
          </Row>
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
          {env?.platform === "win32" ? (
            <Fact
              label="Muse runs"
              value={env.runtime === "native" ? "Natively on Windows" : `In WSL${env.wslAvailable && env.defaultDistro ? ` (${env.defaultDistro})` : ""}`}
            />
          ) : null}
          <Fact label="Muse" value={env?.musePath ?? (env?.museFound ? "Found" : "Not found")} />
          <Fact label="Sessions" value={env?.persistent ? "Kept on disk" : "In memory only"} />
        </Section>
      </div>
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

      <Modal
        open={endpointForm !== null}
        onOpenChange={(open) => (open ? undefined : setEndpointForm(null))}
        title={endpointForm?.id ? "Edit endpoint" : "Add endpoint"}
        description="Muse sends its model calls to this OpenAI-compatible endpoint."
      >
        {endpointForm ? (
          <form
            className="mt-4 flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void saveEndpointForm();
            }}
          >
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
              Name
              <input
                autoFocus
                value={endpointForm.name}
                spellCheck={false}
                autoComplete="off"
                onChange={(event) => setEndpointForm({ ...endpointForm, name: event.currentTarget.value })}
                placeholder="Zen gateway"
                className={FIELD}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
              Base URL
              <input
                value={endpointForm.baseUrl}
                spellCheck={false}
                autoComplete="off"
                onChange={(event) => setEndpointForm({ ...endpointForm, baseUrl: event.currentTarget.value })}
                placeholder="https://opencode.ai/zen/v1"
                className={FIELD}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
              API key
              <input
                type="password"
                value={endpointForm.apiKey}
                autoComplete="new-password"
                onChange={(event) => setEndpointForm({ ...endpointForm, apiKey: event.currentTarget.value })}
                placeholder={editing?.hasApiKey ? "API key saved — leave blank to keep it" : "Optional"}
                className={FIELD}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
              Default model
              {editing && editing.models.length > 0 ? (
                <select
                  value={endpointForm.defaultModel}
                  onChange={(event) => setEndpointForm({ ...endpointForm, defaultModel: event.currentTarget.value })}
                  className={FIELD}
                >
                  <option value="">None</option>
                  {/* A saved default the refreshed list dropped stays offered, so editing cannot quietly change it. */}
                  {[...new Set([...editing.models, endpointForm.defaultModel].filter(Boolean))].map((modelId) => (
                    <option key={modelId} value={modelId}>
                      {modelId}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={endpointForm.defaultModel}
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(event) => setEndpointForm({ ...endpointForm, defaultModel: event.currentTarget.value })}
                  placeholder="muse-spark-1.3"
                  className={FIELD}
                />
              )}
            </label>
            <div className="mt-2 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEndpointForm(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={!endpointForm.name.trim() || !endpointForm.baseUrl.trim()}>
                Save
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal
        open={deleteEndpointId !== null}
        onOpenChange={(open) => (open ? undefined : setDeleteEndpointId(null))}
        title="Delete this endpoint?"
        description={
          deleting
            ? `“${deleting.name}” and its saved API key are removed. If it was the active endpoint, model calls go back to your own Muse login.`
            : undefined
        }
      >
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteEndpointId(null)}>
            Keep it
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (deleteEndpointId) {
                void controller.deleteEndpoint(deleteEndpointId);
              }
              setDeleteEndpointId(null);
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
