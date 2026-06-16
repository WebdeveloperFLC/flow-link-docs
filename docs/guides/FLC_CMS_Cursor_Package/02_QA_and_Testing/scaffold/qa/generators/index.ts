// FLC CMS Test Data Generator — deterministic, FK-safe, staging-only.
// Extends docs/performance-hub/PERFORMANCE_HUB_DEMO_DATA.md conventions (period 2026-06).
export type ProfileName = "minimal" | "realistic" | "stress" | "edge";
export interface GenProfile { name: ProfileName; seed: number; period: string; }

export interface GeneratedEnv {
  companies: any[]; branches: any[]; departments: any[]; users: any[];
  leads: any[]; clients: any[]; invoices: any[]; walletTxns: any[];
  offerUsage: any[]; incentiveRecords: any[]; commissionRecords: any[];
}

// Build an in-memory, FK-consistent graph (no DB writes).
export function generate(p: GenProfile): GeneratedEnv { /* deterministic from p.seed */ return {} as GeneratedEnv; }

// Emit idempotent upsert SQL for review / Supabase SQL editor.
export function toSQL(env: GeneratedEnv): string { /* ON CONFLICT DO UPDATE */ return ""; }

// Apply to Supabase — refuses non-staging URLs (allowlist).
export async function apply(env: GeneratedEnv, client: unknown): Promise<void> {
  if (!isStaging(process.env.SUPABASE_URL)) throw new Error("Generator: staging URL required");
  // insert in FK order: company→branch→dept→user→lead→client→invoice→wallet→offer→incentive→commission
}
function isStaging(url?: string) { return !!url && /staging|preview|localhost|127\.0\.0\.1/.test(url); }
