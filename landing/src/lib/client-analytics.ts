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
  // Same-tab links (the installer downloads) unload the page right after the
  // click, so a normal XHR capture is dropped before it reaches PostHog. Send
  // the event with the beacon transport, which survives the navigation.
  posthog.capture(
    event,
    {
      ...properties,
      placement: extra.placement,
      ...(extra.label ? { cta_label: extra.label } : {}),
    },
    { transport: "sendBeacon" },
  );
}
