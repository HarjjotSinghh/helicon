import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { listedContextLimit } from "../src/model/limits.js";

describe("context limits", () => {
  it("lists the published Muse Spark window for standard and contributor models", () => {
    assert.equal(listedContextLimit("muse-spark-1.1"), 1_048_576);
    assert.equal(listedContextLimit("muse-spark-1.2"), 1_048_576);
    assert.equal(listedContextLimit("muse-spark-1.3"), 1_048_576);
    assert.equal(listedContextLimit("muse-spark-1.2-contributor"), 1_048_576);
    assert.equal(listedContextLimit("muse-spark-1.3-contributor"), 1_048_576);
  });

  it("falls back by family for unlisted versions", () => {
    assert.equal(listedContextLimit("muse-spark-9.9"), 1_048_576, "an unlisted version falls back to its family");
    assert.equal(listedContextLimit("muse-spark-9.9-contributor"), 1_048_576);
  });

  it("returns null for unknown models", () => {
    assert.equal(listedContextLimit("some-other-model"), null);
    assert.equal(listedContextLimit("muse"), null);
    assert.equal(listedContextLimit(null), null);
    assert.equal(listedContextLimit(""), null);
  });
});
