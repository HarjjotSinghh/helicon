"use client";

import type { ComponentProps } from "react";
import { trackHref } from "@/lib/client-analytics";

export function TrackedLink({
  placement,
  eventLabel,
  onClick,
  href,
  children,
  ...props
}: ComponentProps<"a"> & { placement: string; eventLabel?: string }) {
  const label =
    eventLabel ?? (typeof children === "string" ? children : undefined);
  return (
    <a
      {...props}
      href={href}
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
