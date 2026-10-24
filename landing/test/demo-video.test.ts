import { describe, expect, test } from "vitest";
import { playFailure, seekValueText } from "@/components/demo-video";

describe("seekValueText", () => {
  test("reads the position as a time", () => {
    expect(seekValueText(12.35, 65)).toBe("0:12 of 1:05");
  });

  test("pads single-digit seconds", () => {
    expect(seekValueText(5, 61)).toBe("0:05 of 1:01");
  });

  test("handles an unknown duration", () => {
    expect(seekValueText(0, 0)).toBe("0:00 of 0:00");
  });
});

describe("playFailure", () => {
  test("treats an aborted play() as expected", () => {
    expect(playFailure(new DOMException("interrupted", "AbortError"))).toBeNull();
  });

  test("names a refused or unsupported play()", () => {
    expect(playFailure(new DOMException("blocked", "NotAllowedError"))).toBe("NotAllowedError");
    expect(playFailure(new DOMException("no source", "NotSupportedError"))).toBe("NotSupportedError");
  });

  test("names other rejections", () => {
    expect(playFailure(new TypeError("bad"))).toBe("TypeError");
    expect(playFailure("bad")).toBe("unknown");
  });
});
