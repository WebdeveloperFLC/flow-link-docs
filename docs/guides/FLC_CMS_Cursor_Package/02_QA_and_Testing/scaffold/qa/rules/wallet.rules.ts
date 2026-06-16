import Decimal from "decimal.js";
import { runRuleMatrix, type RuleCase } from "./_harness";
// Reuses the REAL engine logic — import from the app, do not reimplement here.
import { fnWalletScopeMatches } from "@/incentives/lib/walletScopeLogic";

// Example: wallet over-limit detection (boundary discipline: below / at / above).
type LimitIn = { spend: number; cap: number };
type LimitOut = { exceeded: boolean };
const overLimit = ({ spend, cap }: LimitIn): LimitOut => ({
  exceeded: new Decimal(spend).gt(cap),
});

const limitCases: RuleCase<LimitIn, LimitOut>[] = [
  { id: "WALLET-LIMIT-001", group: "wallet", critical: true, given: { spend: 4999, cap: 5000 }, expect: { exceeded: false } },
  { id: "WALLET-LIMIT-002", group: "wallet", critical: true, given: { spend: 5000, cap: 5000 }, expect: { exceeded: false } },
  { id: "WALLET-LIMIT-003", group: "wallet", critical: true, given: { spend: 5001, cap: 5000 }, expect: { exceeded: true } },
];
runRuleMatrix("Wallet · per-client limit", overLimit, limitCases);

// Example: scope match/mismatch via the REAL function.
runRuleMatrix("Wallet · scope match", (g: any) => ({ ok: fnWalletScopeMatches(g.wallet, g.txn) }), [
  { id: "WALLET-SCOPE-001", group: "wallet", critical: true,
    given: { wallet: { scope_service_code: "IELTS" }, txn: { service_code: "IELTS" } }, expect: { ok: true } },
  { id: "WALLET-SCOPE-002", group: "wallet", critical: true,
    given: { wallet: { scope_service_code: "IELTS" }, txn: { service_code: "PTE" } }, expect: { ok: false } },
] as any);
