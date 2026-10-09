"use client";

import { CheckCircle, X } from "@phosphor-icons/react";
import { Dialog } from "radix-ui";
import { useEffect, useState, type ReactNode } from "react";
import { classifyCta } from "@/lib/cta-events";
import type { InstallerOs } from "./download-next-steps";

const LABEL: Record<InstallerOs, string> = { windows: "Windows", macos: "macOS" };

/**
 * "Your download is starting", shown after any click on an installer link.
 *
 * It listens on the document rather than wrapping each button, so every placement (hero, header,
 * install section, doc pages) gets it without touching the links or their analytics. It never
 * cancels the click: the browser still follows /download/<os>, the route still records the
 * download and redirects to the GitHub asset, and because that response is a file the page stays
 * put, with this dialog over it. The step copy is server-rendered and passed in per installer.
 */
export function DownloadStarted({ steps }: { steps: Record<InstallerOs, ReactNode> }) {
  const [os, setOs] = useState<InstallerOs | null>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      const link = (event.target as Element | null)?.closest?.("a[href]");
      const href = link?.getAttribute("href");
      if (!href) return;
      const { event: name, properties } = classifyCta(href);
      if (name !== "download_click") return;
      const target = properties.target_os;
      if (target === "windows" || target === "macos") setOs(target);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <Dialog.Root open={os !== null} onOpenChange={(open) => (open ? null : setOs(null))}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay-fade fixed inset-0 z-[300] bg-[oklch(0.1_0.01_255/0.45)]" />
        <Dialog.Content className="modal-pop fixed top-1/2 left-1/2 z-[310] max-h-[calc(100dvh-32px)] w-[min(560px,calc(100%-16px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-raised p-5 text-fg shadow-pop outline-none sm:p-7">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-tint text-accent-text shadow-[inset_0_0_0_1px_var(--tint-strong)]"
            >
              <CheckCircle weight="duotone" className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="font-headline text-[22px] leading-tight font-semibold tracking-[-0.01em] text-fg sm:text-[24px]">
                Your download is starting
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-[14.5px] leading-relaxed text-muted">
                Helicon for {os ? LABEL[os] : "your computer"} is on its way. Three steps and you are in.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="-mt-1 -mr-1 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-subtle transition-colors hover:bg-sunken hover:text-fg"
            >
              <X weight="bold" className="size-4" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div className="mt-6">{os ? steps[os] : null}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
