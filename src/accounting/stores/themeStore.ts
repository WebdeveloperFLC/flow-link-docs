const KEY = "accounting:theme";

export type ThemeMode = "light" | "dark";

function apply(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (mode === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function getTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(KEY) as ThemeMode | null;
  if (saved === "light" || saved === "dark") return saved;
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function setTheme(mode: ThemeMode) {
  try { window.localStorage.setItem(KEY, mode); } catch {}
  apply(mode);
}

export function toggleTheme(): ThemeMode {
  const next: ThemeMode = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}

// Apply on import
if (typeof window !== "undefined") apply(getTheme());