import { ArrowRight, ArrowUpRight, Code, Globe } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import { RELEASES_URL, VSCODE_MARKETPLACE_URL } from "@/lib/site";
import { TrackedLink } from "./tracked-link";
import { buttonClass } from "./ui";

export type InstallerOs = "windows" | "macos";

const PLACEMENT = "download-started";

/** First step, per installer. Every caveat here matches how the release is built today. */
const OPEN_INSTALLER: Record<InstallerOs, { title: string; body: ReactNode }> = {
  windows: {
    title: "Run the installer",
    body: (
      <>
        Open <Mono>Helicon_*_x64-setup.exe</Mono> from your downloads. It is not code signed yet, so if
        SmartScreen says Windows protected your PC, click More info, then Run anyway.
      </>
    ),
  },
  macos: {
    title: "Drag Helicon to Applications",
    body: (
      <>
        Open the DMG and drag Helicon into Applications. It is not notarized yet: on macOS 15 or later, click
        Done on the first warning, then System Settings &gt; Privacy &amp; Security &gt; Open Anyway. On macOS 14
        or earlier, right-click Helicon, then Open.
      </>
    ),
  },
};

function Mono({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md bg-sunken px-1.5 py-0.5 font-mono text-[13px] text-fg shadow-[inset_0_0_0_1px_var(--border)]">
      {children}
    </code>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3.5">
      <span
        aria-hidden="true"
        className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-tint text-[12.5px] font-semibold text-accent-text tabular-nums"
      >
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-fg">{title}</p>
        <p className="mt-1 text-[14px] leading-relaxed text-muted">{children}</p>
      </div>
    </li>
  );
}

/**
 * What to do once the installer is downloading. Rendered on the server, one copy per installer,
 * and shown by the download dialog after a click on any /download/windows or /download/macos link.
 */
export function DownloadNextSteps({ os }: { os: InstallerOs }) {
  const first = OPEN_INSTALLER[os];
  return (
    <div>
      <ol className="space-y-4">
        <Step n={1} title={first.title}>
          {first.body}
        </Step>
        <Step n={2} title="Install the muse CLI and sign in">
          Skip this if <Mono>muse login</Mono> already works in your terminal. Otherwise follow the{" "}
          <a href={`/install/${os}`} className="text-accent-text hover:underline">
            {os === "windows" ? "Windows" : "macOS"} install guide
          </a>
          . It needs a Muse Code plan or pay-as-you-go billing.
        </Step>
        <Step n={3} title="Open a project in Helicon">
          Launch Helicon and add a project folder. It uses your muse login, so there is no account to create.
        </Step>
      </ol>

      <div className="mt-6 flex flex-col gap-2 border-t border-line pt-5 sm:flex-row sm:flex-wrap">
        <TrackedLink
          href={VSCODE_MARKETPLACE_URL}
          target="_blank"
          rel="noopener noreferrer"
          placement={PLACEMENT}
          eventLabel="VS Code Marketplace"
          className={buttonClass("outline", "sm", "w-full sm:w-auto")}
        >
          <Code weight="duotone" aria-hidden="true" />
          Prefer VS Code? Get the extension
          <ArrowUpRight aria-hidden="true" className="!size-3 text-subtle" />
        </TrackedLink>
        <TrackedLink
          href="/try"
          placement={PLACEMENT}
          eventLabel="Try it in the browser first"
          className={buttonClass("ghost", "sm", "w-full sm:w-auto")}
        >
          <Globe weight="duotone" aria-hidden="true" />
          Try it in the browser first
          <ArrowRight aria-hidden="true" className="!size-3 text-subtle" />
        </TrackedLink>
      </div>

      <p className="mt-4 text-[13px] leading-relaxed text-subtle">
        Download did not start?{" "}
        <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer" className="text-accent-text hover:underline">
          Get it from the latest GitHub release
        </a>
        .
      </p>
    </div>
  );
}
