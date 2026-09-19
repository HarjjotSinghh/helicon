"use client";

import { ArrowUpRight, DownloadSimple } from "@phosphor-icons/react";
import Link from "next/link";
import { AppleLogo, GitHubLogo, LinuxLogo, WindowsLogo } from "../os-logos";
import { buttonClass } from "../ui";
import { TrackedLink } from "../tracked-link";
import { installerPath } from "@/lib/downloads";
import { useVisitorOs } from "@/lib/use-visitor-os";
import { REPO_URL } from "@/lib/site";

/**
 * The download button on a generated page. These pages are static, so the platform is resolved
 * on the client: until it is, the button says "Download" and goes to /install, which is correct
 * for everyone including a crawler. It never offers the wrong operating system.
 */
function primary(os: ReturnType<typeof useVisitorOs>) {
  switch (os) {
    case "windows":
      return { label: "Download for Windows", href: installerPath("windows", "doc-cta"), icon: <WindowsLogo className="size-[18px]" /> };
    case "macos":
      return { label: "Download for macOS", href: installerPath("macos", "doc-cta"), icon: <AppleLogo className="size-[18px]" /> };
    case "linux":
      return { label: "Get the AppImage", href: "/install/linux", icon: <LinuxLogo className="size-[18px]" /> };
    default:
      // Unknown: phones, tablets, crawlers, and the first paint before hydration.
      return { label: "Download", href: "/install", icon: <DownloadSimple weight="bold" /> };
  }
}

export function PlatformCta({ placement = "doc-cta" }: { placement?: string }) {
  const os = useVisitorOs();
  const cta = primary(os);
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
      <TrackedLink href={cta.href} placement={placement} eventLabel={cta.label} className={buttonClass("primary", "md")}>
        {cta.icon}
        {cta.label}
      </TrackedLink>
      <Link href="/install" className={buttonClass("outline", "md")}>
        <DownloadSimple weight="bold" aria-hidden="true" />
        All platforms
      </Link>
      <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost", "md")}>
        <GitHubLogo aria-hidden="true" />
        View source
        <ArrowUpRight
          aria-hidden="true"
          className="!size-3 text-subtle transition-transform duration-200 ease-out [@media(hover:hover)]:group-hover/btn:translate-x-0.5 [@media(hover:hover)]:group-hover/btn:-translate-y-0.5"
        />
      </a>
    </div>
  );
}

/** The header download button on generated pages, same reasoning, smaller. */
export function PlatformHeaderCta() {
  const os = useVisitorOs();
  const cta = primary(os);
  return (
    <TrackedLink
      href={cta.href}
      placement="header"
      eventLabel={cta.label}
      className={buttonClass("primary", "sm", "ml-0 min-h-11 px-3 sm:ml-1.5 sm:min-h-0")}
    >
      <DownloadSimple weight="bold" aria-hidden="true" />
      Download
    </TrackedLink>
  );
}
