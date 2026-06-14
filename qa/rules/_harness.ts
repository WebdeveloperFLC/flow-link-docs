import { describe, it, expect } from "vitest";

export interface RuleCase<I, O> {
  id: string;
  group: string;
  critical: boolean;
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
