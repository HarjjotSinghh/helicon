"use client";

import type { ComponentProps } from "react";
import { trackHref } from "@/lib/client-analytics";

export function TrackedLink({
  placement,
  eventLabel,
  onClick,
  href,
  rel,
  children,
  ...props
}: ComponentProps<"a"> & { placement: string; eventLabel?: string }) {
  const label =
    eventLabel ?? (typeof children === "string" ? children : undefined);
  return (
    <a
      {...props}
      href={href}
      // Installer routes redirect to GitHub release assets, so crawlers should not follow them.
      rel={href?.startsWith("/download/") ? "nofollow" : rel}
      data-ph-placement={placement}
      onClick={(event) => {
        if (href) trackHref(href, { placement, label });
        onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}
