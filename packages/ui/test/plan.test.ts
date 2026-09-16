import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { emptyFold, type ThreadFold } from "../src/model/fold.js";
import { backgroundTasks, formatReset, planView } from "../src/model/plan.js";
import type { MspItem } from "../src/types.js";

const NOW = 1_800_000_000_000;

describe("plan meter", () => {
  it("shows nothing until Muse has seen a window", () => {
    assert.equal(planView(null, NOW), null);
  });

  it("names the short window by its length and counts down to each reset", () => {
    const view = planView(
      {
        tier: "high_usage",
        observedAtMs: NOW - 60_000,
        window: { usedPercent: 72.4, resetsAtMs: NOW + (2 * 60 + 14) * 60_000, windowDurationMins: 300 },
        weekly: { usedPercent: 94, resetsAtMs: NOW - 1, windowDurationMins: null },
      },
      NOW,
    );
    assert.equal(view?.tier, "High usage");
    assert.deepEqual(view?.rows, [
      { key: "window", label: "5-hour window", percent: 72, tone: "warn", resets: "Resets in 2h 14m" },
      { key: "weekly", label: "Weekly", percent: 94, tone: "danger", resets: "Reset" },
    ]);
    assert.equal(view?.stale, false);
  });

  it("clamps odd percentages and marks an old reading as stale", () => {
    const view = planView(
      {
        tier: "everyday",
        observedAtMs: NOW - 2 * 60 * 60_000,
        window: { usedPercent: 140, resetsAtMs: NOW + 1_000, windowDurationMins: 90 },
        weekly: { usedPercent: -3, resetsAtMs: NOW + 1_000, windowDurationMins: null },
      },
      NOW,
    );
    assert.equal(view?.rows[0]?.label, "90-minute window");
    assert.equal(view?.rows[0]?.percent, 100);
    assert.equal(view?.rows[1]?.percent, 0);
    assert.equal(view?.rows[1]?.tone, "ok");
    assert.equal(view?.stale, true);
  });

  it("leaves out a tier that is an opaque id rather than a plan name", () => {
    const reading = (tier: string) =>
      planView(
        {
          tier,
          observedAtMs: NOW,
          window: { usedPercent: 0, resetsAtMs: NOW + 1, windowDurationMins: 300 },
          weekly: { usedPercent: 0, resetsAtMs: NOW + 1, windowDurationMins: null },
        },
        NOW,
      )?.tier;
    // What Muse Code 1.3.0 actually reports.
    assert.equal(reading("27681527378179523"), null);
    assert.equal(reading("power_usage"), "Power usage");
  });
});

describe("reset countdown", () => {
  it("stays in hours for a day or so and switches to days for the weekly cap", () => {
    const hour = 60 * 60 * 1000;
    assert.equal(formatReset(2 * hour + 17 * 60_000), "2h 17m");
    assert.equal(formatReset(47 * hour), "47h");
    assert.equal(formatReset(77 * hour), "3d 5h");
    assert.equal(formatReset(72 * hour), "3d");
  });
});

describe("background tasks", () => {
  it("lists only tool calls still running in the background", () => {
    const item = (itemId: string, patch: Partial<MspItem>): MspItem => ({ itemId, kind: "toolCall", status: "inProgress", revision: 1, ...patch });
    const base = emptyFold();
    const fold: ThreadFold = {
      ...base,
      order: ["a", "b", "c", "d"],
      items: {
        a: item("a", { background: true }),
        b: item("b", { background: false }),
        c: item("c", { background: true, status: "completed" }),
        d: item("d", { kind: "subagent", background: true }),
      },
    };
    assert.deepEqual(backgroundTasks(fold), ["a"]);
  });
});
