"use client";

import { CheckCircle, DeviceMobile, X } from "@phosphor-icons/react";
import { Dialog } from "radix-ui";
import { useEffect, useState, type ReactNode } from "react";
import { trackEvent } from "@/lib/client-analytics";
import { classifyCta } from "@/lib/cta-events";
import { isHandheldBrowser } from "@/lib/device";
import { installerPath } from "@/lib/downloads";
import { parseVisitorOs } from "@/lib/os";
import type { InstallerOs } from "./download-next-steps";
import { SendToDesktop } from "./send-to-desktop";
import { TrackedLink } from "./tracked-link";

const LABEL: Record<InstallerOs, string> = { windows: "Windows", macos: "macOS" };

type Shown =
  | { mode: "steps"; os: InstallerOs }
  | { mode: "send"; os: InstallerOs; href: string };

/** The computer the visitor is on, when it is one that has an installer. */
function visitorInstallerOs(): InstallerOs | null {
  const uaData = (navigator as Navigator & { userAgentData?: { platform: string; mobile: boolean } }).userAgentData;
  const os = parseVisitorOs(navigator.userAgent, uaData ? { platform: uaData.platform, mobile: uaData.mobile } : undefined);
  return os === "windows" || os === "macos" ? os : null;
}

/**
 * "Your download is starting", shown after any click on an installer link.
 *
 * It listens on the document rather than wrapping each button, so every placement (hero, header,
 * install section, doc pages) gets it without touching the links or their analytics. On a
 * computer it never cancels the click: the browser still follows /download/<os>, the route still
 * records the download and redirects to the GitHub asset, and because that response is a file the
 * page stays put, with this dialog over it. The step copy is server-rendered and passed in per
 * installer.
 *
 * On a phone or tablet the click is cancelled instead and the dialog offers to send the link to a
 * computer, with a "download anyway" link (marked data-download-anyway) for anyone misdetected.
 */
export function DownloadStarted({ steps }: { steps: Record<InstallerOs, ReactNode> }) {
  const [shown, setShown] = useState<Shown | null>(null);
  const [visitorOs, setVisitorOs] = useState<InstallerOs | null>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      const link = (event.target as Element | null)?.closest?.("a[href]");
      const href = link?.getAttribute("href");
      if (!link || !href) return;
      const { event: name, properties } = classifyCta(href);
      if (name !== "download_click") return;
      const target = properties.target_os;
      if (target !== "windows" && target !== "macos") return;
      if (!link.hasAttribute("data-download-anyway") && isHandheldBrowser()) {
        event.preventDefault();
        setShown({ mode: "send", os: target, href });
        trackEvent("send_to_desktop_shown", {
          target_os: target,
          placement: link.getAttribute("data-ph-placement") ?? null,
        });
        return;
      }
      setVisitorOs(visitorInstallerOs());
      setShown({ mode: "steps", os: target });
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const os = shown?.os ?? null;
  const send = shown?.mode === "send";
  const wrongOs = shown?.mode === "steps" && visitorOs && visitorOs !== shown.os ? visitorOs : null;

  return (
    <Dialog.Root open={shown !== null} onOpenChange={(open) => (open ? null : setShown(null))}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay-fade fixed inset-0 z-[300] bg-[oklch(0.1_0.01_255/0.45)]" />
        <Dialog.Content className="modal-pop fixed top-1/2 left-1/2 z-[310] max-h-[calc(100dvh-32px)] w-[min(560px,calc(100%-16px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-raised p-5 text-fg shadow-pop outline-none sm:p-7">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-tint text-accent-text shadow-[inset_0_0_0_1px_var(--tint-strong)]"
            >
              {send ? <DeviceMobile weight="duotone" className="size-5" /> : <CheckCircle weight="duotone" className="size-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="font-headline text-[22px] leading-tight font-semibold tracking-[-0.01em] text-fg sm:text-[24px]">
                {send ? "Helicon runs on Windows, macOS and Linux" : "Your download is starting"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-[14.5px] leading-relaxed text-muted">
                {send
                  ? "It is a desktop app, so it can't install on a phone or tablet. Send yourself the link and open it on your computer."
                  : `Helicon for ${os ? LABEL[os] : "your computer"} is on its way. Three steps and you are in.`}
              </Dialog.Description>
              {wrongOs ? (
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
                  You look to be on {LABEL[wrongOs]}.{" "}
                  <TrackedLink
                    href={installerPath(wrongOs, "wrong-os-hint")}
                    placement="wrong-os-hint"
                    eventLabel={`Download for ${LABEL[wrongOs]}`}
                    className="font-medium text-accent-text underline-offset-4 hover:underline"
                  >
                    Get the {LABEL[wrongOs]} installer instead
                  </TrackedLink>
                </p>
              ) : null}
            </div>
            <Dialog.Close
              aria-label="Close"
              className="-mt-1 -mr-1 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-subtle transition-colors hover:bg-sunken hover:text-fg"
            >
              <X weight="bold" className="size-4" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div className="mt-6">
            {shown?.mode === "send" ? (
              <SendToDesktop installerHref={shown.href} targetOs={shown.os} />
            ) : os ? (
              steps[os]
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
