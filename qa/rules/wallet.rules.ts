import Decimal from "decimal.js";
import { runRuleMatrix, type RuleCase } from "./_harness";
import { walletScopeMatches, type ScopeTarget } from "@/incentives/lib/walletScopeLogic";

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

type ScopeIn = {
  wallet: { scope_service_code: string };
  target: ScopeTarget;
};
runRuleMatrix(
  "Wallet · scope match",
  (g: ScopeIn) => ({ ok: walletScopeMatches(g.wallet, g.target) }),
  [
    {
      id: "WALLET-SCOPE-001",
      group: "wallet",
      critical: true,
      given: {
        wallet: { scope_service_code: "IELTS" },
        target: { services: ["IELTS"] },
      },
      expect: { ok: true },
    },
    {
      id: "WALLET-SCOPE-002",
      group: "wallet",
      critical: true,
      given: {
        wallet: { scope_service_code: "IELTS" },
        target: { services: ["PTE"] },
      },
      expect: { ok: false },
    },
  ],
);
