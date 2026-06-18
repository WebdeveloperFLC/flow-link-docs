/** Prevent Dialog dismiss/focus steal when interacting with portalled Select/Popover/Command layers. */
export function isNestedOverlayTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return !!(
    target.closest("[data-radix-select-content]") ||
    target.closest("[data-radix-popover-content]") ||
    target.closest('[role="listbox"]') ||
    target.closest('[role="dialog"]') ||
    target.closest("[cmdk-root]")
  );
}

export function preventDialogDismissOnNestedOverlay(event: Event): void {
  if (isNestedOverlayTarget(event.target)) {
    event.preventDefault();
  }
}
