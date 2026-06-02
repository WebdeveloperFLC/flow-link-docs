import { beforeEach, describe, expect, it, vi } from "vitest";

const addJournalSpy = vi.fn();
const apUpdateEqSpy = vi.fn();
const apUpdateSpy = vi.fn(() => ({ eq: apUpdateEqSpy }));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("./_hydrationGate", () => ({
  runWhenAuthReady: vi.fn(),
}));

vi.mock("./journalsStore", () => ({
  addJournal: addJournalSpy,
}));

vi.mock("./coaStore", () => ({
  getAccounts: vi.fn(() => [
    { id: "ap-1", code: "2000", name: "Accounts Payable", groupCode: "LIABILITY", typeCode: "AP", isPostable: true, status: "ACTIVE" },
    { id: "exp-1", code: "5000", name: "Expense", groupCode: "EXPENSE", typeCode: "EXPENSE", isPostable: true, status: "ACTIVE" },
    { id: "bank-1", code: "1000", name: "Bank", groupCode: "ASSET", typeCode: "BANK", isPostable: true, status: "ACTIVE" },
  ]),
}));

vi.mock("./bankAccountsStore", () => ({
  getBankAccounts: vi.fn(() => [{ id: "bank-acct-1", currency: "CAD", coaAccountId: "bank-1" }]),
}));

vi.mock("../lib/journalHelpers", () => ({
  toAccountType: vi.fn(() => "EXPENSE"),
  nextJournalNumber: vi.fn(() => "JE-0001"),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: "u-1" } } })),
    },
    from: (table: string) => {
      if (table === "accounting_ap_bills") {
        return {
          insert: vi.fn(async () => ({ error: null })),
          update: apUpdateSpy,
          select: vi.fn(async () => ({ data: [], error: null })),
          delete: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
        };
      }
      return {};
    },
  },
}));

describe("apBillsStore auto-post deferral", () => {
  beforeEach(() => {
    localStorage.clear();
    addJournalSpy.mockClear();
    apUpdateSpy.mockClear();
    apUpdateEqSpy.mockClear();
    apUpdateEqSpy.mockResolvedValue({ error: null });
    addJournalSpy.mockReturnValue({ id: "j-1" });
  });

  it("does not auto-post when DB update fails", async () => {
    apUpdateEqSpy.mockResolvedValueOnce({ error: { message: "db fail" } });
    const { addApBill, updateApBill } = await import("./apBillsStore");

    const bill = addApBill({
      billNumber: "B-1",
      vendor: "Vendor A",
      vendorCategory: "OTHER",
      entity: "Entity A",
      branch: "Branch A",
      branchCountry: "CA",
      description: "test",
      billDate: "2026-01-01",
      dueDate: "2026-01-05",
      currency: "CAD",
      subtotal: 100,
      taxCode: "HST",
      taxAmount: 13,
      totalAmount: 113,
      status: "DRAFT",
      linkedCOACode: "2000",
      linkedExpenseCOACode: "5000",
      linkedBankAccountId: "bank-acct-1",
      createdBy: "tester",
    });

    updateApBill(bill.id, { status: "APPROVED" });
    await new Promise((r) => setTimeout(r, 0));

    expect(addJournalSpy).not.toHaveBeenCalled();
  });

  it("auto-posts only after DB update succeeds", async () => {
    const { addApBill, updateApBill } = await import("./apBillsStore");
    const bill = addApBill({
      billNumber: "B-2",
      vendor: "Vendor B",
      vendorCategory: "OTHER",
      entity: "Entity A",
      branch: "Branch A",
      branchCountry: "CA",
      description: "test",
      billDate: "2026-01-01",
      dueDate: "2026-01-05",
      currency: "CAD",
      subtotal: 100,
      taxCode: "HST",
      taxAmount: 13,
      totalAmount: 113,
      status: "DRAFT",
      linkedCOACode: "2000",
      linkedExpenseCOACode: "5000",
      linkedBankAccountId: "bank-acct-1",
      createdBy: "tester",
    });

    updateApBill(bill.id, { status: "APPROVED" });
    await new Promise((r) => setTimeout(r, 0));

    expect(addJournalSpy).toHaveBeenCalledTimes(1);
  });
});
