import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyEvents, emptyFold } from "../src/model/fold.js";
import { objectiveOf, reconciled, workflowView } from "../src/model/workflow.js";
import type { MspItem, ViewEvent, WorkflowChild } from "../src/types.js";

const CALL = "call_01a08dd7";

/** The reconciliation payload, wrapped the way Muse wraps it inside the item's `message`. */
function payload(extra: Record<string, unknown> = {}): string {
  const body = {
    type: "workflow-launch-reconciled",
    call_id: CALL,
    route: "guidance",
    launch_admitted: true,
    deferred_to_background: true,
    agents_activity: [
      { agent: "a1", duration_ms: 4000, tool_calls: 3 },
      { agent: "a2", duration_ms: 9000, tool_calls: 5 },
    ],
    final_summary: { status: "success", summary: "# Findings\n\nTen ideas." },
    latest_failure: null,
    ...extra,
  };
  return `Some preamble.\n<workflow-launch-reconciled>${JSON.stringify(body)}</workflow-launch-reconciled>`;
}

function child(childId: string, terminal: string | null, durationMs?: number): WorkflowChild {
  return {
    childId,
    attempt: 1,
    status: terminal ? "terminal" : "inProgress",
    ...(terminal ? { terminal } : {}),
    ...(durationMs === undefined ? {} : { durationMs }),
  };
}

function item(extra: Partial<MspItem> = {}): MspItem {
  return {
    itemId: "w1",
    kind: "workflow",
    status: "completed",
    revision: 7,
    turnId: "t1",
    entryId: "generated.model-chosen",
    scriptId: "generated.workflow.generated.model-chosen",
    triggerSource: "guidanceAuto",
    workflowRunId: "workflow-run-model-tool-call_01a08dd7",
    fallbackText: "Workflow: model-chosen generated workflow",
    message: payload(),
    children: [child("a1", "completed", 4000), child("a2", "completed", 9000)],
    ...extra,
  };
}

/** A thread holding the tool call that launched the run, which is the only place the goal appears. */
function foldWithLaunch(args: string) {
  const event: ViewEvent = {
    method: "item/completed",
    params: {
      item: {
        itemId: "tc1",
        kind: "toolCall",
        status: "completed",
        revision: 1,
        turnId: "t1",
        tool: "workflow",
        callId: CALL,
        args,
        recordedAt: "2026-09-14T10:00:00.000Z",
      },
    },
  };
  return applyEvents(emptyFold(), [event]);
}

const LAUNCH_ARGS = JSON.stringify({
  args: JSON.stringify({ mode: "thorough", goal: "Ten low-competition micro-SaaS ideas" }),
  script: 'export default async function workflow(host) { phase("Research sweep"); }',
});

describe("reconciled", () => {
  it("reads the payload out of its wrapper", () => {
    const parsed = reconciled(payload());
    assert.equal(parsed?.call_id, CALL);
    assert.equal(parsed?.agents_activity?.length, 2);
  });

  it("accepts a bare JSON message", () => {
    assert.equal(reconciled(JSON.stringify({ call_id: "x" }))?.call_id, "x");
  });

  it("returns null for nothing, prose, or broken JSON", () => {
    assert.equal(reconciled(undefined), null);
    assert.equal(reconciled("just text"), null);
    assert.equal(reconciled("<workflow-launch-reconciled>{oops</workflow-launch-reconciled>"), null);
  });
});

describe("objectiveOf", () => {
  it("digs the goal out of the doubly encoded arguments", () => {
    assert.equal(objectiveOf(LAUNCH_ARGS), "Ten low-competition micro-SaaS ideas");
  });

  it("accepts objective as the key instead of goal", () => {
    const args = JSON.stringify({ args: JSON.stringify({ objective: "Audit the build" }) });
    assert.equal(objectiveOf(args), "Audit the build");
  });

  it("reads a flat argument object too", () => {
    assert.equal(objectiveOf(JSON.stringify({ goal: "Flat" })), "Flat");
  });

  it("gives null when there is nothing to read", () => {
    assert.equal(objectiveOf(undefined), null);
    assert.equal(objectiveOf("not json"), null);
    assert.equal(objectiveOf(JSON.stringify({ script: "x" })), null);
  });
});

describe("workflowView", () => {
  it("counts agents and totals their work", () => {
    const view = workflowView(item(), foldWithLaunch(LAUNCH_ARGS));
    assert.equal(view.used, 2);
    assert.equal(view.done, 2);
    assert.equal(view.working, 0);
    assert.equal(view.failed, 0);
    assert.equal(view.toolCalls, 8);
    assert.equal(view.longestMs, 9000);
    assert.equal(view.agentMs, 13000);
    assert.equal(view.running, false);
  });

  it("takes the objective from the launching tool call", () => {
    const view = workflowView(item(), foldWithLaunch(LAUNCH_ARGS));
    assert.equal(view.objective, "Ten low-competition micro-SaaS ideas");
  });

  it("leaves the objective null when the thread is not available", () => {
    assert.equal(workflowView(item(), null).objective, null);
    assert.equal(workflowView(item(), emptyFold()).objective, null);
  });

  it("separates agents still working from ones that failed", () => {
    const view = workflowView(
      item({ status: "inProgress", children: [child("a1", "completed", 4000), child("a2", null), child("a3", "failed", 100)] }),
      null,
    );
    assert.equal(view.used, 3);
    assert.equal(view.done, 1);
    assert.equal(view.working, 1);
    assert.equal(view.failed, 1);
    assert.equal(view.running, true);
  });

  it("falls back to the payload's agents before children are reported", () => {
    const view = workflowView(item({ children: [] }), null);
    assert.equal(view.used, 2);
    assert.equal(view.toolCalls, 8);
    // Nothing claims they finished, so none are counted as done.
    assert.equal(view.done, 0);
  });

  it("carries the report and the run's identifiers", () => {
    const view = workflowView(item(), null);
    assert.equal(view.summaryStatus, "success");
    assert.match(view.summary ?? "", /Ten ideas/);
    assert.equal(view.runId, "workflow-run-model-tool-call_01a08dd7");
    assert.equal(view.scriptId, "generated.workflow.generated.model-chosen");
    assert.equal(view.trigger, "guidanceAuto");
    assert.equal(view.admitted, true);
    assert.equal(view.deferred, true);
    assert.equal(view.failure, null);
  });

  it("surfaces a failure from the payload or the item", () => {
    assert.equal(workflowView(item({ message: payload({ latest_failure: "agent a2 crashed" }) }), null).failure, "agent a2 crashed");
    assert.equal(workflowView(item({ message: undefined, failureReason: "run cancelled" }), null).failure, "run cancelled");
  });

  it("copes with a run that has reported nothing yet", () => {
    const bare: MspItem = { itemId: "w2", kind: "workflow", status: "inProgress", revision: 1 };
    const view = workflowView(bare, null);
    assert.equal(view.used, 0);
    assert.equal(view.toolCalls, null);
    assert.equal(view.longestMs, null);
    assert.equal(view.summary, null);
    assert.equal(view.label, "Workflow");
    assert.equal(view.admitted, false);
  });
});
