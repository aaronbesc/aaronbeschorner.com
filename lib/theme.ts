// Light / dark / system preference, saved in this browser. It marks
// <html data-theme="light|dark"> for the palettes to hook into; there is no
// dark palette yet, so for now the choice is only remembered.
export type Theme = "light" | "dark" | "system";

const KEY = "theme";
const listeners = new Set<() => void>();

const systemDark = () => window.matchMedia("(prefers-color-scheme: dark)");

export function getTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && systemDark().matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

export function setTheme(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    // Storage can be blocked; the choice then lasts until reload.
  }
  applyTheme(theme);
  for (const listener of listeners) listener();
}

/** For useSyncExternalStore; also follows the OS setting and other tabs. */
export function subscribeTheme(onChange: () => void) {
  const media = systemDark();
  const sync = () => {
    applyTheme(getTheme());
    onChange();
  };
  listeners.add(onChange);
  media.addEventListener("change", sync);
  window.addEventListener("storage", sync);
  return () => {
    listeners.delete(onChange);
    media.removeEventListener("change", sync);
    window.removeEventListener("storage", sync);
  };
}
