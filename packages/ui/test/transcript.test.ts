import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyDelta, applyFinal, emptyFold, orderedItems } from "../src/transcript.js";

describe("transcript fold", () => {
  it("accumulates deltas and finalizes items in order", () => {
    let state = emptyFold();
    state = applyDelta(state, "i1", "message", "Hello ");
    state = applyDelta(state, "i1", "message", "world");
    state = applyDelta(state, "i2", "tool", "running");
    state = applyFinal(state, "i1", "message", "Hello world");
    const items = orderedItems(state);
    assert.equal(items.length, 2);
    assert.equal(items[0]?.itemId, "i1");
    assert.equal(items[0]?.text, "Hello world");
    assert.equal(items[0]?.status, "final");
    assert.equal(items[1]?.status, "running");
  });
});
