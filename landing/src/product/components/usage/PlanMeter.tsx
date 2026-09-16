import { Gauge } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useApp, useController, useNow } from "../../app/context";
import { relativeTime } from "../../model/format";
import { planView, type PlanTone, type PlanView } from "../../model/plan";
import { Tip } from "../ui/overlays";
import { cn } from "../ui/primitives";

const FILL: Record<PlanTone, string> = {
  ok: "bg-accent",
  warn: "bg-warn",
  danger: "bg-danger",
};

const TEXT: Record<PlanTone, string> = {
  ok: "text-muted",
  warn: "text-warn-text",
  danger: "text-danger-text",
};

function usePlan(): PlanView | null {
  const usage = useApp((s) => s.planUsage);
  // A minute is fine for a countdown measured in hours, and it keeps an idle sidebar still.
  const now = useNow(60_000, usage !== null);
  return useMemo(() => planView(usage, now), [usage, now]);
}

/**
 * What the Muse Code plan has left, as Muse itself last reported it: the rolling window and the weekly cap. This is
 * the real allowance, unlike the usage page's cost, which prices the same work at API rates.
 */
export function PlanMeter() {
  const controller = useController();
  const view = usePlan();
  const now = useNow(60_000, view !== null);
  useEffect(() => {
    void controller.loadPlanUsage();
  }, [controller]);
  if (!view) {
    return (
      <section aria-label="Plan usage" className="rounded-2xl bg-raised px-4 py-3.5 shadow-card">
        <div className="flex items-center gap-2 text-sm font-medium text-fg">
          <Gauge size={15} className="text-subtle" /> Plan usage
        </div>
        <p className="mt-1 text-xs text-pretty text-muted">
          Muse reports your plan's allowance with each model call. Send a prompt in any thread and it shows up here.
        </p>
      </section>
    );
  }
  return (
    <section aria-label="Plan usage" className="rounded-2xl bg-raised px-4 py-3.5 shadow-card">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Gauge size={15} className="shrink-0 text-subtle" />
        <h2 className="text-sm font-medium text-fg">Plan usage</h2>
        {view.tier ? <span className="rounded-md bg-active px-1.5 py-px text-2xs font-medium text-muted">{view.tier}</span> : null}
        <span className="flex-1" />
        <span className="text-2xs text-subtle">{updatedLabel(view, now)}</span>
      </div>
      <div className="mt-3 grid gap-3 @min-[520px]:grid-cols-2">
        {view.rows.map((row) => (
          <div key={row.key} className="min-w-0">
            <div className="flex items-baseline gap-2 text-xs">
              <span className="text-muted">{row.label}</span>
              <span className="flex-1" />
              <span className={cn("font-medium tabular-nums", TEXT[row.tone])}>{row.percent}% used</span>
            </div>
            <div
              role="progressbar"
              aria-label={`${row.label} used`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={row.percent}
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-active"
            >
              <div className={cn("h-full rounded-full transition-[width] duration-300 ease-out", FILL[row.tone])} style={{ width: `${row.percent}%` }} />
            </div>
            <p className="mt-1 text-2xs text-subtle tabular-nums">{row.resets}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function updatedLabel(view: PlanView, now: number): string {
  const age = relativeTime(new Date(view.observedAtMs).toISOString(), now);
  if (age === "now") {
    return "Updated just now";
  }
  return `${view.stale ? "Last reported" : "Updated"} ${age} ago`;
}

/** The rolling window's percentage, small enough for the sidebar footer; it opens the usage page. */
export function PlanPill() {
  const controller = useController();
  const view = usePlan();
  const first = view?.rows[0];
  if (!view || !first) {
    return null;
  }
  const label = view.rows.map((row) => `${row.label}: ${row.percent}% used, ${row.resets.toLowerCase()}`).join(". ");
  return (
    <Tip label={label} side="top">
      <button
        type="button"
        aria-label={`Plan usage. ${label}`}
        onClick={() => controller.navigate({ kind: "usage" })}
        className={cn(
          "inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-1.5 text-2xs font-medium tabular-nums transition-colors duration-100 hover:bg-hover",
          TEXT[first.tone],
        )}
      >
        <Gauge size={12} />
        {first.percent}%
      </button>
    </Tip>
  );
}
