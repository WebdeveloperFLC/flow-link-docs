import { describe, expect, it } from "vitest";
import { isNestedOverlayTarget, preventDialogDismissOnNestedOverlay } from "@/lib/dialogOverlayGuard";

describe("dialogOverlayGuard", () => {
  it("detects radix select content as nested overlay", () => {
    const el = document.createElement("div");
    el.setAttribute("data-radix-select-content", "");
    const child = document.createElement("span");
    el.appendChild(child);
    document.body.appendChild(el);
    expect(isNestedOverlayTarget(child)).toBe(true);
    el.remove();
  });

  it("prevents dismiss when target is nested overlay", () => {
    const el = document.createElement("div");
    el.setAttribute("data-radix-popover-content", "");
    document.body.appendChild(el);
    const event = new Event("pointerdown", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "target", { value: el });
    preventDialogDismissOnNestedOverlay(event);
    expect(event.defaultPrevented).toBe(true);
    el.remove();
  });
});
