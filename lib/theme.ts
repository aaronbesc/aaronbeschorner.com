// Light / dark / system preference, saved in this browser. It sets
// <html data-theme="light|dark">, which switches the palette in globals.css.
export type Theme = "light" | "dark" | "system";

const KEY = "theme";
const listeners = new Set<() => void>();

/**
 * Inlined in <head> so the saved or system theme is in place before the
 * first paint; without it, dark-mode visitors would see a flash of light.
 * Mirrors getTheme() + applyTheme().
 */
export const THEME_SCRIPT = `(() => {
  let dark = false;
  try {
    const saved = localStorage.getItem("${KEY}");
    dark = saved === "dark" || (saved !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  } catch {}
  document.documentElement.dataset.theme = dark ? "dark" : "light";
})();`;

const systemDark = () => window.matchMedia("(prefers-color-scheme: dark)");

export function getTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && systemDark().matches);
  const next = dark ? "dark" : "light";
  const root = document.documentElement;
  if (root.dataset.theme === next) return;

  // Swap every color at once. Otherwise elements with color transitions
  // (buttons, links) fade while everything else jumps.
  const freeze = document.createElement("style");
  freeze.textContent = "*, *::before, *::after { transition: none !important; }";
  document.head.append(freeze);
  root.dataset.theme = next;
  window.getComputedStyle(root).getPropertyValue("color"); // apply while frozen
  requestAnimationFrame(() => freeze.remove());
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
