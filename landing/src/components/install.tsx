"use client";

import {
  Check,
  CheckCircle,
  Copy,
  DownloadSimple,
  ListChecks,
  TerminalWindow,
  WarningCircle,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { AppleLogo, LinuxLogo, WindowsLogo } from "./os-logos";
import { osesFor, type OsId } from "@/lib/site";
import { installerPath } from "@/lib/downloads";
import { parseVisitorOs } from "@/lib/os";
import { CellGrid, Rule, SectionHeading, bandX, buttonClass, cn } from "./ui";

const OS_ICONS: Record<OsId, typeof WindowsLogo> = {
  windows: WindowsLogo,
  macos: AppleLogo,
  linux: LinuxLogo,
};

function requirements(version: string | null) {
  return [
    "Node 22+ on the machine running the daemon.",
    "The muse CLI installed and logged in.",
    "Windows: Muse runs in WSL2 Ubuntu, routed by a sidecar.",
    "macOS builds are not notarized yet, so right-click, then Open.",
    version ? `Linux: run from source at v${version}.` : "Linux: run from source; there is no packaged build yet.",
  ];
}

const noop = () => () => {};

/** The visitor's platform, read on the client only so the server render stays stable. */
function detectOs(): OsId {
  const uaData = (navigator as Navigator & { userAgentData?: { platform: string; mobile: boolean } }).userAgentData;
  const os = parseVisitorOs(navigator.userAgent, uaData ? { platform: uaData.platform, mobile: uaData.mobile } : undefined);
  if (os === "macos" || os === "linux") return os;
  return "windows";
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : `Copy ${value}`}
      className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-md text-subtle transition-colors hover:bg-surface hover:text-fg"
    >
      <Copy
        aria-hidden="true"
        className={cn("size-4 transition-[opacity,transform] duration-200", copied && "scale-50 opacity-0")}
      />
      <Check
        aria-hidden="true"
        weight="bold"
        className={cn(
          "absolute size-4 text-add-fg transition-[opacity,transform] duration-200",
          copied ? "scale-100 opacity-100" : "scale-50 opacity-0",
        )}
      />
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </button>
  );
}

export function Install({ version }: { version: string | null }) {
  const oses = osesFor(version);
  const detected = useSyncExternalStore(noop, detectOs, () => "windows" as OsId);
  const [chosen, setOsId] = useState<OsId | null>(null);
  const osId = chosen ?? detected;
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const os = oses.find((o) => o.id === osId) ?? oses[0];

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const i = oses.findIndex((o) => o.id === osId);
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + oses.length) % oses.length;
    setOsId(oses[next].id);
    tabs.current[next]?.focus();
  }

  const OsIcon = OS_ICONS[os.id];

  return (
    <section id="install" aria-labelledby="install-title">
      <div data-stagger="80" className={`${bandX} py-14 sm:py-20`}>
      <div data-reveal="rise">
      <SectionHeading id="install-title" icon={<DownloadSimple weight="duotone" />} title="Install in a few minutes">
        Pick your platform. You need the muse CLI signed in first; Helicon uses that login.
      </SectionHeading>
      </div>

      <div
        role="tablist"
        aria-label="Platform"
        data-reveal
        onKeyDown={onKey}
        className="mt-10 inline-flex rounded-xl bg-sunken p-1 shadow-[inset_0_0_0_1px_var(--border)]"
      >
        {oses.map((o, i) => {
          const Ico = OS_ICONS[o.id];
          const selected = o.id === os.id;
          return (
            <button
              key={o.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              id={`os-tab-${o.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls="os-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => setOsId(o.id)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-[9px] px-4 text-[14px] font-medium transition-[background-color,color,box-shadow] duration-150",
                selected ? "bg-surface text-fg shadow-soft" : "text-muted hover:text-fg",
              )}
            >
              <Ico className="size-4" />
              {o.label}
            </button>
          );
        })}
      </div>
      </div>

      <Rule />
      <CellGrid className="lg:grid-cols-5">
        <div
          id="os-panel"
          role="tabpanel"
          aria-labelledby={`os-tab-${os.id}`}
          data-stagger="60"
          className="bg-bg px-5 py-10 sm:px-8 sm:py-12 lg:col-span-3 lg:px-12"
        >
          <div data-reveal className="flex items-center gap-3">
            <OsIcon className="size-7 text-fg" />
            <h3 className="font-headline text-[26px] font-semibold text-fg">{os.label}</h3>
          </div>
          <p data-reveal className="mt-3 max-w-[58ch] text-[16px] leading-relaxed text-muted">
            {os.summary}
          </p>

          <ol data-stagger="60" data-base="160" className="mt-6 space-y-3">
            {os.steps.map((step, i) => (
              <li key={step.text} data-reveal="slide" className="flex gap-3.5">
                <span
                  aria-hidden="true"
                  className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-tint text-[12.5px] font-semibold text-accent-text tabular-nums"
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] leading-relaxed text-fg">{step.text}</p>
                  {step.command ? (
                    <div className="mt-2 flex items-center gap-2 rounded-[10px] bg-sunken py-1 pr-1 pl-3 shadow-[inset_0_0_0_1px_var(--border)]">
                      <TerminalWindow aria-hidden="true" className="size-4 shrink-0 text-subtle" />
                      <code className="min-w-0 flex-1 overflow-x-auto py-1.5 text-[13.5px] whitespace-nowrap text-fg">
                        {step.command}
                      </code>
                      <CopyButton value={step.command} />
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>

          {os.note ? (
            <p key={`note-${os.id}`} data-reveal="scale" className="mt-6 flex gap-2.5 rounded-[10px] bg-warn-bg p-3.5 text-[14px] leading-relaxed text-fg">
              <WarningCircle aria-hidden="true" weight="duotone" className="mt-0.5 size-[18px] shrink-0 text-warn" />
              {os.note}
            </p>
          ) : null}

          {os.id !== "linux" ? (
            <a key={`download-${os.id}`} href={installerPath(os.id, "install")} className={buttonClass("primary", "md", "mt-7")}>
              <DownloadSimple weight="bold" aria-hidden="true" />
              Download for {os.label}
            </a>
          ) : null}
        </div>

        <aside
          aria-labelledby="req-title"
          data-stagger="45"
          className="bg-[color-mix(in_oklab,var(--bg-sidebar)_40%,var(--bg))] px-5 py-10 sm:px-8 sm:py-12 lg:col-span-2 lg:px-10"
        >
          <h3 id="req-title" data-reveal className="flex items-center gap-2.5 text-[17px] font-semibold text-fg">
            <ListChecks aria-hidden="true" weight="duotone" className="size-5 text-accent-text" />
            Requirements and caveats
          </h3>
          <ul className="mt-5 space-y-3.5">
            {requirements(version).map((r) => (
              <li key={r} data-reveal="slide" className="flex gap-2.5 text-[15px] leading-relaxed text-muted">
                <CheckCircle aria-hidden="true" weight="duotone" className="mt-0.5 size-[18px] shrink-0 text-accent-text" />
                {r}
              </li>
            ))}
          </ul>
        </aside>
      </CellGrid>
    </section>
  );
}
