/**
 * Separation of Duties — generic action pairs (reusable across domains).
 */

export type SodAction =
  | "record"
  | "verify"
  | "approve"
  | "post"
  | "reconcile"
  | "void";

export interface SodRule {
  id: string;
  /** First action in the forbidden pair for the same user on the same entity. */
  actionA: SodAction;
  actionB: SodAction;
  /** When set, rule applies only to these domains (e.g. money_in). */
  domains?: string[];
  /** When set, rule applies only to these payment methods. */
  paymentMethods?: string[];
  /** Always enforce (e.g. cash verify). */
  mandatory?: boolean;
}

export interface SodContext {
  domain: string;
  entityId: string;
  paymentMethod?: string | null;
  actorUserId: string;
  action: SodAction;
  /** Map of prior actions → userId who performed them. */
  actionHistory: Partial<Record<SodAction, string | null | undefined>>;
}

export interface SodViolation {
  ruleId: string;
  message: string;
}
