import { describe, expect, it } from "vitest";
import {
  detectMacArch,
  hasMacArchAssets,
  macArchFromHints,
  macAssetKind,
  parseMacArchParam,
  pickMacAsset,
  withMacArch,
} from "../src/lib/mac-arch";
import { installerPath } from "../src/lib/downloads";

const universal = { name: "Helicon_0.23.0_universal.dmg" };
const arm = { name: "Helicon_0.23.0_aarch64.dmg" };
const intel = { name: "Helicon_0.23.0_x64.dmg" };
const rest = [
  { name: "Helicon_0.23.0_x64-setup.exe" },
  { name: "Helicon_0.23.0_amd64.AppImage" },
  { name: "Helicon.app.tar.gz" },
  { name: "Helicon_0.23.0_aarch64.dmg.sig" },
];

describe("pickMacAsset", () => {
  const all = [...rest, universal, arm, intel];

  it("hands each chip its own DMG", () => {
    expect(pickMacAsset(all, "arm64")).toBe(arm);
    expect(pickMacAsset(all, "x64")).toBe(intel);
  });

  it("gives the universal DMG when the chip is unknown, whatever order GitHub lists the assets in", () => {
    expect(pickMacAsset(all, null)).toBe(universal);
    expect(pickMacAsset([arm, intel, universal], null)).toBe(universal);
  });

  it("falls back to the universal DMG on a release without per-chip builds", () => {
    const old = [...rest, universal];
    expect(pickMacAsset(old, "arm64")).toBe(universal);
    expect(pickMacAsset(old, "x64")).toBe(universal);
  });

  it("never hands the other chip's build to a chip whose own is missing", () => {
    expect(pickMacAsset([universal, arm], "x64")).toBe(universal);
  });

  it("returns some DMG when there is no universal one, and null when there is no DMG", () => {
    expect(pickMacAsset([arm], null)).toBe(arm);
    expect(pickMacAsset(rest, "arm64")).toBeNull();
  });

  it("never picks a signature file", () => {
    expect(pickMacAsset([{ name: "Helicon_0.23.0_aarch64.dmg.sig" }], "arm64")).toBeNull();
  });
});

describe("hasMacArchAssets", () => {
  it("needs both per-chip DMGs before the page offers explicit links", () => {
    expect(hasMacArchAssets([universal])).toBe(false);
    expect(hasMacArchAssets([universal, arm])).toBe(false);
    expect(hasMacArchAssets([universal, arm, intel])).toBe(true);
    expect(hasMacArchAssets(undefined)).toBe(false);
  });
});

describe("chip detection", () => {
  it("reads Client Hints: arm is Apple Silicon, x86 is Intel", () => {
    expect(macArchFromHints({ architecture: "arm", platform: "macOS" })).toBe("arm64");
    expect(macArchFromHints({ architecture: "x86", platform: "macOS" })).toBe("x64");
  });

  it("does not guess from an empty, odd or non-Mac answer", () => {
    expect(macArchFromHints({ architecture: "", platform: "macOS" })).toBeNull();
    expect(macArchFromHints({ platform: "macOS" })).toBeNull();
    expect(macArchFromHints({ architecture: "riscv", platform: "macOS" })).toBeNull();
    expect(macArchFromHints({ architecture: "arm", platform: "Windows" })).toBeNull();
    expect(macArchFromHints(null)).toBeNull();
  });

  it("asks the browser for the architecture hint", async () => {
    const asked: string[][] = [];
    const nav = {
      userAgentData: {
        platform: "macOS",
        getHighEntropyValues: async (hints: string[]) => {
          asked.push(hints);
          return { architecture: "arm" };
        },
      },
    };
    expect(await detectMacArch(nav)).toBe("arm64");
    expect(asked).toEqual([["architecture"]]);
  });

  it("returns null where the browser cannot tell: Safari and Firefox have no userAgentData", async () => {
    expect(await detectMacArch({})).toBeNull();
    expect(await detectMacArch(undefined)).toBeNull();
    expect(await detectMacArch({ userAgentData: { platform: "macOS" } })).toBeNull();
  });

  it("returns null, not Intel, when the lookup throws or the user agent alone looks like a Mac", async () => {
    const nav = {
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15",
      userAgentData: {
        platform: "macOS",
        getHighEntropyValues: async () => {
          throw new Error("denied");
        },
      },
    };
    expect(await detectMacArch(nav)).toBeNull();
  });
});

describe("links", () => {
  const origin = "https://helicon.sh";

  it("adds the chip to the macOS download link only", () => {
    expect(withMacArch("/download/macos?src=hero", origin, "arm64")).toBe("/download/macos?src=hero&arch=arm64");
    expect(withMacArch("/download/windows?src=hero", origin, "arm64")).toBe("/download/windows?src=hero");
    expect(withMacArch("https://github.com/x/y", origin, "x64")).toBe("https://github.com/x/y");
  });

  it("leaves a link alone with no chip, or when it already names one", () => {
    expect(withMacArch("/download/macos?src=hero", origin, null)).toBe("/download/macos?src=hero");
    expect(withMacArch("/download/macos?src=install-chip&arch=x64", origin, "arm64")).toBe(
      "/download/macos?src=install-chip&arch=x64",
    );
  });

  it("builds explicit chip links, and only for macOS", () => {
    expect(installerPath("macos", "install-chip", "x64")).toBe("/download/macos?src=install-chip&arch=x64");
    expect(installerPath("macos", "hero")).toBe("/download/macos?src=hero");
    expect(installerPath("windows", "hero", "arm64")).toBe("/download/windows?src=hero");
  });

  it("accepts only known chip values from a query string", () => {
    expect(parseMacArchParam("arm64")).toBe("arm64");
    expect(parseMacArchParam("x64")).toBe("x64");
    expect(parseMacArchParam("x86_64")).toBeNull();
    expect(parseMacArchParam("")).toBeNull();
    expect(parseMacArchParam(null)).toBeNull();
  });

  it("names which build an asset is", () => {
    expect(macAssetKind(universal.name)).toBe("universal");
    expect(macAssetKind(arm.name)).toBe("arm64");
    expect(macAssetKind(intel.name)).toBe("x64");
    expect(macAssetKind("Helicon.dmg")).toBe("other");
  });
});
