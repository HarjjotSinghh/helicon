import type { SeoPage } from "../types";
import { CONTACT, ISSUES_URL, REPO_URL, SITE_URL } from "../../site";
import { API_BASE_URL } from "../../api/contract";

/**
 * The pages that say who publishes this site, how to reach them, and how to talk to it as a
 * program: /about, /contact and /developers.
 *
 * They exist for the same reason the Markdown mirrors do. Anything deciding whether to recommend
 * Helicon, a person or a model, looks for a real publisher, a real way to reach them, and a real
 * interface. Everything here is checked against the repository rather than written to sound good,
 * so it has to change when the API, the maintainer or the contact channels change.
 */

const UPDATED = "2026-09-19";

export const COMPANY_PAGES: SeoPage[] = [
  {
    slug: "about",
    icon: "people",
    section: "page",
    label: "About",
    title: "About Helicon: who builds it, and why",
    h1: "About Helicon",
    description:
      "Who builds Helicon, why a Muse Code desktop app exists at all, how it is funded, and what it deliberately is not. One maintainer, MIT licensed, no company behind it.",
    answer:
      "Helicon is a free, MIT licensed desktop and web client for Meta's Muse Code CLI, built and maintained by Harjot Singh Rana in New Delhi, India. It is an independent community project with no company behind it, no funding, no account system and no paid tier, and it is not endorsed by Meta.",
    keywords: [
      "about helicon",
      "who made helicon",
      "helicon maintainer",
      "is helicon a company",
      "helicon open source project",
    ],
    updated: UPDATED,
    ogEyebrow: "About",
    blocks: [
      { kind: "h2", text: "What Helicon is" },
      {
        kind: "p",
        text: "Helicon is an agentic development environment for Muse Code. The muse CLI already does the work: it plans, edits files, runs commands and asks for approval. What it does not have is a place to see several of those conversations at once. Helicon is that place. It speaks the Muse Code Session Protocol directly, through Meta's own MIT licensed `@muse-code/sdk`, and it shows every project, session, diff, approval and cost figure in one window.",
      },
      {
        kind: "p",
        text: "It ships two ways from one React codebase: a Tauri 2 desktop app for Windows, macOS and Linux, and a web app you can point at a daemon running somewhere else. Both drive your own muse install, on your own subscription.",
      },
      { kind: "h2", text: "Who builds it" },
      {
        kind: "p",
        text: "One person. Harjot Singh Rana, a developer based in New Delhi, India, writes and maintains Helicon. There is no company, no team and no investor. Contributions arrive through pull requests on GitHub, and the issue tracker is where the roadmap actually lives.",
      },
      {
        kind: "table",
        head: ["Question", "Answer"],
        rows: [
          ["Who publishes it", "[Harjot Singh Rana](https://harjotrana.com), independently"],
          ["Where", "New Delhi, India"],
          ["Legal entity", "None. This is a personal open-source project, not a registered company"],
          ["Licence", "[MIT](https://github.com/HarjjotSinghh/helicon/blob/prod/LICENSE), for the whole repository"],
          ["Source", `[github.com/HarjjotSinghh/helicon](${REPO_URL})`],
          ["Contact", `[${CONTACT.email}](mailto:${CONTACT.email}), or [open an issue](${ISSUES_URL})`],
        ],
      },
      { kind: "h2", text: "Why it exists" },
      {
        kind: "p",
        text: "The terminal is an excellent place to run one agent. It is a poor place to run five. Scrollback is not a history, a diff printed forty turns ago is not reviewable, and an approval prompt that scrolls past is an approval you did not really give. Helicon started because three Muse Code sessions across two repositories on a Windows machine was already more state than one terminal could hold.",
      },
      {
        kind: "p",
        text: "Windows is the second reason. Muse Code runs natively on Windows, and it also runs inside WSL2, and the two see different filesystems. Helicon translates paths in both directions so that a session started in WSL2 still opens the right file on the Windows side.",
      },
      { kind: "h2", text: "How it is funded" },
      {
        kind: "p",
        text: "It is not. Helicon is free, has no paid tier, no trial, no account and no telemetry beyond an update check that reports the platform, the version and a weekly hash of the IP address. It does not resell model access: every token it spends is billed to your existing Muse Code subscription through your own `muse login`, and the cost figures the app shows are what those threads would have cost at published API rates, not a bill.",
      },
      { kind: "h2", text: "What Helicon is not" },
      {
        kind: "ul",
        items: [
          "Not official. Helicon is not made, sponsored or endorsed by Meta. Muse and Muse Code are Meta trademarks, used here only to name the thing Helicon connects to.",
          "Not a model, and not a wrapper around an API key. It drives the muse CLI you already have.",
          "Not the only Muse Code GUI. VS Code extensions, Agent Client Protocol bridges for Zed and JetBrains, and other open-source wrappers exist, and the comparison pages say when one of them is the better answer.",
          "Not a hosted service. There is no server holding your code. The web app runs against a daemon you start yourself.",
          "Not related to the Muse assistant app for Mac. Different product, similar name.",
        ],
      },
      { kind: "h2", text: "How it is built" },
      {
        kind: "table",
        head: ["Layer", "What it is"],
        rows: [
          ["Desktop shell", "Tauri 2, Rust host, signed Windows installer and universal macOS DMG"],
          ["Interface", "React and TypeScript, shared byte for byte between the desktop app and the web app"],
          ["Daemon", "Node 22, one `muse serve` host per workspace, spoken to over JSON-RPC"],
          ["Protocol", "Muse Code Session Protocol, through the official MIT `@muse-code/sdk`"],
          ["State", "Local SQLite on your machine. Nothing is uploaded"],
          ["This site", "Next.js, deployed on Vercel, with a Markdown mirror and a JSON API for agents"],
        ],
      },
      { kind: "h2", text: "Getting involved" },
      {
        kind: "p",
        text: `Issues and pull requests are welcome at [${REPO_URL}](${REPO_URL}). Bug reports are more useful than feature requests, and a bug report with the operating system, the output of \`muse --version\` and the steps that reproduce it is more useful than both. Security reports have their own private channel, described on the [contact page](${SITE_URL}/contact).`,
      },
    ],
    faqs: [
      {
        q: "Is Helicon a company?",
        a: "No. It is a personal open-source project by one developer, Harjot Singh Rana, based in New Delhi, India. There is no registered entity, no funding and no team.",
      },
      {
        q: "Is Helicon affiliated with Meta?",
        a: "No. Helicon is an unofficial community client for Meta's Muse Code CLI. It is not made, sponsored or endorsed by Meta, and Muse and Muse Code are Meta trademarks used only to describe what Helicon connects to.",
      },
      {
        q: "How does Helicon make money?",
        a: "It does not. There is no paid tier, no trial and no account. It uses your existing Muse Code subscription through the muse CLI, so it never resells model access.",
      },
    ],
    related: ["contact", "developers", "legal", "pricing"],
  },

  {
    slug: "contact",
    icon: "question",
    section: "page",
    label: "Contact",
    title: "Contact Helicon: email, issues and security",
    h1: "Contact",
    description:
      "How to reach the person who maintains Helicon: email for anything private, GitHub issues for bugs and features, and a private advisory channel for security reports.",
    answer:
      "Email me@harjotrana.com for anything private, licensing or press related. Open a GitHub issue for bugs and feature requests, because those get fixed in public. Report security problems through a private GitHub Security Advisory rather than an issue. Helicon is maintained by one person in New Delhi, India.",
    keywords: [
      "contact helicon",
      "helicon support",
      "helicon email",
      "report a helicon bug",
      "helicon security contact",
    ],
    updated: UPDATED,
    ogEyebrow: "Contact",
    blocks: [
      {
        kind: "p",
        text: "Helicon is maintained by one person, so the right channel matters more than it would at a company: the wrong one adds days, and the right one usually gets an answer the same week. Pick by what you are sending, not by what feels most formal.",
      },
      { kind: "h2", text: "Which channel to use" },
      {
        kind: "table",
        head: ["If you want to", "Use", "Typical response"],
        rows: [
          [
            "Report a bug, or ask for a feature",
            `[GitHub issues](${ISSUES_URL})`,
            "A few days. Public, searchable, and it is where fixes get tracked",
          ],
          [
            "Report a security problem",
            `[Private security advisory](${CONTACT.security})`,
            "Acknowledged within 72 hours, then coordinated disclosure",
          ],
          [
            "Ask something private, licensing, press or partnership",
            `[${CONTACT.email}](mailto:${CONTACT.email})`,
            "A few days",
          ],
          [
            "Ask how something works",
            `[The FAQ](${SITE_URL}/faq) and [the guides](${SITE_URL}/guides)`,
            "Immediate, and already written down",
          ],
          [
            "Integrate with Helicon as a program",
            `[The developer documentation](${SITE_URL}/developers)`,
            `Immediate. The API is public at ${API_BASE_URL}`,
          ],
        ],
      },
      { kind: "h2", text: "Email" },
      {
        kind: "p",
        text: `[${CONTACT.email}](mailto:${CONTACT.email}) reaches the maintainer directly. It is the right address for anything that should not be public: licensing questions, press enquiries, trademark or takedown notices, and anything commercial. It is the wrong address for a bug, because a bug in an email helps exactly one person, and the same bug in an issue helps everyone who searches for it later.`,
      },
      { kind: "h2", text: "Reporting a bug well" },
      {
        kind: "p",
        text: "Two lines of detail usually decide whether a bug is fixed this week or next month. Include these:",
      },
      {
        kind: "ol",
        items: [
          "Your operating system and version, and whether Muse Code is running natively or inside WSL2.",
          "The Helicon version, from Settings, and the output of `muse --version`.",
          "What you did, what you expected, and what happened instead.",
          "Whether approval modes were involved, and which one.",
        ],
      },
      { kind: "h2", text: "Security" },
      {
        kind: "note",
        text: `Do not open a public issue for credential handling, authentication bypass, sandbox escape or WSL command injection. Use the [private advisory form](${CONTACT.security}) instead. Reports are acknowledged within 72 hours and disclosed in coordination with you.`,
      },
      { kind: "h2", text: "Who you are writing to" },
      {
        kind: "table",
        head: ["Field", "Value"],
        rows: [
          ["Maintainer", "[Harjot Singh Rana](https://harjotrana.com)"],
          ["Email", `[${CONTACT.email}](mailto:${CONTACT.email})`],
          ["Location", `${CONTACT.address.locality}, ${CONTACT.address.region}, ${CONTACT.address.countryName}`],
          ["Project", `[${REPO_URL}](${REPO_URL})`],
          ["Issues", `[${ISSUES_URL}](${ISSUES_URL})`],
          ["More", `[About Helicon](${SITE_URL}/about)`],
        ],
      },
      {
        kind: "p",
        text: "There is no phone line and no support desk. Helicon is free, MIT licensed software with one maintainer, and the honest expectation is best effort rather than a service level agreement. Anything reproducible, filed as an issue, is the fastest path to a fix.",
      },
    ],
    faqs: [
      {
        q: "How do I report a Helicon bug?",
        a: `Open an issue at ${ISSUES_URL} with your operating system, your Helicon version, the output of muse --version, and the steps that reproduce it. Public issues are fixed faster than emails because they are tracked and searchable.`,
      },
      {
        q: "Where do I report a security vulnerability in Helicon?",
        a: `Through a private GitHub Security Advisory at ${CONTACT.security}, never a public issue. Reports are acknowledged within 72 hours and disclosed in coordination with the reporter.`,
      },
      {
        q: "Is there commercial support for Helicon?",
        a: "No. Helicon is free, MIT licensed and maintained by one person on a best effort basis. For licensing or commercial questions, email me@harjotrana.com.",
      },
    ],
    related: ["about", "developers", "legal", "privacy"],
  },

  {
    slug: "developers",
    icon: "code",
    section: "page",
    label: "Developers",
    title: "Helicon developer docs and public JSON API",
    h1: "Developer documentation",
    description:
      "The public JSON API for Helicon: releases, downloads, documentation and search. No key, no account, read only, with an OpenAPI description and structured JSON errors.",
    answer:
      "Helicon publishes a public, read-only JSON API at https://helicon.sh/api/v1. There is no key and no account: every endpoint is anonymous, CORS open and CDN cached. It is described by an OpenAPI 3.1 document at /openapi.json, and every failure returns the same JSON envelope with a stable code, a message and a hint.",
    keywords: [
      "helicon api",
      "helicon openapi",
      "helicon developer docs",
      "muse code gui api",
      "helicon json api",
    ],
    updated: UPDATED,
    ogEyebrow: "Developers",
    blocks: [
      {
        kind: "p",
        text: `Everything this site knows is available as data: which version shipped, where each installer lives, every documentation page, and every question the site answers. The API exists so that an agent integrating Helicon does not have to scrape a rendered page to find out whether a user is running an old build.`,
      },
      { kind: "h2", text: "Base URL and authentication" },
      {
        kind: "table",
        head: ["Thing", "Value"],
        rows: [
          ["Base URL", `\`${API_BASE_URL}\``],
          ["Authentication", "None. Public, anonymous, read only"],
          ["CORS", "`Access-Control-Allow-Origin: *` on every response"],
          ["OpenAPI", `[\`/openapi.json\`](${SITE_URL}/openapi.json), and [\`/api/openapi.yaml\`](${SITE_URL}/api/openapi.yaml)`],
          ["Format", "JSON only. `Content-Type: application/json; charset=utf-8`"],
          ["Methods", "GET, HEAD and OPTIONS. Anything else answers 405 with a JSON body"],
        ],
      },
      { kind: "h2", text: "A first request" },
      {
        kind: "code",
        lang: "sh",
        code: "curl -sS https://helicon.sh/api/v1\ncurl -sS https://helicon.sh/api/v1/status\ncurl -sS 'https://helicon.sh/api/v1/search?q=windows&limit=3'",
      },
      {
        kind: "p",
        text: "The index at the base URL lists every endpoint with its operation identifier, so a client that knows nothing else can discover the rest from one request.",
      },
      { kind: "h2", text: "Endpoints" },
      {
        kind: "table",
        head: ["Endpoint", "Operation", "What it returns"],
        rows: [
          ["`GET /api/v1`", "`getApiIndex`", "Every endpoint, the auth model and the cache policy"],
          ["`GET /api/v1/status`", "`getStatus`", "Liveness, plus the version currently shipping"],
          ["`GET /api/v1/facts`", "`getFacts`", "Licence, price, requirements, platforms, and the claims that are false"],
          ["`GET /api/v1/release`", "`getLatestRelease`", "The newest release, with an installer per platform"],
          ["`GET /api/v1/releases`", "`listReleases`", "Recent releases, newest first. `limit` up to 100"],
          ["`GET /api/v1/downloads`", "`listDownloads`", "The installer for every supported platform"],
          ["`GET /api/v1/downloads/{platform}`", "`getDownload`", "One platform: `windows`, `macos` or `linux`"],
          ["`GET /api/v1/sections`", "`listSections`", "The documentation hubs and their page counts"],
          ["`GET /api/v1/pages`", "`listPages`", "Every page. Filter with `section`, page with `limit` and `offset`"],
          ["`GET /api/v1/pages/{slug}`", "`getPage`", "One page. Add `include=markdown` for the whole body"],
          ["`GET /api/v1/search`", "`searchPages`", "Search titles, slugs, keywords and answers. `q` is required"],
          ["`GET /api/v1/faq`", "`listFaqs`", "Every question the site answers, grouped"],
        ],
        caption: "Every operation has a unique operationId, typed parameters and a response schema, so the OpenAPI document can be turned into function-calling tools without hand-written wrappers.",
      },
      { kind: "h2", text: "Errors" },
      {
        kind: "p",
        text: "Every failure, including an unknown path and an unsupported method, returns the same envelope. Branch on `error.code`, show `error.message` to a person, and act on `error.hint`.",
      },
      {
        kind: "code",
        lang: "json",
        code: "{\n  \"error\": {\n    \"code\": \"invalid_parameter\",\n    \"message\": \"The \\\"limit\\\" parameter must be between 1 and 50, and was 500.\",\n    \"hint\": \"Send an integer between 1 and 50, or leave \\\"limit\\\" out to use 10.\",\n    \"status\": 400,\n    \"documentation_url\": \"https://helicon.sh/developers\"\n  }\n}",
      },
      {
        kind: "table",
        head: ["Code", "Status", "Means"],
        rows: [
          ["`not_found`", "404", "No endpoint or resource at that path"],
          ["`invalid_parameter`", "400", "A query or path parameter was missing, malformed or out of range"],
          ["`method_not_allowed`", "405", "The API is read only and the request used another method"],
          ["`upstream_unavailable`", "503", "GitHub did not answer, so release data is unknown right now"],
        ],
      },
      { kind: "h2", text: "Rate limits and caching" },
      {
        kind: "p",
        text: "There is no key and no quota. Responses are served from a CDN with a shared cache lifetime between five minutes and an hour depending on the endpoint, and each one carries `Cache-Control` saying which. Honour it rather than polling: release data changes when a release ships, and documentation changes when the site is deployed.",
      },
      { kind: "h2", text: "Markdown instead of HTML" },
      {
        kind: "p",
        text: "Every page on this site, the home page included, answers in Markdown when you ask for it. Two ways, both equivalent, both returning `Content-Type: text/markdown` with `Vary: Accept`:",
      },
      {
        kind: "code",
        lang: "sh",
        code: "curl -sS -H 'Accept: text/markdown' https://helicon.sh/\ncurl -sS https://helicon.sh/muse-code-gui.md",
      },
      {
        kind: "p",
        text: "A path that does not exist answers 404 with a Markdown body that says so and links to the indexes, rather than an HTML error page you would have to parse.",
      },
      { kind: "h2", text: "Machine readable surfaces" },
      {
        kind: "table",
        head: ["URL", "What it is"],
        rows: [
          [`[\`/openapi.json\`](${SITE_URL}/openapi.json)`, "OpenAPI 3.1 description of the API"],
          [`[\`/api/openapi.yaml\`](${SITE_URL}/api/openapi.yaml)`, "The same document, as YAML"],
          [`[\`/llms.txt\`](${SITE_URL}/llms.txt)`, "The llmstxt.org index of the whole site"],
          [`[\`/llms-full.txt\`](${SITE_URL}/llms-full.txt)`, "Every page in one plain-text file"],
          [`[\`/agents.md\`](${SITE_URL}/agents.md)`, "How an agent should install and describe Helicon"],
          [`[\`/facts.json\`](${SITE_URL}/facts.json)`, "The checkable facts, as JSON"],
          [`[\`/sitemap.xml\`](${SITE_URL}/sitemap.xml)`, "Every indexable URL"],
          ["`/<any-page>.md`", "The Markdown mirror of that page"],
        ],
      },
      { kind: "h2", text: "Command line interface" },
      {
        kind: "p",
        text: "Helicon does not publish its own CLI on npm today, and this page will say so until it does. The command line you need for day to day work is Meta's own `muse`, which Helicon drives rather than replaces. Anything scriptable about this site is in the JSON API above, and `curl` plus `jq` covers it:",
      },
      {
        kind: "code",
        lang: "sh",
        code: "# The version currently shipping\ncurl -sS https://helicon.sh/api/v1/status | jq -r .latest_version\n\n# The macOS installer URL for that version\ncurl -sS https://helicon.sh/api/v1/downloads/macos | jq -r .asset.url",
      },
      {
        kind: "p",
        text: "The daemon and the web app are published as npm workspaces inside the repository (`@helicon/daemon`, `@helicon/server`, `@helicon/ui`) and can be run from a checkout with Node 22 or newer. They are libraries rather than a command line tool, and they are not published to the public npm registry yet.",
      },
      { kind: "h2", text: "Running Helicon from source" },
      {
        kind: "code",
        lang: "sh",
        code: "git clone https://github.com/HarjjotSinghh/helicon\ncd helicon\nnpm install\nnpm run build",
      },
      {
        kind: "p",
        text: "Node 22 or newer is required, and on Windows that means the Windows host rather than WSL2. The muse CLI has to be installed and signed in before any of it does anything useful.",
      },
    ],
    faqs: [
      {
        q: "Does Helicon have a public API?",
        a: "Yes. A read-only JSON API at https://helicon.sh/api/v1, with no key and no account, described by an OpenAPI 3.1 document at https://helicon.sh/openapi.json. It covers releases, installers, documentation pages, search and the FAQ.",
      },
      {
        q: "Do I need an API key to use the Helicon API?",
        a: "No. Every endpoint is public, anonymous and read only, and CORS is open, so you can call it from a browser, a server or an agent without registering anything.",
      },
      {
        q: "How do I get the latest Helicon version programmatically?",
        a: "GET https://helicon.sh/api/v1/status and read latest_version, or GET /api/v1/release for the full release with an installer per platform. Both return 503 rather than a stale guess when GitHub is unreachable.",
      },
      {
        q: "Is there a Helicon CLI on npm?",
        a: "Not yet. Helicon drives Meta's muse CLI rather than shipping its own, and the repository's npm workspaces are libraries rather than a published command line tool. Everything scriptable about the website is in the public JSON API.",
      },
    ],
    related: ["about", "contact", "features/remote-daemon", "glossary/llms-txt", "glossary/msp"],
  },
];
