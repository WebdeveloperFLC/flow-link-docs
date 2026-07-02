import { describe, it, expect } from "vitest";
import { payrollWorkflowGuide } from "./payrollWorkflowGuide";

describe("payrollWorkflowGuide", () => {
  it("maps each status to the correct next action", () => {
    expect(payrollWorkflowGuide("Draft").nextActionLabel).toBe("Process salary");
    expect(payrollWorkflowGuide("Processed").nextActionLabel).toBe("Approve");
    expect(payrollWorkflowGuide("Approved").nextActionLabel).toBe("Lock payroll");
    expect(payrollWorkflowGuide("Locked").nextActionLabel).toBe("Mark paid");
    expect(payrollWorkflowGuide("Paid").nextActionLabel).toBeNull();
  });

  it("marks the irreversible transitions", () => {
    expect(payrollWorkflowGuide("Draft").nextIrreversible).toBe(false);
    expect(payrollWorkflowGuide("Processed").nextIrreversible).toBe(false);
    expect(payrollWorkflowGuide("Approved").nextIrreversible).toBe(true);
    expect(payrollWorkflowGuide("Locked").nextIrreversible).toBe(true);
  });

  it("Paid is terminal with no next action", () => {
    const g = payrollWorkflowGuide("Paid");
    expect(g.isTerminal).toBe(true);
    expect(g.nextActionLabel).toBeNull();
    expect(g.nextHint).toBe("Disbursement complete");
  });

  it("unknown/empty status falls back to Draft-like guidance without crashing", () => {
    const g = payrollWorkflowGuide("");
    expect(g.nextActionLabel).toBe("Process salary");
    expect(g.isTerminal).toBe(false);
  });
});
