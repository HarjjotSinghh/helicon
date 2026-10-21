import { lazy } from "react";

// Screens that are not up at startup load after the first paint instead of with it. What's New
// carries the whole changelog. Render these inside a Suspense boundary.
export const WhatsNew = lazy(() => import("../components/app/WhatsNew.js").then((m) => ({ default: m.WhatsNew })));
export const SettingsPage = lazy(() =>
  import("../components/settings/SettingsPage.js").then((m) => ({ default: m.SettingsPage })),
);
export const UsagePage = lazy(() =>
  import("../components/usage/UsagePage.js").then((m) => ({ default: m.UsagePage })),
);
