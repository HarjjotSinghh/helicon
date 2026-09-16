import type { PlanUsage, PlanWindow } from "../types.js";
import { formatDuration, humanize } from "./format.js";
import type { ThreadFold } from "./fold.js";

export type PlanTone = "ok" | "warn" | "danger";

export interface PlanRow {
  key: "window" | "weekly";
  label: string;
  percent: number;
  tone: PlanTone;
  /** "Resets in 2h 14m", or "Reset" once the time has passed and Muse has not reported the new window yet. */
  resets: string;
}

export interface PlanView {
  /** The plan's name when Muse gives a readable one; Muse 1.3.0 sends an opaque numeric id, which is left out. */
  tier: string | null;
  rows: PlanRow[];
  /** When Muse last saw these numbers; they only move when a model call reports them. */
  observedAtMs: number;
  /** True once the reading is old enough that the real meter has likely moved on. */
  stale: boolean;
}

/** A reading older than this is shown with its age, since the plan's windows keep moving without it. */
const STALE_MS = 30 * 60 * 1000;

function tone(percent: number): PlanTone {
  return percent >= 90 ? "danger" : percent >= 70 ? "warn" : "ok";
}

function windowLabel(window: PlanWindow): string {
  const minutes = window.windowDurationMins;
  if (!minutes) {
    return "Current window";
  }
  return minutes % 60 === 0 ? `${minutes / 60}-hour window` : `${minutes}-minute window`;
}

const HOUR_MS = 60 * 60 * 1000;

/** Hours and minutes for today's window, days and hours for the weekly one: "77h" says less than "3d 5h". */
export function formatReset(ms: number): string {
  if (ms < 48 * HOUR_MS) {
    return formatDuration(ms);
  }
  const hours = Math.floor(ms / HOUR_MS);
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest === 0 ? `${days}d` : `${days}d ${rest}h`;
}

function row(key: PlanRow["key"], label: string, window: PlanWindow, now: number): PlanRow {
  const percent = Math.max(0, Math.min(100, Math.round(window.usedPercent)));
  const left = window.resetsAtMs - now;
  return { key, label, percent, tone: tone(percent), resets: left > 0 ? `Resets in ${formatReset(left)}` : "Reset" };
}

/** The plan meter as the UI shows it: the short window and the weekly cap, each with how long until it resets. */
export function planView(usage: PlanUsage | null, now: number): PlanView | null {
  if (!usage) {
    return null;
  }
  return {
    tier: /^[a-z][a-z0-9_ -]{0,31}$/i.test(usage.tier) ? humanize(usage.tier) : null,
    rows: [row("window", windowLabel(usage.window), usage.window, now), row("weekly", "Weekly", usage.weekly, now)],
    observedAtMs: usage.observedAtMs,
    stale: now - usage.observedAtMs > STALE_MS,
  };
}

/** Tool calls in a thread still running in the background, which `task/stopAll` would stop. */
export function backgroundTasks(fold: ThreadFold): string[] {
  const ids: string[] = [];
  for (const id of fold.order) {
    const item = fold.items[id];
    if (item?.kind === "toolCall" && item.background === true && item.status === "inProgress") {
      ids.push(id);
    }
  }
  return ids;
}
