import { CoaAccount } from "../types/coa";

const now = new Date().toISOString();

function a(
  id: string, code: string, name: string, groupCode: string, typeCode: string,
  currency: string, balance: number, txnCount = 0,
  parentId: string | null = null, entityId: string | null = null,
): CoaAccount {
  return {
    id, code, name, groupCode, typeCode, parentId,
    currency, entityId,
    openingBalance: 0, currentBalance: balance,
    status: "ACTIVE",
    txnCount,
    createdAt: now,
  };
}

export const SEED_ACCOUNTS: CoaAccount[] = [];