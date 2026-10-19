"use client";

import { CheckCircle, DeviceMobile, X } from "@phosphor-icons/react";
import { Dialog } from "radix-ui";
import type { ReactNode, RefObject } from "react";
import { installerPath } from "@/lib/downloads";
import type { InstallerOs } from "./download-next-steps";
import { SendToDesktop } from "./send-to-desktop";
import { TrackedLink } from "./tracked-link";

const LABEL: Record<InstallerOs, string> = { windows: "Windows", macos: "macOS" };

export type Shown =
  | { mode: "steps"; os: InstallerOs }
  | { mode: "send"; os: InstallerOs; href: string };

/** The dialog for download-started.tsx, loaded the first time an installer link is clicked. */
export default function DownloadDialog({
  shown,
  visitorOs,
  steps,
  onClose,
  opener,
}: {
  shown: Shown | null;
  visitorOs: InstallerOs | null;
  steps: Record<InstallerOs, ReactNode>;
  onClose: () => void;
  /** The installer link that was clicked; focus returns to it on close. */
  opener: RefObject<HTMLElement | null>;
}) {
  const os = shown?.os ?? null;
  const send = shown?.mode === "send";
  const wrongOs = shown?.mode === "steps" && visitorOs && visitorOs !== shown.os ? visitorOs : null;

  return (
    <Dialog.Root open={shown !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay-fade fixed inset-0 z-[300] bg-[oklch(0.1_0.01_255/0.45)]" />
        <Dialog.Content
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (opener.current?.isConnected) opener.current.focus();
          }}
          className="modal-pop fixed top-1/2 left-1/2 z-[310] max-h-[calc(100dvh-32px)] w-[min(560px,calc(100%-16px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-raised p-5 text-fg shadow-pop outline-none sm:p-7"
        >
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
