// FLC CMS Test Data Generator — deterministic, FK-safe, staging-only.
export type ProfileName = "minimal" | "realistic" | "stress" | "edge";
export interface GenProfile {
  name: ProfileName;
  seed: number;
  period: string;
}

export interface GeneratedEnv {
  companies: unknown[];
  branches: unknown[];
  departments: unknown[];
  users: unknown[];
  leads: unknown[];
  clients: unknown[];
  invoices: unknown[];
  walletTxns: unknown[];
  offerUsage: unknown[];
  incentiveRecords: unknown[];
  commissionRecords: unknown[];
}

export function generate(_p: GenProfile): GeneratedEnv {
  return {
    companies: [],
    branches: [],
    departments: [],
    users: [],
    leads: [],
    clients: [],
    invoices: [],
    walletTxns: [],
    offerUsage: [],
    incentiveRecords: [],
    commissionRecords: [],
  };
}

export function toSQL(_env: GeneratedEnv): string {
  return "";
}

function isStaging(url?: string) {
  return !!url && /staging|preview|localhost|127\.0\.0\.1/.test(url);
}

export async function apply(_env: GeneratedEnv, _client: unknown): Promise<void> {
  if (!isStaging(process.env.SUPABASE_URL)) {
    throw new Error("Generator: staging URL required");
  }
}
