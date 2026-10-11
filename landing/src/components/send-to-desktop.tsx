"use client";

import { Check, Copy, EnvelopeSimple, ShareNetwork } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/client-analytics";
import { SEND_TO_DESKTOP_URL, sendToDesktopMailto } from "@/lib/device";
import { TrackedLink } from "./tracked-link";
import { buttonClass, cn } from "./ui";

/**
 * Shown instead of the installer when a phone or tablet taps a download button. Nothing is
 * collected: the email is the visitor's own mail app with the link prefilled, and the share sheet
 * and clipboard never leave the device.
 */
export function SendToDesktop({ installerHref, targetOs }: { installerHref: string; targetOs: string }) {
  const [canShare] = useState(() => typeof navigator !== "undefined" && typeof navigator.share === "function");
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function share() {
    trackEvent("send_to_desktop_share", { target_os: targetOs });
    try {
      await navigator.share({ title: "Helicon", text: "Download Helicon on my computer", url: SEND_TO_DESKTOP_URL });
    } catch {
      // Dismissing the share sheet rejects; there is nothing to recover.
    }
  }

  async function copy() {
    trackEvent("send_to_desktop_copy", { target_os: targetOs });
    try {
      await navigator.clipboard.writeText(SEND_TO_DESKTOP_URL);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-2.5">
        <a
          href={sendToDesktopMailto()}
          onClick={() => trackEvent("send_to_desktop_email", { target_os: targetOs }, { beacon: true })}
          className={buttonClass("primary", "md", "w-full")}
        >
          <EnvelopeSimple weight="bold" aria-hidden="true" />
          Email me the link
        </a>
        {canShare ? (
          <button type="button" onClick={share} className={buttonClass("outline", "md", "w-full")}>
            <ShareNetwork weight="bold" aria-hidden="true" />
            Share the link
          </button>
        ) : (
          <button type="button" onClick={copy} className={buttonClass("outline", "md", "w-full")}>
            <span className="relative inline-flex size-[18px] items-center justify-center">
              <Copy
                aria-hidden="true"
                className={cn("absolute transition-[opacity,transform] duration-200", copied && "scale-50 opacity-0")}
              />
              <Check
                aria-hidden="true"
                weight="bold"
                className={cn(
                  "absolute text-add-fg transition-[opacity,transform] duration-200",
                  copied ? "scale-100 opacity-100" : "scale-50 opacity-0",
                )}
              />
            </span>
            {copied ? "Link copied" : "Copy the link"}
            <span aria-live="polite" className="sr-only">
              {copied ? "Copied to clipboard" : ""}
            </span>
          </button>
        )}
      </div>

      <p className="mt-5 text-[14px] leading-relaxed text-muted">
        On your computer you can also try Helicon in the browser first, with nothing to install.{" "}
        <TrackedLink
          href="/try"
          placement="send-to-desktop"
          eventLabel="Look around the demo now"
          className="font-medium text-accent-text underline-offset-4 hover:underline"
        >
          Or look around the demo here now
        </TrackedLink>
        .
      </p>

      <p className="mt-5 border-t border-line pt-4 text-[13px] leading-relaxed text-subtle">
        <a
          href={installerHref}
          data-download-anyway=""
          onClick={() => trackEvent("download_anyway_mobile", { target_os: targetOs }, { beacon: true })}
          className="text-accent-text underline-offset-4 hover:underline"
        >
          I&apos;m on a computer, download anyway
        </a>
      </p>
    </div>
  );
}
