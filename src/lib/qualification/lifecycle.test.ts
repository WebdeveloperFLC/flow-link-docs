import { describe, expect, it } from "vitest";
import {
  availableQualificationTransitions,
  isQualificationTransitionAllowed,
  isTerminalQualificationStatus,
} from "./lifecycle";

describe("qualification lifecycle", () => {
  it("defines terminal statuses", () => {
    expect(isTerminalQualificationStatus("CLOSED")).toBe(true);
    expect(isTerminalQualificationStatus("ACTIVE")).toBe(false);
    expect(isTerminalQualificationStatus("ON_HOLD")).toBe(false);
  });

  it("allows Draft to Active", () => {
    expect(isQualificationTransitionAllowed("DRAFT", "ACTIVE")).toBe(true);
  });

  it("blocks Active to Draft", () => {
    expect(isQualificationTransitionAllowed("ACTIVE", "DRAFT")).toBe(false);
  });

  it("allows Active ↔ On Hold", () => {
    expect(isQualificationTransitionAllowed("ACTIVE", "ON_HOLD")).toBe(true);
    expect(isQualificationTransitionAllowed("ON_HOLD", "ACTIVE")).toBe(true);
  });

  it("blocks Completed to On Hold", () => {
    expect(isQualificationTransitionAllowed("COMPLETED", "ON_HOLD")).toBe(false);
  });

  it("blocks terminal transitions", () => {
    expect(isQualificationTransitionAllowed("CANCELLED", "ACTIVE")).toBe(false);
  });

  it("lists available transitions from Active", () => {
    const next = availableQualificationTransitions("ACTIVE");
    expect(next).toContain("ON_HOLD");
    expect(next).toContain("COMPLETED");
    expect(next).not.toContain("DRAFT");
  });
});
