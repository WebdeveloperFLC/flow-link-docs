import { useEffect, type RefObject } from "react";

/**
 * Focus a search input when the user presses "/" — the near-universal
 * "jump to search" shortcut in premium web apps (GitHub, Linear, Slack).
 *
 * Ignores the keypress while the user is already typing in a field, and lets
 * modifier combos (Cmd/Ctrl/Alt) pass through so it never fights native
 * shortcuts. Purely a focus convenience — no data or business-logic impact.
 */
export function useFocusSearchHotkey(ref: RefObject<HTMLInputElement>) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }
      const el = ref.current;
      if (el) {
        e.preventDefault();
        el.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [ref]);
}
