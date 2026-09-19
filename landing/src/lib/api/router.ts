import { ALL_PAGES, SECTIONS, pageBySlug, pagesInSection, relatedPages, sectionBySlug } from "../seo/catalog";
import { faqGroups } from "../seo/faq";
import { pageToMarkdown } from "../seo/markdown";
import type { SeoPage } from "../seo/types";
import { factsBody } from "../facts";
import { RELEASES_URL, REPO_URL, SITE_NAME, SITE_URL } from "../site";
import {
  API_BASE_PATH,
  API_BASE_URL,
  API_DOCS_URL,
  API_VERSION,
  OPENAPI_URL,
  apiError,
  statusForCode,
  type ApiError,
} from "./contract";

/**
 * The whole public API, as one dispatcher over path segments.
 *
 * It is a function of its input rather than a folder of route files for two reasons: every failure
 * then takes the same JSON shape without repeating a 405 handler twelve times, and the behaviour
 * can be tested without starting a server. The route handler at app/api/v1/[[...path]]/route.ts is
 * the only thing that knows about Request and Response.
 */

export type ReleaseAssetRecord = { name: string; size: number; browser_download_url: string };

export type RouterRelease = {
  version: string;
  tag: string;
  notesUrl: string;
  assets: ReleaseAssetRecord[];
} | null;

export type RouterReleaseSummary = {
  version: string;
  tag: string;
  name: string;
  publishedAt: string;
  notesUrl: string;
  prerelease: boolean;
};

/** The only two things the API cannot compute from the repository's own content. */
export type RouterDeps = {
  latestRelease: () => Promise<RouterRelease>;
  recentReleases: (limit?: number) => Promise<RouterReleaseSummary[]>;
};

export type ApiRequest = {
  method: string;
  /** Path segments below /api/v1. An empty array is the index. */
  segments: string[];
  searchParams: URLSearchParams;
};

export type ApiResult = {
  status: number;
  body: unknown;
  /** Shared CDN lifetime in seconds. Zero for anything that must not be cached. */
  maxAge: number;
};

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const PLATFORMS = ["windows", "macos", "linux"] as const;
export type Platform = (typeof PLATFORMS)[number];

const PLATFORM_MATCH: Record<Platform, RegExp> = {
  windows: /setup\.exe$/i,
  macos: /\.dmg$/i,
  linux: /\.appimage$/i,
};

const PLATFORM_LABEL: Record<Platform, string> = {
  windows: "Windows 10 and 11, x64",
  macos: "macOS, universal (Apple Silicon and Intel)",
  linux: "Linux, x86_64 AppImage",
};

function fail(result: ApiError): ApiResult {
  return { status: result.error.status, body: result, maxAge: 0 };
}

function notFound(path: string): ApiResult {
  return fail(
    apiError(
      "not_found",
      `No endpoint at ${path}.`,
      `List every endpoint at ${API_BASE_URL}, or read the machine readable contract at ${OPENAPI_URL}.`,
    ),
  );
}

/** A bounded integer query parameter. Rejects garbage rather than silently clamping it. */
function readInt(
  params: URLSearchParams,
  name: string,
  fallback: number,
  min: number,
  max: number,
): number | ApiError {
  const raw = params.get(name);
  if (raw === null || raw === "") return fallback;
  if (!/^-?\d+$/.test(raw)) {
    return apiError(
      "invalid_parameter",
      `The "${name}" parameter must be an integer, and was "${raw}".`,
      `Send an integer between ${min} and ${max}, or leave "${name}" out to use ${fallback}.`,
    );
  }
  const value = Number(raw);
  if (value < min || value > max) {
    return apiError(
      "invalid_parameter",
      `The "${name}" parameter must be between ${min} and ${max}, and was ${value}.`,
      `Send an integer between ${min} and ${max}, or leave "${name}" out to use ${fallback}.`,
    );
  }
  return value;
}

function isError(value: unknown): value is ApiError {
  return typeof value === "object" && value !== null && "error" in (value as Record<string, unknown>);
}

function pageSummary(page: SeoPage) {
  return {
    slug: page.slug,
    section: page.section,
    title: page.title,
    label: page.label,
    description: page.description,
    answer: page.answer,
    keywords: page.keywords,
    updated: page.updated,
    url: `${SITE_URL}/${page.slug}`,
    markdown_url: `${SITE_URL}/${page.slug}.md`,
    api_url: `${API_BASE_URL}/pages/${page.slug}`,
  };
}

function sectionSummary(slug: string) {
  const section = SECTIONS.find((item) => item.slug === slug)!;
  return {
    id: section.id,
    slug: section.slug,
    label: section.label,
    title: section.title,
    description: section.description,
    answer: section.answer,
    url: `${SITE_URL}/${section.slug}`,
    markdown_url: `${SITE_URL}/${section.slug}.md`,
    page_count: pagesInSection(section.id).length,
    api_url: `${API_BASE_URL}/pages?section=${section.id}`,
  };
}

function assetFor(platform: Platform, release: RouterRelease) {
  if (!release) return null;
  const asset = release.assets.find(
    (item) => PLATFORM_MATCH[platform].test(item.name) && !/\.sig$/i.test(item.name),
  );
  if (!asset) return null;
  return { name: asset.name, size_bytes: asset.size, url: asset.browser_download_url };
}

function downloadFor(platform: Platform, release: RouterRelease) {
  const asset = assetFor(platform, release);
  return {
    platform,
    label: PLATFORM_LABEL[platform],
    version: release?.version ?? null,
    asset,
    /** The redirect the website's own buttons use. It counts the download and then sends you on. */
    redirect_url: platform === "linux" ? null : `${SITE_URL}/download/${platform}`,
    release_notes_url: release?.notesUrl ?? RELEASES_URL,
    install_guide_url: `${SITE_URL}/install/${platform}`,
  };
}

/** Relevance is title first, then label and keywords, then the prose. Ties keep catalog order. */
function searchPages(query: string, limit: number) {
  const needle = query.trim().toLowerCase();
  const scored: { page: SeoPage; score: number }[] = [];
  for (const page of ALL_PAGES) {
    let score = 0;
    if (page.title.toLowerCase().includes(needle)) score += 5;
    if (page.label.toLowerCase().includes(needle)) score += 4;
    if (page.slug.toLowerCase().includes(needle)) score += 3;
    if (page.keywords.some((keyword) => keyword.toLowerCase().includes(needle))) score += 3;
    if (page.description.toLowerCase().includes(needle)) score += 2;
    if (page.answer.toLowerCase().includes(needle)) score += 1;
    if (score > 0) scored.push({ page, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ page, score }) => ({ ...pageSummary(page), score }));
}

function index() {
  return {
    name: `${SITE_NAME} public API`,
    version: API_VERSION,
    base_url: API_BASE_URL,
    documentation_url: API_DOCS_URL,
    openapi_url: OPENAPI_URL,
    openapi_yaml_url: `${SITE_URL}/api/openapi.yaml`,
    authentication: "None. Every endpoint is public, read only and anonymous.",
    rate_limit: "No key and no quota. The API is served from a CDN cache; please reuse responses rather than polling faster than the documented cache lifetime.",
    terms_url: `${SITE_URL}/terms`,
    contact_url: `${SITE_URL}/contact`,
    endpoints: [
      { method: "GET", path: `${API_BASE_PATH}`, operation_id: "getApiIndex", summary: "This document." },
      { method: "GET", path: `${API_BASE_PATH}/status`, operation_id: "getStatus", summary: "Service status and the version currently shipping." },
      { method: "GET", path: `${API_BASE_PATH}/facts`, operation_id: "getFacts", summary: "Every checkable fact about Helicon, as JSON." },
      { method: "GET", path: `${API_BASE_PATH}/release`, operation_id: "getLatestRelease", summary: "The latest release and its downloadable assets." },
      { method: "GET", path: `${API_BASE_PATH}/releases`, operation_id: "listReleases", summary: "Recent releases, newest first." },
      { method: "GET", path: `${API_BASE_PATH}/downloads`, operation_id: "listDownloads", summary: "The installer for every supported platform." },
      { method: "GET", path: `${API_BASE_PATH}/downloads/{platform}`, operation_id: "getDownload", summary: "The installer for one platform." },
      { method: "GET", path: `${API_BASE_PATH}/sections`, operation_id: "listSections", summary: "The documentation sections." },
      { method: "GET", path: `${API_BASE_PATH}/pages`, operation_id: "listPages", summary: "Every documentation page, filterable by section." },
      { method: "GET", path: `${API_BASE_PATH}/pages/{slug}`, operation_id: "getPage", summary: "One documentation page, optionally with its Markdown body." },
      { method: "GET", path: `${API_BASE_PATH}/search`, operation_id: "searchPages", summary: "Search the documentation." },
      { method: "GET", path: `${API_BASE_PATH}/faq`, operation_id: "listFaqs", summary: "Every question the site answers." },
    ],
  };
}

export async function handleApi(request: ApiRequest, deps: RouterDeps): Promise<ApiResult> {
  const method = request.method.toUpperCase();
  const path = `${API_BASE_PATH}${request.segments.length ? `/${request.segments.join("/")}` : ""}`;

  if (!READ_METHODS.has(method)) {
    return fail(
      apiError(
        "method_not_allowed",
        `${method} is not supported. This API is read only.`,
        `Use GET. Every endpoint is listed at ${API_BASE_URL}.`,
      ),
    );
  }

  const [head, ...rest] = request.segments;

  if (head === undefined) return { status: 200, body: index(), maxAge: 3600 };

  switch (head) {
    case "status": {
      if (rest.length) return notFound(path);
      const release = await deps.latestRelease();
      return {
        status: 200,
        body: {
          status: "ok",
          api_version: API_VERSION,
          product: SITE_NAME,
          latest_version: release?.version ?? null,
          release_notes_url: release?.notesUrl ?? RELEASES_URL,
          repository: REPO_URL,
          documentation_url: API_DOCS_URL,
          pages: ALL_PAGES.length,
        },
        maxAge: 300,
      };
    }

    case "facts": {
      if (rest.length) return notFound(path);
      const release = await deps.latestRelease();
      return { status: 200, body: factsBody(release), maxAge: 300 };
    }

    case "release": {
      if (rest.length) return notFound(path);
      const release = await deps.latestRelease();
      if (!release) {
        return fail(
          apiError(
            "upstream_unavailable",
            "GitHub did not answer, so the latest release is unknown right now.",
            `Retry in a minute, or read the release list directly at ${RELEASES_URL}.`,
          ),
        );
      }
      return {
        status: 200,
        body: {
          version: release.version,
          tag: release.tag,
          release_notes_url: release.notesUrl,
          downloads: PLATFORMS.map((platform) => downloadFor(platform, release)),
        },
        maxAge: 300,
      };
    }

    case "releases": {
      if (rest.length) return notFound(path);
      const limit = readInt(request.searchParams, "limit", 20, 1, 100);
      if (isError(limit)) return fail(limit);
      const releases = await deps.recentReleases(limit);
      return {
        status: 200,
        body: {
          total: releases.length,
          releases: releases.map((release) => ({
            version: release.version,
            tag: release.tag,
            name: release.name,
            published_at: release.publishedAt,
            release_notes_url: release.notesUrl,
            prerelease: release.prerelease,
          })),
        },
        maxAge: 900,
      };
    }

    case "downloads": {
      const release = await deps.latestRelease();
      if (rest.length === 0) {
        return {
          status: 200,
          body: {
            version: release?.version ?? null,
            downloads: PLATFORMS.map((platform) => downloadFor(platform, release)),
          },
          maxAge: 300,
        };
      }
      if (rest.length > 1) return notFound(path);
      const platform = rest[0] as Platform;
      if (!PLATFORMS.includes(platform)) {
        return fail(
          apiError(
            "invalid_parameter",
            `"${rest[0]}" is not a supported platform.`,
            `Use one of: ${PLATFORMS.join(", ")}.`,
          ),
        );
      }
      return { status: 200, body: downloadFor(platform, release), maxAge: 300 };
    }

    case "sections": {
      if (rest.length) return notFound(path);
      return {
        status: 200,
        body: { total: SECTIONS.length, sections: SECTIONS.map((section) => sectionSummary(section.slug)) },
        maxAge: 3600,
      };
    }

    case "pages": {
      if (rest.length === 0) {
        const limit = readInt(request.searchParams, "limit", 50, 1, 200);
        if (isError(limit)) return fail(limit);
        const offset = readInt(request.searchParams, "offset", 0, 0, 10_000);
        if (isError(offset)) return fail(offset);

        const sectionParam = request.searchParams.get("section");
        let pages = ALL_PAGES;
        if (sectionParam) {
          const known = SECTIONS.some((section) => section.id === sectionParam) || sectionParam === "page";
          if (!known) {
            return fail(
              apiError(
                "invalid_parameter",
                `"${sectionParam}" is not a known section.`,
                `Use one of: page, ${SECTIONS.map((section) => section.id).join(", ")}. The list is also at ${API_BASE_URL}/sections.`,
              ),
            );
          }
          pages = ALL_PAGES.filter((page) => page.section === sectionParam);
        }

        const window = pages.slice(offset, offset + limit);
        return {
          status: 200,
          body: {
            total: pages.length,
            limit,
            offset,
            pages: window.map(pageSummary),
          },
          maxAge: 3600,
        };
      }

      const slug = rest.join("/");
      const page = pageBySlug(slug);
      if (!page) {
        const section = sectionBySlug(slug);
        if (section) {
          return {
            status: 200,
            body: {
              ...sectionSummary(section.slug),
              pages: pagesInSection(section.id).map(pageSummary),
            },
            maxAge: 3600,
          };
        }
        return fail(
          apiError(
            "not_found",
            `No page with the slug "${slug}".`,
            `List every slug at ${API_BASE_URL}/pages, or search with ${API_BASE_URL}/search?q=${encodeURIComponent(slug)}.`,
          ),
        );
      }

      const include = request.searchParams.get("include");
      if (include !== null && include !== "" && include !== "markdown") {
        return fail(
          apiError(
            "invalid_parameter",
            `The "include" parameter accepts only "markdown", and was "${include}".`,
            'Send include=markdown to get the page body, or leave the parameter out.',
          ),
        );
      }

      return {
        status: 200,
        body: {
          ...pageSummary(page),
          faqs: page.faqs ?? [],
          related: relatedPages(page).map((item) => ({
            slug: item.slug,
            label: item.label,
            url: `${SITE_URL}/${item.slug}`,
          })),
          ...(include === "markdown" ? { markdown: pageToMarkdown(page) } : {}),
        },
        maxAge: 3600,
      };
    }

    case "search": {
      if (rest.length) return notFound(path);
      const query = request.searchParams.get("q") ?? "";
      if (query.trim().length < 2) {
        return fail(
          apiError(
            "invalid_parameter",
            'The "q" parameter is required and must be at least two characters.',
            `Try ${API_BASE_URL}/search?q=windows. To browse instead of search, use ${API_BASE_URL}/pages.`,
          ),
        );
      }
      const limit = readInt(request.searchParams, "limit", 10, 1, 50);
      if (isError(limit)) return fail(limit);
      const results = searchPages(query, limit);
      return { status: 200, body: { query, total: results.length, results }, maxAge: 3600 };
    }

    case "faq": {
      if (rest.length) return notFound(path);
      const groups = faqGroups();
      const total = groups.reduce((sum, group) => sum + group.faqs.length, 0);
      return {
        status: 200,
        body: {
          total,
          url: `${SITE_URL}/faq`,
          markdown_url: `${SITE_URL}/faq.md`,
          groups: groups.map((group) => ({
            title: group.title,
            section_url: group.slug ? `${SITE_URL}/${group.slug}` : null,
            faqs: group.faqs.map((faq) => ({ question: faq.q, answer: faq.a })),
          })),
        },
        maxAge: 3600,
      };
    }

    default:
      return notFound(path);
  }
}

export { statusForCode };
