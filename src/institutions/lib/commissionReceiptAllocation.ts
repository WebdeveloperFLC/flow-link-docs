/**
 * Receipt wizard allocation helpers — single source of truth for UI + save payload.
 */

export interface ReceiptStudentLike {
  id: string;
  invoice_id: string | null;
  commission_amount: number | null;
  expected_amount: number | null;
  amended_expected_amount: number | null;
  amount_outstanding: number | null;
  amount_received?: number | null;
  commission_snapshot_id?: string | null;
}

export interface InvoiceAllocLike {
  invoice_id: string;
  amount_allocated: number;
  allocation_id?: string;
}

export interface StudentAllocLike {
  invoice_allocation_id: string;
  student_commission_id: string;
  amount_allocated: number;
  snapshot_id?: string | null;
}

/** Gross expected — mirrors fn_student_commission_expected (incl. outstanding fallback). */
export function studentGrossExpected(student: ReceiptStudentLike): number {
  const fromFields = Number(
    student.amended_expected_amount ?? student.expected_amount ?? student.commission_amount ?? 0,
  );
  if (fromFields > 0) return fromFields;
  const outstanding = Number(student.amount_outstanding ?? 0);
  const received = Number(student.amount_received ?? 0);
  if (outstanding > 0 || received > 0) return outstanding + received;
  return 0;
}

/** Open balance shown in Step 3 — mirrors fn_student_commission_open_balance for a fresh receipt. */
export function studentOpenBalance(
  student: ReceiptStudentLike,
  otherDraftAllocated = 0,
  postedAllocated = Number(student.amount_received ?? 0),
): number {
  const fromOutstanding = student.amount_outstanding;
  if (fromOutstanding != null && Number.isFinite(Number(fromOutstanding))) {
    return Math.max(Number(fromOutstanding) - otherDraftAllocated, 0);
  }
  return Math.max(studentGrossExpected(student) - postedAllocated - otherDraftAllocated, 0);
}

export function remapStudentAllocsAfterInvoiceSave(
  studentAllocs: StudentAllocLike[],
  prevInvoiceAllocs: InvoiceAllocLike[],
  nextInvoiceAllocs: InvoiceAllocLike[],
  students: ReceiptStudentLike[],
): StudentAllocLike[] {
  const oldIaToInvoice = new Map<string, string>();
  for (const row of prevInvoiceAllocs) {
    if (row.allocation_id) oldIaToInvoice.set(row.allocation_id, row.invoice_id);
  }
  for (const row of nextInvoiceAllocs) {
    if (row.allocation_id) oldIaToInvoice.set(row.allocation_id, row.invoice_id);
  }

  const invoiceToNewIa = new Map<string, string>();
  for (const row of nextInvoiceAllocs) {
    if (row.allocation_id) invoiceToNewIa.set(row.invoice_id, row.allocation_id);
  }

  const studentToInvoice = new Map(students.map((s) => [s.id, s.invoice_id]));

  return studentAllocs
    .map((alloc) => {
      const invoiceId =
        oldIaToInvoice.get(alloc.invoice_allocation_id) ??
        studentToInvoice.get(alloc.student_commission_id) ??
        null;
      if (!invoiceId) return null;
      const newIaId = invoiceToNewIa.get(invoiceId);
      if (!newIaId) return null;
      return { ...alloc, invoice_allocation_id: newIaId };
    })
    .filter((row): row is StudentAllocLike => row != null);
}

export function resolveStudentAllocInvoiceAllocationId(
  alloc: StudentAllocLike,
  invoiceAllocs: InvoiceAllocLike[],
  students: ReceiptStudentLike[],
): string | null {
  const direct = invoiceAllocs.find((ia) => ia.allocation_id === alloc.invoice_allocation_id);
  if (direct?.allocation_id) return direct.allocation_id;

  const student = students.find((s) => s.id === alloc.student_commission_id);
  if (!student?.invoice_id) return null;
  return invoiceAllocs.find((ia) => ia.invoice_id === student.invoice_id)?.allocation_id ?? null;
}

export function buildStudentAllocSavePayload(
  studentAllocs: StudentAllocLike[],
  invoiceAllocs: InvoiceAllocLike[],
  students: ReceiptStudentLike[],
): Array<{
  invoice_allocation_id: string;
  student_commission_id: string;
  amount_allocated: number;
  snapshot_id: string | null;
  allocation_method: string;
}> {
  return studentAllocs
    .filter((a) => a.amount_allocated > 0)
    .map((a) => {
      const invoiceAllocationId = resolveStudentAllocInvoiceAllocationId(a, invoiceAllocs, students);
      if (!invoiceAllocationId) {
        throw new Error("Student allocation is missing a saved invoice slice — return to Invoices and continue.");
      }
      const st = students.find((s) => s.id === a.student_commission_id);
      return {
        invoice_allocation_id: invoiceAllocationId,
        student_commission_id: a.student_commission_id,
        amount_allocated: a.amount_allocated,
        snapshot_id: st?.commission_snapshot_id ?? null,
        allocation_method: "manual",
      };
    });
}

export function validateStudentAllocOpenBalances(
  studentAllocs: StudentAllocLike[],
  invoiceAllocs: InvoiceAllocLike[],
  students: ReceiptStudentLike[],
): { ok: true } | { ok: false; message: string } {
  for (const alloc of studentAllocs.filter((a) => a.amount_allocated > 0)) {
    const student = students.find((s) => s.id === alloc.student_commission_id);
    if (!student) {
      return { ok: false, message: "Student row missing for allocation — refresh and try again." };
    }
    const open = studentOpenBalance(student);
    if (alloc.amount_allocated > open + 0.001) {
      return {
        ok: false,
        message: `Allocation ${alloc.amount_allocated} exceeds open balance ${open.toFixed(2)} for student.`,
      };
    }
    const iaId = resolveStudentAllocInvoiceAllocationId(alloc, invoiceAllocs, students);
    if (!iaId) {
      return {
        ok: false,
        message: "Invoice allocation ID is stale — return to Invoices, click Next, then re-enter student splits.",
      };
    }
  }
  return { ok: true };
}
