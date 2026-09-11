import {
  ArrowUp,
  Brain,
  ChevronDown,
  CircleHelp,
  Cpu,
  Folder,
  GitBranch,
  Lock,
  Minimize2,
  Shield,
  ShieldAlert,
  ShieldQuestion,
  Square,
} from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Popover, Slider, Switch } from "radix-ui";
import { shallowEqual, useApp, useController } from "../../app/context.js";
import { useSampled } from "../../app/sampled.js";
import { basename, formatDuration, formatSpeed, formatTokens, modelDisplayName } from "../../model/format.js";
import { lastTurnSpeed, streamingSpeed } from "../../model/usage.js";
import type { ApprovalMode, ReasoningEffort } from "../../types.js";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuOption, MenuRadioGroup, MenuSeparator, MenuTrigger, Modal, Tip } from "../ui/overlays.js";
import { Button, IconButton, MOD, Spinner, cn } from "../ui/primitives.js";
import { PixelFlow } from "../ui/PixelFlow.js";
import { ContextMeter } from "./ContextPanel.js";
import { SwapIcon } from "../ui/sourced.js";

const DRAFT_PREFIX = "helicon.draft.";

function readDraft(key: string): string {
  try {
    return window.localStorage.getItem(DRAFT_PREFIX + key) ?? "";
  } catch {
    return "";
  }
}

/** A composer draft that survives switching threads and reloads. */
function useDraft(key: string): [string, (value: string) => void] {
  const [state, setState] = useState(() => ({ key, value: readDraft(key) }));
  const value = state.key === key ? state.value : readDraft(key);
  if (state.key !== key) {
    setState({ key, value });
  }
  const set = useCallback(
    (next: string) => {
      setState({ key, value: next });
      try {
        if (next) {
          window.localStorage.setItem(DRAFT_PREFIX + key, next);
        } else {
          window.localStorage.removeItem(DRAFT_PREFIX + key);
        }
      } catch {
        /* drafts are best effort */
      }
    },
    [key],
  );
  return [value, set];
}

export interface ComposerProps {
  sessionId: string | null;
  cwd: string | null;
  running: boolean;
  readOnly: boolean;
  variant: "thread" | "home";
  autoFocus?: boolean;
}

export function Composer(props: ComposerProps) {
  const controller = useController();
  const draftKey = props.sessionId ?? `new:${props.cwd ?? ""}`;
  const [text, setText] = useDraft(draftKey);
  // A prompt that failed to send from another composer (the new-thread screen) comes back here.
  const handoff = useApp((s) => (s.draftHandoff?.key === draftKey ? s.draftHandoff : null));
  useEffect(() => {
    if (handoff) {
      const handed = controller.takeDraftHandoff(draftKey);
      if (handed !== null) {
        setText(handed);
      }
    }
  }, [handoff, draftKey, controller, setText]);
  const ref = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const starting = useApp((s) => Boolean(s.busy["start"]));
  const stopping = useApp((s) => (props.sessionId ? Boolean(s.busy[`stop:${props.sessionId}`]) : false));
  const hasText = text.trim().length > 0;
  const showStop = props.running && Boolean(props.sessionId) && !hasText;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, Math.round(window.innerHeight * 0.4))}px`;
  }, [text]);

  useEffect(() => {
    if (props.autoFocus && !props.readOnly) {
      ref.current?.focus({ preventScroll: true });
    }
  }, [props.autoFocus, props.readOnly, props.sessionId, props.cwd]);

  const submit = async (steer: boolean) => {
    if (!hasText || props.readOnly || starting) {
      return;
    }
    const value = text;
    setText("");
    const sent = await controller.send(value, { steer });
    if (!sent) {
      setText(value);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) {
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit(props.running && (event.metaKey || event.ctrlKey));
    } else if (event.key === "Escape" && props.running && !hasText && props.sessionId) {
      event.preventDefault();
      void controller.stop(props.sessionId);
    }
  };

  const placeholder = props.readOnly
    ? "Read-only while another Muse session has this thread open"
    : props.running
      ? `Queue a follow-up, or press ${MOD}+Enter to add it to this turn`
      : props.variant === "home"
        ? "Describe a change, a fix, or a question about the code. Use @path to point at files."
        : "Reply, or ask for the next change";

  return (
    <div
      className={cn(
        "relative rounded-[18px] bg-raised shadow-[0_0_0_1px_var(--border-strong),0_1px_2px_oklch(0_0_0/0.05)] transition-shadow duration-150 ease-out focus-within:shadow-[0_0_0_1px_color-mix(in_oklch,var(--fg)_30%,transparent),0_2px_8px_-2px_oklch(0_0_0/0.12)]",
        props.readOnly && "opacity-75",
      )}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          event.preventDefault();
          ref.current?.focus();
        }
      }}
    >
      <label htmlFor={id} className="sr-only">
        Message Muse
      </label>
      <textarea
        id={id}
        ref={ref}
        value={text}
        rows={props.variant === "home" ? 3 : 1}
        disabled={props.readOnly}
        placeholder={placeholder}
        spellCheck
        onChange={(event) => setText(event.currentTarget.value)}
        onKeyDown={onKeyDown}
        className="block max-h-[40vh] min-h-[52px] w-full resize-none bg-transparent px-4 pt-3.5 pb-1.5 text-md leading-relaxed text-fg outline-none placeholder:text-subtle focus-visible:outline-none disabled:cursor-not-allowed"
      />
      <div className="flex items-center gap-0.5 px-2 pb-2">
        <ModelPicker sessionId={props.sessionId} />
        <EffortPicker />
        <AccessPicker sessionId={props.sessionId} />
        <span className="min-w-2 flex-1" />
        {props.sessionId ? <SpeedReadout sessionId={props.sessionId} /> : null}
        {props.sessionId ? <ContextMeter sessionId={props.sessionId} /> : null}
        {props.running && props.sessionId && hasText ? (
          <Tip label="Stop the turn" shortcut={["Esc"]}>
            <IconButton size="md" label="Stop the turn" disabled={stopping} onClick={() => void controller.stop(props.sessionId as string)}>
              <Square size={11} className="fill-current" />
            </IconButton>
          </Tip>
        ) : null}
        <Tip label={showStop ? "Stop the turn" : props.running ? "Queue message" : "Send"} shortcut={[showStop ? "Esc" : "Enter"]}>
          <button
            type="button"
            aria-label={showStop ? "Stop the turn" : props.running ? "Queue message" : "Send message"}
            disabled={showStop ? stopping : !hasText || props.readOnly || starting}
            onClick={() => (showStop ? void controller.stop(props.sessionId as string) : void submit(false))}
            className={cn(
              "ml-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-[transform,background-color,color] duration-150 active:scale-95",
              showStop ? "bg-inverse text-inverse-fg" : "bg-accent text-accent-fg hover:bg-accent-hover disabled:bg-active disabled:text-subtle",
            )}
          >
            <SwapIcon value={starting || stopping ? "busy" : showStop ? "stop" : "send"}>
              {starting || stopping ? (
                <Spinner size={13} />
              ) : showStop ? (
                <Square size={11} className="fill-current" />
              ) : (
                <ArrowUp size={16} strokeWidth={2.25} />
              )}
            </SwapIcon>
          </button>
        </Tip>
      </div>
    </div>
  );
}

const ToolbarTrigger = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { icon: ReactNode; label: ReactNode; tone?: "warn" }
>(function ToolbarTrigger({ icon, label, tone, className, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      {...rest}
      className={cn(
        "inline-flex h-7 max-w-[240px] min-w-0 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted transition-colors duration-100 hover:bg-hover hover:text-fg data-[state=open]:bg-hover data-[state=open]:text-fg",
        tone === "warn" && "text-warn-text hover:text-warn-text",
        className,
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex min-w-0 items-center truncate">{label}</span>
      <ChevronDown size={12} className="shrink-0 opacity-60" />
    </button>
  );
});

/** Marks contributor-tier models. In menus the option's description explains it; elsewhere a tooltip does. */
function ContributorBadge(props: { tip?: boolean }) {
  const badge = <span className="shrink-0 rounded-[5px] bg-warn-soft px-1 py-px text-2xs font-medium text-warn-text">Contributor</span>;
  return props.tip ? <Tip label="Your chats may be used to improve Meta's products">{badge}</Tip> : badge;
}

function ModelPicker(props: { sessionId: string | null }) {
  const controller = useController();
  const models = useApp((s) => s.models);
  const sessionModel = useApp((s) =>
    props.sessionId ? (s.threads[props.sessionId]?.fold.meta.modelId ?? s.sessions[props.sessionId]?.modelId ?? null) : null,
  );
  const preferred = useApp((s) => s.prefs.defaultModelId);
  const current = props.sessionId ? sessionModel : (preferred ?? models.find((m) => m.isDefault)?.modelId ?? null);
  const model = models.find((m) => m.modelId === current);
  const contributor = model?.contributor ?? /contributor/i.test(current ?? "");
  return (
    <Menu>
      <MenuTrigger asChild>
        <ToolbarTrigger
          aria-label={`Model: ${modelDisplayName(current)}`}
          icon={<Cpu size={13} />}
          label={
            <>
              <span className="truncate">{modelDisplayName(current)}</span>
              {contributor ? (
                <span className="ml-1.5">
                  <ContributorBadge tip />
                </span>
              ) : null}
            </>
          }
        />
      </MenuTrigger>
      <MenuContent side="top" className="w-[330px]">
        <MenuLabel>Model</MenuLabel>
        {models.length === 0 ? (
          <p className="px-2 pb-2 text-xs text-muted">The model list loads once Muse is running.</p>
        ) : (
          <MenuRadioGroup value={current ?? ""} onValueChange={(value) => void controller.setModel(value)}>
            {models.map((m) => (
              <MenuOption
                key={m.modelId}
                value={m.modelId}
                label={modelDisplayName(m.modelId)}
                badge={m.contributor ? <ContributorBadge /> : null}
                description={
                  m.contributor
                    ? "Prompts and outputs may be used to improve Meta's products."
                    : m.contextLimit
                      ? `${formatTokens(m.contextLimit)} token context`
                      : undefined
                }
              />
            ))}
          </MenuRadioGroup>
        )}
      </MenuContent>
    </Menu>
  );
}

/** Effort levels on the faster-to-smarter scale. Auto sits outside it: Muse picks per turn. */
const LEVELS: { value: ReasoningEffort; label: string; description: string }[] = [
  { value: "none", label: "Off", description: "Answers right away, without reasoning" },
  { value: "minimal", label: "Minimal", description: "A quick think before answering" },
  { value: "low", label: "Low", description: "Light reasoning for simple changes" },
  { value: "medium", label: "Medium", description: "Balanced speed and depth" },
  { value: "high", label: "High", description: "Thinks harder problems through" },
  { value: "xhigh", label: "Extra high", description: "Deep reasoning for tricky work" },
  { value: "ultra", label: "Ultra", description: "The slowest and most thorough" },
];
const TOP = LEVELS.length - 1;
// Where the slider rests while Auto is on and nothing was picked yet: Medium.
const RESTING = 3;

/** Reasoning effort as a stepped slider in a popover, after the Claude desktop effort control. */
function EffortPicker() {
  const controller = useController();
  const effort = useApp((s) => s.prefs.effort);
  const [resting, setResting] = useState(RESTING);
  const thumb = useRef<HTMLSpanElement>(null);
  const switchId = useId();
  const picked = LEVELS.findIndex((l) => l.value === effort);
  const auto = picked < 0;
  const position = auto ? resting : picked;
  const label = auto ? "Auto" : (LEVELS[picked]?.label ?? "Auto");
  const ultra = !auto && picked === TOP;
  const choose = (index: number) => {
    const level = LEVELS[index];
    if (level) {
      setResting(index);
      controller.setEffort(level.value);
    }
  };
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <ToolbarTrigger aria-label={`Reasoning effort: ${label}`} icon={<Brain size={13} />} label={label} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={6}
          collisionPadding={8}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            thumb.current?.focus();
          }}
          className="pop z-[var(--z-dropdown)] w-[300px] max-w-[calc(100vw-16px)] rounded-xl bg-raised p-3.5 text-fg shadow-pop outline-none"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">Effort</span>
            <span className={cn("text-sm font-semibold", !auto && picked === TOP ? "text-accent-text" : "text-fg")}>{label}</span>
            <span className="flex-1" />
            <Tip label="Higher effort thinks longer for more thorough answers, but each turn takes more time.">
              <button
                type="button"
                aria-label="What effort does"
                className="-m-1 rounded-full p-1 text-subtle transition-colors duration-100 hover:text-fg"
              >
                <CircleHelp size={15} />
              </button>
            </Tip>
          </div>
          <div className="mt-4 flex justify-between text-xs text-subtle">
            <span>Faster</span>
            <span>Smarter</span>
          </div>
          <Slider.Root
            min={0}
            max={TOP}
            step={1}
            value={[position]}
            onValueChange={([index]) => {
              if (index !== undefined) {
                choose(index);
              }
            }}
            aria-label="Reasoning effort"
            className={cn("effort-slider relative mt-2 flex h-8 touch-none items-center select-none", auto && "opacity-60")}
          >
            <Slider.Track className="relative h-full grow overflow-hidden rounded-lg bg-active">
              <Slider.Range className={cn("effort-range absolute h-full overflow-hidden", ultra ? "bg-accent-soft" : "bg-fg/15")}>
                {ultra ? <PixelFlow className="text-accent-text" /> : null}
              </Slider.Range>
              {/* One dot per level, inset by half the thumb so each sits exactly where the thumb stops. */}
              {ultra ? null : (
                <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-[9px] left-[9px]">
                  {LEVELS.map((level, index) => (
                    <span
                      key={level.value}
                      className="absolute top-1/2 size-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg/30"
                      style={{ left: `${(index / TOP) * 100}%` }}
                    />
                  ))}
                </span>
              )}
            </Slider.Track>
            <Slider.Thumb
              ref={thumb}
              aria-valuetext={LEVELS[position]?.label}
              className="block h-6 w-[18px] rounded-md bg-white shadow-[0_0_0_1px_oklch(0_0_0/0.08),0_1px_3px_oklch(0_0_0/0.3)] outline-none transition-transform duration-100 ease-out focus-visible:ring-2 focus-visible:ring-accent active:scale-95"
            />
          </Slider.Root>
          <p className={cn("mt-2 text-xs", auto ? "text-subtle" : "text-muted")}>
            {auto ? "Muse picks the effort for each turn" : LEVELS[position]?.description}
          </p>
          <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
            <label htmlFor={switchId} className="min-w-0 flex-1 cursor-default text-sm text-fg">
              Let Muse decide
            </label>
            <Switch.Root
              id={switchId}
              checked={auto}
              onCheckedChange={(on) => controller.setEffort(on ? null : (LEVELS[position]?.value ?? "medium"))}
              className="relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full bg-line-strong outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent data-[state=checked]:bg-accent"
            >
              <Switch.Thumb className="block size-3.5 translate-x-0.5 rounded-full bg-white shadow-[0_1px_2px_oklch(0_0_0/0.3)] transition-transform duration-150 ease-out data-[state=checked]:translate-x-4" />
            </Switch.Root>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

const MODES: { value: ApprovalMode; label: string; description: string; icon: ReactNode }[] = [
  { value: "onRequest", label: "Ask first", description: "Muse asks before anything that needs approval.", icon: <Shield size={14} /> },
  {
    value: "promptUnmatched",
    label: "Ask for unlisted",
    description: "Commands your rules allow just run; anything else asks.",
    icon: <ShieldQuestion size={14} />,
  },
  {
    value: "denyUnmatched",
    label: "Deny unlisted",
    description: "Commands your rules allow just run; anything else is refused.",
    icon: <Lock size={14} />,
  },
  {
    value: "allowAll",
    label: "Full access",
    description: "Every tool runs without asking. Only for sandboxes.",
    icon: <ShieldAlert size={14} />,
  },
];

function AccessPicker(props: { sessionId: string | null }) {
  const controller = useController();
  const preferred = useApp((s) => s.prefs.defaultMode);
  const threadMode = useApp((s) => (props.sessionId ? (s.threads[props.sessionId]?.fold.meta.approvalMode ?? null) : null));
  const current = (props.sessionId ? threadMode : null) ?? preferred;
  const mode = MODES.find((m) => m.value === current) ?? MODES[0];
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <Menu>
        <MenuTrigger asChild>
          <ToolbarTrigger
            aria-label={`Permissions: ${mode?.label}`}
            icon={mode?.icon}
            label={mode?.label}
            tone={current === "allowAll" ? "warn" : undefined}
          />
        </MenuTrigger>
        <MenuContent side="top" className="w-[300px]">
          <MenuLabel>Permissions</MenuLabel>
          <MenuRadioGroup
            value={current}
            onValueChange={(value) => {
              if (value === "allowAll") {
                setConfirming(true);
              } else {
                void controller.setMode(value as ApprovalMode);
              }
            }}
          >
            {MODES.map((m) => (
              <MenuOption key={m.value} value={m.value} icon={m.icon} label={m.label} description={m.description} />
            ))}
          </MenuRadioGroup>
        </MenuContent>
      </Menu>
      <Modal
        open={confirming}
        onOpenChange={setConfirming}
        title="Give Muse full access?"
        description="Every tool call, including shell commands and file writes, will run without asking you first. Use this only in a disposable environment."
      >
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirming(false)}>
            Keep asking
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setConfirming(false);
              void controller.setMode("allowAll");
            }}
          >
            Allow full access
          </Button>
        </div>
      </Modal>
    </>
  );
}

/** Output speed beside the context ring: an estimate while text streams, else the last turn's measured speed. */
function SpeedReadout(props: { sessionId: string }) {
  const controller = useController();
  const running = useApp((s) => Boolean(s.threads[props.sessionId]?.fold.activeTurnId));
  const last = useApp((s) => {
    const fold = s.threads[props.sessionId]?.fold;
    const speed = fold ? lastTurnSpeed(fold) : null;
    return speed ? { tps: speed.tokensPerSecond, tokens: speed.outputTokens, ms: speed.generationMs } : null;
  }, shallowEqual);
  const live = useSampled(() => {
    const fold = controller.store.get().threads[props.sessionId]?.fold;
    return fold?.activeTurnId ? streamingSpeed(fold.turns[fold.activeTurnId]) : null;
  }, running);
  if (running && live !== null) {
    return (
      <Tip label="Estimated from the text streaming now">
        <span tabIndex={0} className="shrink-0 px-1 text-2xs text-subtle tabular-nums">
          ~{formatSpeed(live)}
        </span>
      </Tip>
    );
  }
  if (!last) {
    return null;
  }
  return (
    <Tip label={`Last turn: ${formatTokens(last.tokens)} output tokens over ${formatDuration(last.ms)} of model calls`}>
      <span tabIndex={0} className="shrink-0 px-1 text-2xs text-subtle tabular-nums">
        {formatSpeed(last.tps)}
      </span>
    </Tip>
  );
}

export function ComposerFooter(props: { cwd: string | null; branch: string | null; running: boolean }) {
  return (
    <div className="flex h-8 items-center gap-3 px-2 text-xs text-subtle">
      {props.cwd ? (
        <Tip label={props.cwd} side="top" align="start">
          <span className="flex min-w-0 items-center gap-1.5" tabIndex={0}>
            <Folder size={12} className="shrink-0" />
            <span className="truncate">{basename(props.cwd)}</span>
          </span>
        </Tip>
      ) : null}
      {props.branch ? (
        <span className="flex min-w-0 items-center gap-1.5">
          <GitBranch size={12} className="shrink-0" />
          <span className="truncate font-mono text-2xs">{props.branch}</span>
        </span>
      ) : null}
      <span className="flex-1" />
      <span className="hidden truncate md:inline">
        {props.running
          ? `Enter queues, ${MOD}+Enter adds to this turn, Esc stops`
          : "Enter to send, Shift+Enter for a new line"}
      </span>
    </div>
  );
}
