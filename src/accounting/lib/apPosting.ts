import { supabase } from "@/integrations/supabase/client";
import { postJournal, type PostingLeg } from "./journalEngine";
import { inputTaxLegs, withholdingLegs, type TaxCalc } from "./taxEngine";
import type { Journal } from "../data/mockJournals";

/**
 * AP Posting (Phase 1).
 *
 * Bill accrual:  DR expense (+ recoverable input tax)  CR AP  (CR TDS if withheld)
 * Payment:       DR AP (gross cleared)  CR bank (cash)  CR TDS payable (withheld)
 *
 * Payments allocate across one or more bills (partial payments), updating
 * each bill's paid/outstanding and status.
 */

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

// ── Pure leg builders ────────────────────────────────────────────────

export interface BillAccrualArgs {
  net: number;
  expenseRoleKey?: string;
  expenseAccountCode?: string;
  inputTax?: TaxCalc;
  tds?: TaxCalc;
  apRoleKey?: string;
}

/** Build the balanced legs for a vendor bill accrual. */
export function apBillAccrualLegs(args: BillAccrualArgs): PostingLeg[] {
  const apRole = args.apRoleKey || "AP_TRADE";
  const net = round2(args.net);
  const taxTotal = round2(args.inputTax?.totalTax ?? 0);
  const tdsTotal = round2(args.tds?.totalTax ?? 0);
  const apCredit = round2(net + taxTotal - tdsTotal);

  const legs: PostingLeg[] = [];
  legs.push({
    roleKey: args.expenseRoleKey,
    accountCode: args.expenseRoleKey ? undefined : args.expenseAccountCode,
    drCr: "DR",
    amount: net,
    description: "Vendor bill expense",
  });
  if (args.inputTax) legs.push(...inputTaxLegs(args.inputTax, "Input tax credit"));
  legs.push({ roleKey: apRole, drCr: "CR", amount: apCredit, description: "Accounts payable" });
  if (args.tds) legs.push(...withholdingLegs(args.tds, "TDS withheld"));
  return legs;
}

export interface PaymentLegArgs {
  /** Cash actually paid. */
  cash: number;
  /** Withholding deducted at payment, if any. */
  tds?: TaxCalc;
  apRoleKey?: string;
  bankRoleKey?: string;
}

/** Build the balanced legs for a vendor payment. */
export function apPaymentLegs(args: PaymentLegArgs): PostingLeg[] {
  const apRole = args.apRoleKey || "AP_TRADE";
  const bankRole = args.bankRoleKey || "BANK_OPERATING";
  const cash = round2(args.cash);
  const tdsTotal = round2(args.tds?.totalTax ?? 0);
  const grossCleared = round2(cash + tdsTotal);

  const legs: PostingLeg[] = [
    { roleKey: apRole, drCr: "DR", amount: grossCleared, description: "Settle accounts payable" },
    { roleKey: bankRole, drCr: "CR", amount: cash, description: "Bank payment" },
  ];
  if (args.tds) legs.push(...withholdingLegs(args.tds, "TDS withheld at payment"));
  return legs;
}

// ── Orchestration ────────────────────────────────────────────────────

export interface ApPaymentAllocation {
  billId: string;
  /** Gross amount applied to the bill's outstanding. */
  amount: number;
}

export interface PostApPaymentInput {
  vendorId?: string;
  vendorName: string;
  entityId: string;
  branchId: string;
  currency: string;
  /** Cash actually paid. */
  amount: number;
  tdsAmount?: number;
  tdsRoleKey?: string;
  bankRoleKey?: string;
  apRoleKey?: string;
  postingDate: string;
  paymentMethod?: string;
  reference?: string;
  attachmentPath?: string;
  allocations: ApPaymentAllocation[];
}

/**
 * Record a vendor payment across one or more bills (partial payments
 * supported), post the journal, and update each bill's balances.
 */
export async function postApPayment(input: PostApPaymentInput): Promise<{ journal: Journal; paymentId: string }> {
  const cash = round2(input.amount);
  const tds = round2(input.tdsAmount ?? 0);
  const grossCleared = round2(input.allocations.reduce((s, a) => s + round2(a.amount), 0));
  if (Math.abs(grossCleared - (cash + tds)) > 0.005) {
    throw new Error(
      `Allocations (${grossCleared.toFixed(2)}) must equal cash + TDS (${(cash + tds).toFixed(2)}).`,
    );
  }
  if (!input.allocations.length) throw new Error("At least one bill allocation is required.");

  const { data: u } = await supabase.auth.getUser();

  // 1. Create the payment header (DRAFT).
  const { data: payment, error: payErr } = await supabase
    .from("accounting_ap_payments")
    .insert({
      vendor_id: input.vendorId ?? null,
      vendor_name: input.vendorName,
      entity_id: input.entityId,
      branch_id: input.branchId,
      currency: input.currency,
      amount: cash,
      tds_amount: tds,
      posting_date: input.postingDate,
      payment_method: input.paymentMethod ?? null,
      reference: input.reference ?? null,
      bank_role_key: input.bankRoleKey || "BANK_OPERATING",
      tds_role_key: input.tdsRoleKey ?? null,
      attachment_path: input.attachmentPath ?? null,
      status: "DRAFT",
      created_by: u?.user?.id ?? null,
    } as any)
    .select("id")
    .single();
  if (payErr) throw payErr;
  const paymentId = payment.id;

  // 2. Allocations.
  const allocRows = input.allocations.map((a) => ({
    payment_id: paymentId,
    bill_id: a.billId,
    amount: round2(a.amount),
  }));
  const { error: allocErr } = await supabase.from("accounting_ap_payment_allocations").insert(allocRows as any);
  if (allocErr) {
    await supabase.from("accounting_ap_payments").delete().eq("id", paymentId);
    throw allocErr;
  }

  // 3. Post the journal.
  const tdsCalc: TaxCalc | undefined = tds > 0
    ? {
        net: 0,
        totalTax: tds,
        gross: tds,
        components: [{ component: "TDS", rate: 0, amount: tds, outputRoleKey: input.tdsRoleKey || "TDS_PAYABLE_VENDOR" }],
      }
    : undefined;

  let journal: Journal;
  try {
    journal = postJournal({
      entityId: input.entityId,
      branchId: input.branchId,
      currency: input.currency,
      sourceModule: "AP",
      sourceRecordId: paymentId,
      postingDate: input.postingDate,
      narration: `Vendor payment — ${input.vendorName}`,
      reference: input.reference,
      legs: apPaymentLegs({ cash, tds: tdsCalc, apRoleKey: input.apRoleKey, bankRoleKey: input.bankRoleKey }),
      attachmentPath: input.attachmentPath,
    });
  } catch (e) {
    await supabase.from("accounting_ap_payments").delete().eq("id", paymentId);
    throw e;
  }

  // 4. Update bill balances.
  for (const a of input.allocations) {
    const { data: bill } = await supabase
      .from("accounting_ap_bills")
      .select("total_amount, paid_amount")
      .eq("id", a.billId)
      .single();
    const total = round2(Number(bill?.total_amount) || 0);
    const paid = round2((Number(bill?.paid_amount) || 0) + round2(a.amount));
    const outstanding = round2(total - paid);
    const status = outstanding <= 0.005 ? "PAID" : "PARTIAL";
    await supabase
      .from("accounting_ap_bills")
      .update({ paid_amount: paid, outstanding, status } as any)
      .eq("id", a.billId);
  }

  // 5. Finalize payment.
  await supabase
    .from("accounting_ap_payments")
    .update({ status: "POSTED", journal_id: journal.id, posted_by: u?.user?.id ?? null, posted_at: new Date().toISOString() } as any)
    .eq("id", paymentId);

  return { journal, paymentId };
}
