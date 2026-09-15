"use client";

import posthog from "posthog-js";
import { classifyCta } from "./cta-events";

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  posthog.capture(event, properties);
}

export function trackHref(
  href: string,
  extra: { placement: string; label?: string },
) {
  const { event, properties } = classifyCta(href);
  if (!event) return;
  posthog.capture(event, {
    ...properties,
    placement: extra.placement,
    ...(extra.label ? { cta_label: extra.label } : {}),
  });
}
