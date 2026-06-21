import { describe, expect, it } from "vitest";
import {
  availableApplicationTransitions,
  isApplicationTransitionAllowed,
  isTerminalApplicationStatus,
} from "./lifecycle";

describe("application lifecycle", () => {
  it("defines terminal statuses", () => {
    expect(isTerminalApplicationStatus("CLOSED")).toBe(true);
    expect(isTerminalApplicationStatus("ACTIVE")).toBe(false);
    expect(isTerminalApplicationStatus("ON_HOLD")).toBe(false);
  });

  it("allows Draft to Active", () => {
    expect(isApplicationTransitionAllowed("DRAFT", "ACTIVE")).toBe(true);
  });

  it("blocks Active to Draft", () => {
    expect(isApplicationTransitionAllowed("ACTIVE", "DRAFT")).toBe(false);
  });

  it("allows Active ↔ On Hold", () => {
    expect(isApplicationTransitionAllowed("ACTIVE", "ON_HOLD")).toBe(true);
    expect(isApplicationTransitionAllowed("ON_HOLD", "ACTIVE")).toBe(true);
  });

  it("blocks Completed to On Hold", () => {
    expect(isApplicationTransitionAllowed("COMPLETED", "ON_HOLD")).toBe(false);
  });

  it("blocks terminal transitions", () => {
    expect(isApplicationTransitionAllowed("CANCELLED", "ACTIVE")).toBe(false);
  });

  it("lists available transitions from Active", () => {
    const next = availableApplicationTransitions("ACTIVE");
    expect(next).toContain("ON_HOLD");
    expect(next).toContain("COMPLETED");
    expect(next).not.toContain("DRAFT");
  });
});
