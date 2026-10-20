import { describe, expect, test } from "vitest";
import {
  LOCALES,
  languageAlternates,
  localePath,
  localeUrl,
  preferredLocale,
  translatedLocales,
  translationUpdated,
} from "@/lib/i18n";
import { HOME_COPY } from "@/lib/i18n-copy";
import { markdownRewriteTarget } from "@/lib/markdown-negotiation";
import { SITE_URL } from "@/lib/site";

describe("locale paths", () => {
  test("English stays at the root and the home of each language is its bare prefix", () => {
    expect(localePath("en", "/")).toBe("/");
    expect(localePath("ko", "/")).toBe("/ko");
    expect(localePath("pt-br", "/pricing")).toBe("/pt-br/pricing");
    expect(localeUrl("en", "/")).toBe(SITE_URL);
    expect(localeUrl("ja", "/")).toBe(`${SITE_URL}/ja`);
  });

  test("only translated paths have alternates", () => {
    expect(translatedLocales("/")).toEqual(LOCALES);
    expect(translatedLocales("/pricing")).toEqual([]);
    expect(languageAlternates("/pricing")).toEqual({});
    expect(translationUpdated("/")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("the home cluster is complete, with x-default on English", () => {
    expect(languageAlternates("/")).toEqual({
      en: SITE_URL,
      ko: `${SITE_URL}/ko`,
      ja: `${SITE_URL}/ja`,
      "pt-BR": `${SITE_URL}/pt-br`,
      "x-default": SITE_URL,
    });
  });
});

describe("preferredLocale", () => {
  test("offers a translation the browser asks for", () => {
    expect(preferredLocale(["ko-KR", "ko", "en-US"])).toBe("ko");
    expect(preferredLocale(["ja"])).toBe("ja");
    expect(preferredLocale(["pt-BR"])).toBe("pt-br");
    expect(preferredLocale(["pt-PT", "en"])).toBe("pt-br");
  });

  test("never offers anything to someone who ranks English first", () => {
    expect(preferredLocale(["en-US", "ko"])).toBeNull();
    expect(preferredLocale(["de-DE", "en", "ja"])).toBeNull();
    expect(preferredLocale([])).toBeNull();
  });

  test("skips languages without a translation", () => {
    expect(preferredLocale(["de-DE", "ja-JP"])).toBe("ja");
  });
});

describe("translated copy", () => {
  test.each(LOCALES)("%s has the same shape as the English page", (locale) => {
    const copy = HOME_COPY[locale];
    expect(copy.hero.facts).toHaveLength(4);
    expect(copy.features.items).toHaveLength(6);
    expect(copy.how.nodes).toHaveLength(3);
    expect(copy.faq.items).toHaveLength(7);
    expect(copy.meta.title.length).toBeLessThanOrEqual(70);
  });

  test.each(LOCALES)("%s keeps the unofficial notice and the product names", (locale) => {
    const text = JSON.stringify(HOME_COPY[locale]);
    expect(text).toContain("Meta");
    expect(text).toContain("Muse Code");
    expect(text).toContain("MIT");
  });

  test.each(LOCALES)("%s has its own live demo badge", (locale) => {
    const { name, tryIt } = HOME_COPY[locale].ui.liveDemo;
    expect(name.length).toBeGreaterThan(0);
    expect(tryIt.length).toBeGreaterThan(0);
    expect(name).not.toBe("Live demo");
  });

  test.each(LOCALES)("%s uses the full protocol name", (locale) => {
    expect(JSON.stringify(HOME_COPY[locale])).not.toContain("Muse Session Protocol");
  });

  test("the pt-BR install and features copy reads naturally", () => {
    expect(HOME_COPY["pt-br"].install.intro).toContain("com login feito na sua conta");
    expect(HOME_COPY["pt-br"].features.items[2].title).toBe("Aprovações sem atalhos");
  });
});

describe("markdown mirror", () => {
  test("translated pages are never rewritten to the English mirror", () => {
    expect(markdownRewriteTarget("/ko", "text/markdown")).toBeNull();
    expect(markdownRewriteTarget("/pt-br", "text/markdown")).toBeNull();
    expect(markdownRewriteTarget("/ja.md", null)).toBeNull();
    expect(markdownRewriteTarget("/", "text/markdown")).toBe("/md/index");
  });
});
