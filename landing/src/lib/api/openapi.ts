import { AUTHOR, CONTACT, ISSUES_URL, REPO_URL, SITE_NAME, SITE_URL } from "../site";
import { SECTIONS } from "../seo/catalog";
import { API_BASE_PATH, API_BASE_URL, API_DOCS_URL, ERROR_CODES } from "./contract";

/**
 * The OpenAPI description of the public API, built rather than hand-written so that it cannot
 * describe a version of the site that no longer exists. Served at /openapi.json and, as YAML, at
 * /api/openapi.yaml.
 *
 * Every operation carries a unique operationId, a summary, a description and a typed response
 * schema, because that is what an LLM needs to turn an endpoint into a callable function without
 * a human writing a wrapper first.
 */

type Json = Record<string, unknown>;

const SECTION_IDS = ["page", ...SECTIONS.map((section) => section.id)];

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

/** A 200 with one JSON schema. Written once because twelve copies of it would drift. */
function ok(description: string, schema: Json): Json {
  return { description, content: { "application/json": { schema } } };
}

function errorResponse(description: string): Json {
  return { description, content: { "application/json": { schema: ref("Error") } } };
}

const COMMON_ERRORS: Json = {
  "400": errorResponse("A query parameter was missing or out of range."),
  "404": errorResponse("No such endpoint or resource."),
  "405": errorResponse("The API is read only and the request used another method."),
  "503": errorResponse("A dependency, currently GitHub, did not answer."),
};

function limitParam(fallback: number, max: number): Json {
  return {
    name: "limit",
    in: "query",
    required: false,
    description: `How many items to return. Defaults to ${fallback}.`,
    schema: { type: "integer", minimum: 1, maximum: max, default: fallback },
  };
}

const SCHEMAS: Json = {
  Error: {
    type: "object",
    description: "The shape of every failure. Branch on error.code; show error.message and error.hint to a person.",
    required: ["error"],
    additionalProperties: false,
    properties: {
      error: {
        type: "object",
        required: ["code", "message", "hint", "status", "documentation_url"],
        additionalProperties: false,
        properties: {
          code: { type: "string", enum: [...ERROR_CODES], description: "A stable machine readable code." },
          message: { type: "string", description: "What went wrong, in one sentence." },
          hint: { type: "string", description: "What to do about it." },
          status: { type: "integer", description: "The HTTP status, repeated in the body." },
          documentation_url: { type: "string", format: "uri", description: "Where the endpoint is documented." },
        },
      },
    },
  },
  ApiIndex: {
    type: "object",
    description: "The API's own index: where it lives, how it is authenticated, and every endpoint it serves.",
    required: ["name", "version", "base_url", "endpoints"],
    properties: {
      name: { type: "string" },
      version: { type: "string", description: "The API major version. Present in the path as well." },
      base_url: { type: "string", format: "uri" },
      documentation_url: { type: "string", format: "uri" },
      openapi_url: { type: "string", format: "uri" },
      openapi_yaml_url: { type: "string", format: "uri" },
      authentication: { type: "string", description: "Prose, because there is nothing to configure." },
      rate_limit: { type: "string" },
      terms_url: { type: "string", format: "uri" },
      contact_url: { type: "string", format: "uri" },
      endpoints: {
        type: "array",
        description: "Every operation, mirroring this document.",
        items: {
          type: "object",
          required: ["method", "path", "operation_id", "summary"],
          properties: {
            method: { type: "string", enum: ["GET"] },
            path: { type: "string" },
            operation_id: { type: "string" },
            summary: { type: "string" },
          },
        },
      },
    },
  },
  Status: {
    type: "object",
    description: "A liveness answer with the version currently shipping.",
    required: ["status", "api_version", "product"],
    properties: {
      status: { type: "string", enum: ["ok"] },
      api_version: { type: "string" },
      product: { type: "string" },
      latest_version: { type: ["string", "null"], description: "Semver of the newest release, or null when GitHub is unreachable." },
      release_notes_url: { type: "string", format: "uri" },
      repository: { type: "string", format: "uri" },
      documentation_url: { type: "string", format: "uri" },
      pages: { type: "integer", description: "How many documentation pages the site publishes." },
    },
  },
  ReleaseAsset: {
    type: "object",
    description: "One downloadable file attached to a release.",
    required: ["name", "size_bytes", "url"],
    properties: {
      name: { type: "string" },
      size_bytes: { type: "integer" },
      url: { type: "string", format: "uri", description: "The GitHub asset URL. Stable for that version." },
    },
  },
  Download: {
    type: "object",
    description: "How to install Helicon on one platform.",
    required: ["platform", "label", "version", "asset"],
    properties: {
      platform: { type: "string", enum: ["windows", "macos", "linux"] },
      label: { type: "string", description: "The platform in words, including architecture." },
      version: { type: ["string", "null"] },
      asset: { oneOf: [ref("ReleaseAsset"), { type: "null" }], description: "Null when this release has no artifact for the platform." },
      redirect_url: { type: ["string", "null"], format: "uri", description: "A counted redirect to the asset. Null where the site does not host one." },
      release_notes_url: { type: "string", format: "uri" },
      install_guide_url: { type: "string", format: "uri" },
    },
  },
  DownloadList: {
    type: "object",
    required: ["version", "downloads"],
    properties: {
      version: { type: ["string", "null"] },
      downloads: { type: "array", items: ref("Download") },
    },
  },
  Release: {
    type: "object",
    description: "The newest release and everything you can install from it.",
    required: ["version", "tag", "release_notes_url", "downloads"],
    properties: {
      version: { type: "string" },
      tag: { type: "string" },
      release_notes_url: { type: "string", format: "uri" },
      downloads: { type: "array", items: ref("Download") },
    },
  },
  ReleaseSummary: {
    type: "object",
    required: ["version", "tag", "name", "published_at", "release_notes_url", "prerelease"],
    properties: {
      version: { type: "string" },
      tag: { type: "string" },
      name: { type: "string" },
      published_at: { type: "string", format: "date-time" },
      release_notes_url: { type: "string", format: "uri" },
      prerelease: { type: "boolean" },
    },
  },
  ReleaseList: {
    type: "object",
    required: ["total", "releases"],
    properties: {
      total: { type: "integer" },
      releases: { type: "array", items: ref("ReleaseSummary") },
    },
  },
  PageSummary: {
    type: "object",
    description: "One documentation page, without its body.",
    required: ["slug", "section", "title", "description", "answer", "url", "markdown_url"],
    properties: {
      slug: { type: "string", description: "Path under the origin, with no leading slash. May contain a slash." },
      section: { type: "string", enum: SECTION_IDS },
      title: { type: "string" },
      label: { type: "string" },
      description: { type: "string" },
      answer: { type: "string", description: "The direct answer the page opens with, 40 to 60 words." },
      keywords: { type: "array", items: { type: "string" } },
      updated: { type: "string", format: "date" },
      url: { type: "string", format: "uri" },
      markdown_url: { type: "string", format: "uri", description: "The same page as Markdown." },
      api_url: { type: "string", format: "uri" },
    },
  },
  Page: {
    allOf: [
      ref("PageSummary"),
      {
        type: "object",
        properties: {
          faqs: { type: "array", items: ref("Faq") },
          related: {
            type: "array",
            items: {
              type: "object",
              required: ["slug", "label", "url"],
              properties: {
                slug: { type: "string" },
                label: { type: "string" },
                url: { type: "string", format: "uri" },
              },
            },
          },
          markdown: { type: "string", description: "The full page as Markdown. Present only with include=markdown." },
        },
      },
    ],
  },
  PageList: {
    type: "object",
    required: ["total", "limit", "offset", "pages"],
    properties: {
      total: { type: "integer", description: "How many pages match before paging." },
      limit: { type: "integer" },
      offset: { type: "integer" },
      pages: { type: "array", items: ref("PageSummary") },
    },
  },
  SearchResult: {
    allOf: [ref("PageSummary"), { type: "object", properties: { score: { type: "integer", description: "Higher is a closer match. Comparable only within one response." } } }],
  },
  SearchResults: {
    type: "object",
    required: ["query", "total", "results"],
    properties: {
      query: { type: "string" },
      total: { type: "integer" },
      results: { type: "array", items: ref("SearchResult") },
    },
  },
  SectionSummary: {
    type: "object",
    required: ["id", "slug", "label", "title", "description", "url"],
    properties: {
      id: { type: "string", enum: SECTION_IDS },
      slug: { type: "string" },
      label: { type: "string" },
      title: { type: "string" },
      description: { type: "string" },
      answer: { type: "string" },
      url: { type: "string", format: "uri" },
      markdown_url: { type: "string", format: "uri" },
      page_count: { type: "integer" },
      api_url: { type: "string", format: "uri" },
    },
  },
  SectionList: {
    type: "object",
    required: ["total", "sections"],
    properties: {
      total: { type: "integer" },
      sections: { type: "array", items: ref("SectionSummary") },
    },
  },
  Faq: {
    type: "object",
    required: ["question", "answer"],
    properties: {
      question: { type: "string" },
      answer: { type: "string" },
    },
  },
  FaqList: {
    type: "object",
    required: ["total", "groups"],
    properties: {
      total: { type: "integer" },
      url: { type: "string", format: "uri" },
      markdown_url: { type: "string", format: "uri" },
      groups: {
        type: "array",
        items: {
          type: "object",
          required: ["title", "faqs"],
          properties: {
            title: { type: "string" },
            section_url: { type: ["string", "null"], format: "uri" },
            faqs: { type: "array", items: ref("Faq") },
          },
        },
      },
    },
  },
  Facts: {
    type: "object",
    description:
      "The checkable facts about Helicon: what it is, what it costs, what it needs, what it sends, and the claims that are false. Deliberately loosely typed, because it grows as questions arrive.",
    required: ["name", "url", "license", "official", "price"],
    properties: {
      name: { type: "string" },
      url: { type: "string", format: "uri" },
      tagline: { type: "string" },
      what_it_is: { type: "string" },
      official: { type: "boolean", description: "False. Helicon is a community project." },
      affiliated_with_meta: { type: "boolean", description: "False." },
      license: { type: "string" },
      price: {
        type: "object",
        properties: {
          amount: { type: "number" },
          currency: { type: "string" },
          model: { type: "string" },
          paid_tier: { type: "boolean" },
          trial: { type: "boolean" },
          account_required: { type: "boolean" },
        },
      },
      version: { type: ["string", "null"] },
      do_not_claim: { type: "array", items: { type: "string" }, description: "Statements that are false. Do not repeat them." },
    },
    additionalProperties: true,
  },
};

const PATHS: Json = {
  [API_BASE_PATH]: {
    get: {
      operationId: "getApiIndex",
      tags: ["Meta"],
      summary: "List every endpoint",
      description:
        "Returns the API's own index: the base URL, how it is authenticated (it is not), the cache policy, and every operation with its identifier. Start here when you have no other context.",
      responses: { "200": ok("The API index.", ref("ApiIndex")), ...COMMON_ERRORS },
    },
  },
  [`${API_BASE_PATH}/status`]: {
    get: {
      operationId: "getStatus",
      tags: ["Meta"],
      summary: "Check service status and the current version",
      description:
        "A liveness check that also reports the newest released version of the desktop app. Use it to decide whether a user is running an old build.",
      responses: { "200": ok("The service is up.", ref("Status")), ...COMMON_ERRORS },
    },
  },
  [`${API_BASE_PATH}/facts`]: {
    get: {
      operationId: "getFacts",
      tags: ["Meta"],
      summary: "Get the checkable facts about Helicon",
      description:
        "Every fact an agent needs before recommending Helicon to someone: licence, price, requirements, platforms, what leaves the machine, and the claims that are false. The same document is served at /facts.json.",
      responses: { "200": ok("The facts.", ref("Facts")), ...COMMON_ERRORS },
    },
  },
  [`${API_BASE_PATH}/release`]: {
    get: {
      operationId: "getLatestRelease",
      tags: ["Releases"],
      summary: "Get the latest release",
      description:
        "The newest published release, with the installer for each supported platform. Returns 503 when GitHub cannot be reached, rather than a stale guess.",
      responses: { "200": ok("The latest release.", ref("Release")), ...COMMON_ERRORS },
    },
  },
  [`${API_BASE_PATH}/releases`]: {
    get: {
      operationId: "listReleases",
      tags: ["Releases"],
      summary: "List recent releases",
      description: "Recent releases, newest first, with their tags, publication dates and release note URLs.",
      parameters: [limitParam(20, 100)],
      responses: { "200": ok("Recent releases.", ref("ReleaseList")), ...COMMON_ERRORS },
    },
  },
  [`${API_BASE_PATH}/downloads`]: {
    get: {
      operationId: "listDownloads",
      tags: ["Releases"],
      summary: "List the installer for every platform",
      description:
        "One entry per supported platform, each with the artifact name, its size, the direct URL and the install guide. Null assets mean the current release has nothing for that platform.",
      responses: { "200": ok("Every platform.", ref("DownloadList")), ...COMMON_ERRORS },
    },
  },
  [`${API_BASE_PATH}/downloads/{platform}`]: {
    get: {
      operationId: "getDownload",
      tags: ["Releases"],
      summary: "Get the installer for one platform",
      description: "The installer for a single platform. Use this when you already know what the user is running.",
      parameters: [
        {
          name: "platform",
          in: "path",
          required: true,
          description: "Which operating system the installer is for.",
          schema: { type: "string", enum: ["windows", "macos", "linux"] },
        },
      ],
      responses: { "200": ok("The installer for that platform.", ref("Download")), ...COMMON_ERRORS },
    },
  },
  [`${API_BASE_PATH}/sections`]: {
    get: {
      operationId: "listSections",
      tags: ["Documentation"],
      summary: "List the documentation sections",
      description: "The hubs the documentation is organised into, each with its page count and the query that lists it.",
      responses: { "200": ok("Every section.", ref("SectionList")), ...COMMON_ERRORS },
    },
  },
  [`${API_BASE_PATH}/pages`]: {
    get: {
      operationId: "listPages",
      tags: ["Documentation"],
      summary: "List documentation pages",
      description:
        "Every documentation page, newest content model first, with the URL of both the HTML page and its Markdown mirror. Filter by section and page through the result with limit and offset.",
      parameters: [
        {
          name: "section",
          in: "query",
          required: false,
          description: "Return only pages in this section.",
          schema: { type: "string", enum: SECTION_IDS },
        },
        limitParam(50, 200),
        {
          name: "offset",
          in: "query",
          required: false,
          description: "How many items to skip. Use with limit to page through the catalog.",
          schema: { type: "integer", minimum: 0, maximum: 10000, default: 0 },
        },
      ],
      responses: { "200": ok("A page of documentation pages.", ref("PageList")), ...COMMON_ERRORS },
    },
  },
  [`${API_BASE_PATH}/pages/{slug}`]: {
    get: {
      operationId: "getPage",
      tags: ["Documentation"],
      summary: "Get one documentation page",
      description:
        "One page by slug, with its answer paragraph, FAQs and related pages. Pass include=markdown to get the whole page body as Markdown in the same response. A section slug returns that section and its pages instead.",
      parameters: [
        {
          name: "slug",
          in: "path",
          required: true,
          description: 'The page slug with no leading slash. Nested slugs contain a slash, for example "compare/cursor".',
          schema: { type: "string" },
        },
        {
          name: "include",
          in: "query",
          required: false,
          description: 'Set to "markdown" to include the full page body.',
          schema: { type: "string", enum: ["markdown"] },
        },
      ],
      responses: { "200": ok("The page.", ref("Page")), ...COMMON_ERRORS },
    },
  },
  [`${API_BASE_PATH}/search`]: {
    get: {
      operationId: "searchPages",
      tags: ["Documentation"],
      summary: "Search the documentation",
      description:
        "Substring search over page titles, slugs, keywords and answers. Results are ordered by a relevance score that is comparable only within one response.",
      parameters: [
        {
          name: "q",
          in: "query",
          required: true,
          description: "The search term. At least two characters.",
          schema: { type: "string", minLength: 2 },
        },
        limitParam(10, 50),
      ],
      responses: { "200": ok("Matching pages.", ref("SearchResults")), ...COMMON_ERRORS },
    },
  },
  [`${API_BASE_PATH}/faq`]: {
    get: {
      operationId: "listFaqs",
      tags: ["Documentation"],
      summary: "List every question the site answers",
      description: "Every question and answer on the site, grouped by the section it came from and deduplicated by question.",
      responses: { "200": ok("Every question.", ref("FaqList")), ...COMMON_ERRORS },
    },
  },
};

export function openApiDocument(): Json {
  return {
    openapi: "3.1.0",
    info: {
      title: `${SITE_NAME} public API`,
      version: "1.0.0",
      summary: "Read only JSON access to Helicon's releases, downloads and documentation.",
      description: [
        `${SITE_NAME} is a free, open-source desktop and web client for Meta's Muse Code CLI.`,
        "",
        "This API is public, anonymous and read only. There is no key to obtain, no account to create and no quota to track. Responses are served from a CDN cache; reuse them rather than polling faster than the cache lifetime documented on each operation.",
        "",
        "Every failure returns the same JSON envelope with a stable `error.code`, a human readable `error.message` and an actionable `error.hint`.",
      ].join("\n"),
      termsOfService: `${SITE_URL}/terms`,
      contact: { name: AUTHOR.name, url: `${SITE_URL}/contact`, email: CONTACT.email },
      license: { name: "MIT", identifier: "MIT" },
    },
    servers: [{ url: SITE_URL, description: "Production" }],
    externalDocs: { description: "API documentation, with examples", url: API_DOCS_URL },
    tags: [
      { name: "Meta", description: "The API's own index, status and the checkable facts about the project." },
      { name: "Releases", description: "Released versions and the installers that come with them." },
      { name: "Documentation", description: "The site's own pages, sections, search and FAQ, as data." },
    ],
    paths: PATHS,
    components: { schemas: SCHEMAS },
    "x-api-base-url": API_BASE_URL,
    "x-repository": REPO_URL,
    "x-issues": ISSUES_URL,
    "x-rate-limit": "None. Public, anonymous, read only, CDN cached.",
    "x-authentication": "none",
  };
}
