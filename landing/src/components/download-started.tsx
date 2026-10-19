"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { trackEvent } from "@/lib/client-analytics";
import { classifyCta } from "@/lib/cta-events";
import { isHandheldBrowser } from "@/lib/device";
import { parseVisitorOs } from "@/lib/os";
import type { InstallerOs } from "./download-next-steps";
import type { Shown } from "./download-dialog";

// The dialog (and the Radix code under it) loads on the first installer click, not with the page.
const loadDialog = () => import("./download-dialog");
const DownloadDialog = dynamic(loadDialog, { ssr: false });

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
  // Kept mounted after the first show, so closing still plays the exit animation.
  const [everShown, setEverShown] = useState(false);
  if (shown && !everShown) setEverShown(true);
  const [visitorOs, setVisitorOs] = useState<InstallerOs | null>(null);
  // The link that opened the dialog. There is no Dialog.Trigger, so focus goes back here by hand.
  const opener = useRef<HTMLElement | null>(null);

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
      // Links inside the dialog (wrong-OS installer, "download anyway") are gone once it updates.
      if (!link.closest('[role="dialog"]')) opener.current = link as HTMLElement;
      if (!link.hasAttribute("data-download-anyway") && isHandheldBrowser()) {
        event.preventDefault();
        setShown({ mode: "send", os: target, href });
        // The click was cancelled for the dialog; if its code will not load, follow the link after all.
        loadDialog().catch(() => {
          setShown(null);
          window.location.assign(href);
        });
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

  return shown || everShown ? (
    <DownloadDialog shown={shown} visitorOs={visitorOs} steps={steps} onClose={() => setShown(null)} opener={opener} />
  ) : null;
}
