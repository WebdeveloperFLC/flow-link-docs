import { useEffect } from "react";

interface Options {
  onNew?: () => void;
  onSearch?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts({ onNew, onSearch, onEscape }: Options) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      const inEditable =
        tag === "input" || tag === "textarea" || tag === "select" ||
        (e.target as HTMLElement | null)?.isContentEditable;

      if (e.key === "Escape") { onEscape?.(); return; }
      if (inEditable) return;
      if (e.key === "/") {
        const el = document.querySelector<HTMLInputElement>("[data-search]");
        if (el) { e.preventDefault(); el.focus(); return; }
        if (onSearch) { e.preventDefault(); onSearch(); }
      }
      if (e.key.toLowerCase() === "n") {
        if (onNew) { e.preventDefault(); onNew(); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onNew, onSearch, onEscape]);
}