import { describe, expect, it } from "vitest";
import {
  buildStudentAllocSavePayload,
  remapStudentAllocsAfterInvoiceSave,
  resolveStudentAllocInvoiceAllocationId,
  studentGrossExpected,
  studentOpenBalance,
  validateStudentAllocOpenBalances,
} from "./commissionReceiptAllocation";
import { validateStudentAllocationsMatchInvoice } from "./commissionReceiptRules";

const students = [
  {
    id: "s-arjun",
    invoice_id: "inv-sen",
    student_name: "Arjun",
    commission_amount: null,
    expected_amount: null,
    amended_expected_amount: null,
    amount_outstanding: 2715,
    amount_received: 0,
  },
  {
    id: "s-priya",
    invoice_id: "inv-sen",
    student_name: "Priya",
    commission_amount: null,
    expected_amount: null,
    amended_expected_amount: null,
    amount_outstanding: 2520,
    amount_received: 0,
  },
  {
    id: "s-chidera",
    invoice_id: "inv-sen",
    student_name: "Chidera",
    commission_amount: null,
    expected_amount: null,
    amended_expected_amount: null,
    amount_outstanding: 2812.5,
    amount_received: 0,
  },
  {
    id: "s-nguyen",
    invoice_id: "inv-sen",
    student_name: "Nguyen",
    commission_amount: null,
    expected_amount: null,
    amended_expected_amount: null,
    amount_outstanding: 2812.5,
    amount_received: 0,
  },
];

describe("commissionReceiptAllocation", () => {
  it("derives gross expected from outstanding when lifecycle columns are empty", () => {
    expect(studentGrossExpected(students[0])).toBe(2715);
    expect(studentOpenBalance(students[0])).toBe(2715);
  });

  it("remaps student allocations when invoice allocation ids are recreated", () => {
    const prevInvoiceAllocs = [{ invoice_id: "inv-sen", amount_allocated: 10860, allocation_id: "ia-old" }];
    const nextInvoiceAllocs = [{ invoice_id: "inv-sen", amount_allocated: 10860, allocation_id: "ia-new" }];
    const studentAllocs = [
      { invoice_allocation_id: "ia-old", student_commission_id: "s-arjun", amount_allocated: 2715 },
      { invoice_allocation_id: "ia-old", student_commission_id: "s-priya", amount_allocated: 2520 },
    ];

    const remapped = remapStudentAllocsAfterInvoiceSave(
      studentAllocs,
      prevInvoiceAllocs,
      nextInvoiceAllocs,
      students,
    );

    expect(remapped).toEqual([
      { invoice_allocation_id: "ia-new", student_commission_id: "s-arjun", amount_allocated: 2715 },
      { invoice_allocation_id: "ia-new", student_commission_id: "s-priya", amount_allocated: 2520 },
    ]);
  });

  it("resolves stale invoice_allocation_id via student invoice_id", () => {
    const invoiceAllocs = [{ invoice_id: "inv-sen", amount_allocated: 10860, allocation_id: "ia-new" }];
    const resolved = resolveStudentAllocInvoiceAllocationId(
      { invoice_allocation_id: "ia-deleted", student_commission_id: "s-arjun", amount_allocated: 2715 },
      invoiceAllocs,
      students,
    );
    expect(resolved).toBe("ia-new");
  });

  it("validates full allocation for SEN-001 scenario", () => {
    const invoiceAllocs = [{ invoice_id: "inv-sen", amount_allocated: 10860, allocation_id: "ia-new" }];
    const studentAllocs = [
      { invoice_allocation_id: "ia-new", student_commission_id: "s-arjun", amount_allocated: 2715 },
      { invoice_allocation_id: "ia-new", student_commission_id: "s-priya", amount_allocated: 2520 },
      { invoice_allocation_id: "ia-new", student_commission_id: "s-chidera", amount_allocated: 2812.5 },
      { invoice_allocation_id: "ia-new", student_commission_id: "s-nguyen", amount_allocated: 2812.5 },
    ];

    const match = validateStudentAllocationsMatchInvoice("ia-new", 10860, studentAllocs);
    expect(match.ok).toBe(true);
    expect(validateStudentAllocOpenBalances(studentAllocs, invoiceAllocs, students)).toEqual({ ok: true });
    expect(buildStudentAllocSavePayload(studentAllocs, invoiceAllocs, students)).toHaveLength(4);
  });

  it("allows partial allocation (short-pay slice)", () => {
    const invoiceAllocs = [{ invoice_id: "inv-sen", amount_allocated: 5000, allocation_id: "ia-new" }];
    const studentAllocs = [
      { invoice_allocation_id: "ia-new", student_commission_id: "s-arjun", amount_allocated: 2500 },
      { invoice_allocation_id: "ia-new", student_commission_id: "s-priya", amount_allocated: 2500 },
    ];
    expect(validateStudentAllocOpenBalances(studentAllocs, invoiceAllocs, students)).toEqual({ ok: true });
  });

  it("rejects allocation above open balance (matches backend guard)", () => {
    const invoiceAllocs = [{ invoice_id: "inv-sen", amount_allocated: 3000, allocation_id: "ia-new" }];
    const studentAllocs = [
      { invoice_allocation_id: "ia-new", student_commission_id: "s-arjun", amount_allocated: 3000 },
    ];
    const result = validateStudentAllocOpenBalances(studentAllocs, invoiceAllocs, students);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("exceeds open balance");
  });

  it("rejects stale invoice allocation ids before save", () => {
    const invoiceAllocs = [{ invoice_id: "inv-other", amount_allocated: 100, allocation_id: "ia-new" }];
    const studentAllocs = [
      { invoice_allocation_id: "ia-deleted", student_commission_id: "s-arjun", amount_allocated: 100 },
    ];
    expect(() => buildStudentAllocSavePayload(studentAllocs, invoiceAllocs, students)).toThrow(
      /missing a saved invoice slice/i,
    );
  });

  it("supports resume draft payload after id remap", () => {
    const prevInvoiceAllocs = [{ invoice_id: "inv-sen", amount_allocated: 10860, allocation_id: "ia-resume-old" }];
    const nextInvoiceAllocs = [{ invoice_id: "inv-sen", amount_allocated: 10860, allocation_id: "ia-resume-new" }];
    const resumed = [
      { invoice_allocation_id: "ia-resume-old", student_commission_id: "s-arjun", amount_allocated: 2715 },
      { invoice_allocation_id: "ia-resume-old", student_commission_id: "s-priya", amount_allocated: 2520 },
    ];
    const remapped = remapStudentAllocsAfterInvoiceSave(resumed, prevInvoiceAllocs, nextInvoiceAllocs, students);
    const payload = buildStudentAllocSavePayload(remapped, nextInvoiceAllocs, students);
    expect(payload.every((row) => row.invoice_allocation_id === "ia-resume-new")).toBe(true);
  });
});
