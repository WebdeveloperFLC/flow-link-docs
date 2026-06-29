/**
 * Cash register foundation — resolve register for company/branch (Phase A).
 */
import { supabase } from "@/integrations/supabase/client";
import type { CashRegister, CashReceiptContext } from "../types/cashRegister";

const DEFAULT_REGISTER_CODE = "MAIN";

export async function resolveCashRegister(input: {
  entityId: string;
  branchId: string;
  currency: string;
}): Promise<CashRegister | null> {
  try {
    const { data } = await supabase
      .from("foe_cash_registers" as never)
      .select("*")
      .eq("entity_id", input.entityId)
      .eq("branch_id", input.branchId)
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    if (data) return mapRegister(data as Record<string, unknown>);
  } catch {
    /* table pending */
  }

  // Foundation fallback — virtual register until DB seeded
  return {
    id: `virtual-${input.entityId}-${input.branchId}`,
    entityId: input.entityId,
    branchId: input.branchId,
    code: DEFAULT_REGISTER_CODE,
    name: "Main cash register",
    currency: input.currency,
    active: true,
  };
}

function mapRegister(row: Record<string, unknown>): CashRegister {
  return {
    id: String(row.id),
    entityId: String(row.entity_id),
    branchId: String(row.branch_id),
    code: String(row.code ?? DEFAULT_REGISTER_CODE),
    name: String(row.name ?? "Cash register"),
    currency: String(row.currency ?? "INR"),
    active: row.active !== false,
  };
}

export function buildCashReceiptContext(input: {
  register: CashRegister;
  cashierUserId: string;
  verificationUserId?: string | null;
}): CashReceiptContext {
  return {
    cashRegisterId: input.register.id,
    entityId: input.register.entityId,
    branchId: input.register.branchId,
    cashierUserId: input.cashierUserId,
    verificationUserId: input.verificationUserId ?? null,
  };
}
