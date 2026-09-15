/**
 * The page theme preference: "system" (the default, nothing stored), "light" or "dark".
 * The pre-paint script in layout.tsx reads the same key, so a saved choice survives reloads.
 */
export type ThemePref = "system" | "light" | "dark";

export const THEME_KEY = "helicon-theme";
const EVENT = "helicon-theme-change";

export function readThemePref(): ThemePref {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

function systemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Applies a preference to <html>, saves it, and tells every listener on the page. */
export function setThemePref(pref: ThemePref) {
  try {
    if (pref === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch {
    /* storage unavailable: the choice lasts for this page view */
  }
  document.documentElement.setAttribute("data-theme", pref === "system" ? systemTheme() : pref);
  window.dispatchEvent(new Event(EVENT));
}

/** Follows preference changes from this tab, other tabs, and the OS while on "system". */
export function subscribeThemePref(notify: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystem = () => {
    if (readThemePref() === "system") document.documentElement.setAttribute("data-theme", systemTheme());
    notify();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_KEY) return;
    const pref = readThemePref();
    document.documentElement.setAttribute("data-theme", pref === "system" ? systemTheme() : pref);
    notify();
  };
  mq.addEventListener("change", onSystem);
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, notify);
  return () => {
    mq.removeEventListener("change", onSystem);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, notify);
  };
}
