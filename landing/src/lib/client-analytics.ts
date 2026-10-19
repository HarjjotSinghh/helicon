"use client";

import { classifyCta } from "./cta-events";
import { deviceClass } from "./device";
import { capture } from "./posthog-client";

export function trackEvent(
  event: string,
  properties?: Record<string, unknown>,
  options?: { beacon?: boolean },
) {
  capture(event, properties, options);
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
  const props = {
    ...properties,
    // A phone tap is a download_click that cannot lead to a download, so funnels filter on this.
    ...(event === "download_click" ? { device: deviceClass() } : {}),
    placement: extra.placement,
    ...(extra.label ? { cta_label: extra.label } : {}),
  };
  capture(event, props, { beacon: true });
}
