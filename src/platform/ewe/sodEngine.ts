/**
 * Generic Separation of Duties engine — reusable across FOE domains.
 */
import type { SodContext, SodRule, SodViolation } from "../types/sod";
import { getSodRulesFromConfig } from "../config/platformConfigService";

export function getSodRules(customRules?: SodRule[]): SodRule[] {
  return customRules ?? getSodRulesFromConfig();
}

export function checkSod(ctx: SodContext, rules?: SodRule[]): SodViolation | null {
  const active = getSodRules(rules).filter((r) => {
    if (r.domains?.length && !r.domains.includes(ctx.domain)) return false;
    if (r.paymentMethods?.length && ctx.paymentMethod) {
      const m = ctx.paymentMethod.toLowerCase();
      if (!r.paymentMethods.includes(m)) return false;
    }
    return true;
  });

  for (const rule of active) {
    const priorUser = ctx.actionHistory[rule.actionA];
    if (priorUser && priorUser === ctx.actorUserId && ctx.action === rule.actionB) {
      return {
        ruleId: rule.id,
        message: `Separation of duties: the same user cannot perform "${rule.actionA}" and "${rule.actionB}" on this transaction.`,
      };
    }
    const reversePrior = ctx.actionHistory[rule.actionB];
    if (reversePrior && reversePrior === ctx.actorUserId && ctx.action === rule.actionA) {
      return {
        ruleId: rule.id,
        message: `Separation of duties: the same user cannot perform "${rule.actionB}" and "${rule.actionA}" on this transaction.`,
      };
    }
  }
  return null;
}

export function canUserVerifyPayment(opts: {
  actorUserId: string;
  postedByUserId?: string | null;
  paymentMethod?: string | null;
  domain?: string;
}): { allowed: boolean; violation?: SodViolation } {
  const violation = checkSod({
    domain: opts.domain ?? "money_in",
    entityId: "payment",
    paymentMethod: opts.paymentMethod,
    actorUserId: opts.actorUserId,
    action: "verify",
    actionHistory: { record: opts.postedByUserId ?? null },
  });
  if (violation) return { allowed: false, violation };
  return { allowed: true };
}

export function canUserApproveJournal(opts: {
  actorUserId: string;
  verifiedByUserId?: string | null;
  postedByUserId?: string | null;
}): { allowed: boolean; violation?: SodViolation } {
  const violation = checkSod({
    domain: "money_in",
    entityId: "journal",
    actorUserId: opts.actorUserId,
    action: "approve",
    actionHistory: {
      verify: opts.verifiedByUserId ?? null,
      record: opts.postedByUserId ?? null,
    },
  });
  if (violation) return { allowed: false, violation };
  return { allowed: true };
}
