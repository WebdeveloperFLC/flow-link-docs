import { describe, it, expect } from "vitest";

// Table-driven business-rule harness. One harness runs every rule matrix.
// Adding a rule = adding a row to a *.rules.ts file. Financial rules MUST pass 100%.
export interface RuleCase<I, O> {
  id: string;                 // e.g. "WALLET-LIMIT-001"
  group: string;              // "wallet" | "offer" | "incentive" | ...
  critical: boolean;          // financial-critical → release gate 100%
  given: I;
  expect: O;
}
export function runRuleMatrix<I, O>(
  title: string,
  fn: (input: I) => O,
  cases: RuleCase<I, O>[],
) {
  describe(title, () => {
    for (const c of cases) {
      it(`${c.id}${c.critical ? " [critical]" : ""}`, () => {
        expect(fn(c.given)).toStrictEqual(c.expect);
      });
    }
  });
}
