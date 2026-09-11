import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { stuckThread } from "../src/model/errors.js";

describe("stuck threads", () => {
  it("knows an unreadable image poisons every later turn", () => {
    const found = stuckThread(
      "API error 400 [request_id=f5e4]: invalid image data at input[59].content[1]: the `image/png` payload could not be decoded (it may be corrupt or truncated). (invalid_request_error)",
    );
    assert.equal(found?.kind, "image");
    assert.match(found?.message ?? "", /Compacting/);
  });

  it("knows reasoning cannot be replayed after a provider switch", () => {
    const found = stuckThread(
      "provider-private history is incompatible with the active route: reasoning replay `rs_6aa475:rs_01a0926c` has no provider attribution after a provider switch; start a fresh turn without opaque reasoning history",
    );
    assert.equal(found?.kind, "reasoning");
  });

  it("leaves an ordinary failure alone", () => {
    assert.equal(stuckThread("API error 429: Subscription quota exhausted."), null);
    assert.equal(stuckThread("The turn failed."), null);
    assert.equal(stuckThread(""), null);
    assert.equal(stuckThread(null), null);
  });
});
