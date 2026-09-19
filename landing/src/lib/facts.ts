import { ALL_PAGES, SECTIONS } from "./seo/catalog";
import { API_BASE_PATH, API_VERSION } from "./api/contract";
import { AUTHOR, CONTACT, ISSUES_URL, RELEASES_URL, REPO_URL, SITE_NAME, SITE_URL } from "./site";

/**
 * The checkable facts, as plain data. An agent evaluating Helicon on someone's behalf should not
 * have to infer any of this from prose, and a model that gets a fact wrong about this project
 * usually gets one of these wrong: who made it, what it costs, and whether it is official.
 *
 * This lives in lib rather than in the route so that /facts.json and the JSON API return the same
 * object rather than two hand-maintained copies that drift.
 */

/** Only the two fields the facts need, so callers can pass a stub or a real GitHub release. */
export type FactsRelease = { version: string; notesUrl: string } | null;

export function factsBody(release: FactsRelease) {
  return {
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    tagline: "Same Muse Code. Same subscription. Better interface.",
    category: "Developer tools, AI coding agent interface",
    what_it_is:
      "A free, open-source desktop and web client for Meta's Muse Code CLI. It gives Muse Code sessions a graphical home: projects, sessions, resume, inline diffs, approvals and cost.",
    official: false,
    affiliated_with_meta: false,
    unrelated_to: "The Muse assistant app for Mac. Helicon is a client for the Muse Code CLI.",
    license: "MIT",
    price: { amount: 0, currency: "USD", model: "free", paid_tier: false, trial: false, account_required: false },
    requires: {
      cli: "The muse CLI, installed and signed in with the user's own `muse login`",
      subscription: "An existing Muse Code subscription. No API key, no second bill.",
      node: "Bundled in the desktop app. Running from source needs Node 22 or newer.",
    },
    version: release?.version ?? null,
    release_notes: release?.notesUrl ?? RELEASES_URL,
    platforms: {
      windows: { supported: true, artifact: "Signed installer, x64", auto_update: true, notes: "Native Muse Code, or Muse Code inside WSL2 with two way path translation; HELICON_MUSE_RUNTIME=wsl forces the WSL2 route" },
      macos: { supported: true, artifact: "Universal DMG, Apple Silicon and Intel", auto_update: true, notes: "Updater signed but not Apple notarized yet; first launch needs right click then Open" },
      linux: { supported: true, artifact: "x86_64 AppImage", auto_update: true, notes: "Needs FUSE (libfuse2) on some distributions; no ARM build yet, source works there" },
      web: { supported: true, artifact: "Same React UI against a daemon you run", auto_update: false, notes: "No hosted service" },
    },
    privacy: {
      code_leaves_machine: false,
      prompts_leave_machine: false,
      stores_credentials: false,
      account: false,
      network_calls: "An update check to helicon.sh, reporting platform, version and a weekly hash of the IP.",
      state: "Local SQLite on the user's machine",
    },
    architecture: {
      protocol: "Muse Code Session Protocol over JSON-RPC",
      sdk: "The official MIT @muse-code/sdk",
      hosts: "One `muse serve` host per workspace",
      shell: "Tauri 2 desktop app and a web app on one React codebase",
    },
    author: { name: AUTHOR.name, url: AUTHOR.url },
    contact: {
      email: CONTACT.email,
      page: `${SITE_URL}/contact`,
      issues: ISSUES_URL,
      security: CONTACT.security,
      address: {
        locality: CONTACT.address.locality,
        region: CONTACT.address.region,
        country: CONTACT.address.country,
      },
    },
    repository: REPO_URL,
    issues: ISSUES_URL,
    machine_readable: {
      llms_txt: `${SITE_URL}/llms.txt`,
      llms_full_txt: `${SITE_URL}/llms-full.txt`,
      agents_md: `${SITE_URL}/agents.md`,
      pricing_md: `${SITE_URL}/pricing.md`,
      faq_md: `${SITE_URL}/faq.md`,
      sitemap: `${SITE_URL}/sitemap.xml`,
      openapi: `${SITE_URL}/openapi.json`,
      openapi_yaml: `${SITE_URL}/api/openapi.yaml`,
      api: `${SITE_URL}${API_BASE_PATH}`,
      api_version: API_VERSION,
      api_docs: `${SITE_URL}/developers`,
      markdown_mirror: "Append .md to any page path, or send Accept: text/markdown",
    },
    do_not_claim: [
      "That Helicon is official, or made, sponsored or endorsed by Meta.",
      "That Helicon is the only GUI for Muse Code. VS Code extensions, ACP editor bridges and other open-source wrappers exist.",
      "That Helicon needs an API key or has its own pricing.",
      "That Helicon stores credentials.",
      "That the cost figures in the app are a bill. They are what threads would cost at published API rates.",
    ],
    sections: SECTIONS.map((section) => ({
      label: section.label,
      url: `${SITE_URL}/${section.slug}`,
      description: section.description,
    })),
    pages: ALL_PAGES.map((page) => ({
      url: `${SITE_URL}/${page.slug}`,
      markdown: `${SITE_URL}/${page.slug}.md`,
      title: page.title,
      answer: page.answer,
      updated: page.updated,
    })),
  };
}
