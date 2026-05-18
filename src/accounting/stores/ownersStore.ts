import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { runWhenAuthReady } from "./_hydrationGate";
import type {
  OwnerProfile, FinancialAccount, OwnerCategory, PersonalOwnerType,
  AccountType, AccountCategory,
} from "../types/owners";
import { categoryOf } from "../data/mockOwners";

// ─── State ──────────────────────────────────────────────────────────
let owners: OwnerProfile[] = [];
let accounts: FinancialAccount[] = [];

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// ─── Mappers ────────────────────────────────────────────────────────
function ownerFromDb(r: any): OwnerProfile {
  return {
    id: r.id,
    tenantId: r.tenant_id ?? "",
    category: r.category as OwnerCategory,
    businessType: r.business_type ?? undefined,
    brandName: r.brand_name ?? undefined,
    legalName: r.legal_name ?? undefined,
    linkedEntityId: r.linked_entity_id ?? undefined,
    personalType: (r.personal_type ?? undefined) as PersonalOwnerType | undefined,
    firstName: r.first_name ?? undefined,
    lastName: r.last_name ?? undefined,
    relationship: r.relationship ?? undefined,
    dateOfBirth: r.date_of_birth ?? undefined,
    panNumber: r.pan_number ?? undefined,
    aadharLast4: r.aadhar_last4 ?? undefined,
    gstNumber: r.gst_number ?? undefined,
    taxId: r.tax_id ?? undefined,
    sin: r.sin ?? undefined,
    email: r.email ?? undefined,
    phone: r.phone ?? undefined,
    address: r.address ?? undefined,
    country: r.country ?? "IN",
    tags: r.tags ?? [],
    notes: r.notes ?? undefined,
    avatarInitials: r.avatar_initials ?? undefined,
    avatarColor: r.avatar_color ?? undefined,
    isActive: r.is_active ?? true,
    kartaName: r.karta_name ?? undefined,
    linkedIndividualId: r.linked_individual_id ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  } as OwnerProfile;
}

function ownerToDb(o: Partial<OwnerProfile>): Record<string, any> {
  return {
    category: o.category,
    personal_type: o.personalType ?? null,
    business_type: o.businessType ?? null,
    brand_name: o.brandName ?? null,
    legal_name: o.legalName ?? null,
    first_name: o.firstName ?? null,
    last_name: o.lastName ?? null,
    relationship: o.relationship ?? null,
    date_of_birth: o.dateOfBirth ?? null,
    pan_number: o.panNumber ?? null,
    aadhar_last4: o.aadharLast4 ?? null,
    gst_number: o.gstNumber ?? null,
    tax_id: o.taxId ?? null,
    sin: o.sin ?? null,
    email: o.email ?? null,
    phone: o.phone ?? null,
    address: o.address ?? null,
    country: o.country ?? "IN",
    tags: o.tags ?? [],
    notes: o.notes ?? null,
    avatar_initials: o.avatarInitials ?? null,
    avatar_color: o.avatarColor ?? null,
    is_active: o.isActive ?? true,
    karta_name: o.kartaName ?? null,
    linked_individual_id: o.linkedIndividualId ?? null,
    linked_entity_id: o.linkedEntityId ?? null,
  };
}

function accountFromDb(r: any): FinancialAccount {
  return {
    id: r.id,
    tenantId: r.tenant_id ?? "",
    ownerProfileId: r.owner_profile_id,
    linkedEntityId: r.linked_entity_id ?? undefined,
    glAccountId: r.gl_account_id ?? undefined,
    accountType: r.account_type as AccountType,
    category: r.category as AccountCategory,
    nickname: r.nickname,
    institutionName: r.institution_name,
    accountNumber: r.account_number ?? undefined,
    policyNumber: r.policy_number ?? undefined,
    folioNumber: r.folio_number ?? undefined,
    dpId: r.dp_id ?? undefined,
    maturityDate: r.maturity_date ?? undefined,
    premiumAmount: r.premium_amount != null ? Number(r.premium_amount) : undefined,
    premiumFrequency: r.premium_frequency ?? undefined,
    nextPremiumDate: r.next_premium_date ?? undefined,
    sumAssured: r.sum_assured != null ? Number(r.sum_assured) : undefined,
    currency: r.currency ?? "INR",
    currentBalance: r.current_balance != null ? Number(r.current_balance) : undefined,
    interestRate: r.interest_rate != null ? Number(r.interest_rate) : undefined,
    emiAmount: r.emi_amount != null ? Number(r.emi_amount) : undefined,
    emiDay: r.emi_day ?? undefined,
    country: r.country ?? "IN",
    branch: r.branch ?? undefined,
    ifscCode: r.ifsc_code ?? undefined,
    swiftCode: r.swift_code ?? undefined,
    status: r.status,
    openedDate: r.opened_date ?? undefined,
    closedDate: r.closed_date ?? undefined,
    tags: r.tags ?? [],
    remarks: r.remarks ?? undefined,
    documents: [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function accountToDb(a: Partial<FinancialAccount>): Record<string, any> {
  return {
    owner_profile_id: a.ownerProfileId,
    linked_entity_id: a.linkedEntityId ?? null,
    gl_account_id: a.glAccountId ?? null,
    account_type: a.accountType,
    category: a.category,
    nickname: a.nickname,
    institution_name: a.institutionName,
    account_number: a.accountNumber ?? null,
    policy_number: a.policyNumber ?? null,
    folio_number: a.folioNumber ?? null,
    dp_id: a.dpId ?? null,
    maturity_date: a.maturityDate ?? null,
    premium_amount: a.premiumAmount ?? null,
    premium_frequency: a.premiumFrequency ?? null,
    next_premium_date: a.nextPremiumDate ?? null,
    sum_assured: a.sumAssured ?? null,
    currency: a.currency ?? "INR",
    current_balance: a.currentBalance ?? null,
    interest_rate: a.interestRate ?? null,
    emi_amount: a.emiAmount ?? null,
    emi_day: a.emiDay ?? null,
    country: a.country ?? "IN",
    branch: a.branch ?? null,
    ifsc_code: a.ifscCode ?? null,
    swift_code: a.swiftCode ?? null,
    status: a.status ?? "ACTIVE",
    opened_date: a.openedDate ?? null,
    closed_date: a.closedDate ?? null,
    tags: a.tags ?? [],
    remarks: a.remarks ?? null,
  };
}

// ─── Hydration ──────────────────────────────────────────────────────
async function hydrateFromSupabase() {
  try {
    const [{ data: oRows, error: oErr }, { data: aRows, error: aErr }] = await Promise.all([
      supabase.from("owner_profiles" as any).select("*"),
      supabase.from("financial_accounts" as any).select("*"),
    ]);
    if (oErr) throw oErr;
    if (aErr) throw aErr;
    owners = (oRows ?? []).map(ownerFromDb);
    accounts = (aRows ?? []).map(accountFromDb);
    emit();
  } catch (e) {
    console.warn("[ownersStore] hydrate failed", e);
  }
}
runWhenAuthReady(hydrateFromSupabase);

// ─── Public hooks ───────────────────────────────────────────────────
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

export function useOwners(): OwnerProfile[] {
  return useSyncExternalStore(subscribe, () => owners, () => owners);
}
export function useFinancialAccounts(): FinancialAccount[] {
  return useSyncExternalStore(subscribe, () => accounts, () => accounts);
}
export function useAccountsForOwner(ownerId: string): FinancialAccount[] {
  const all = useFinancialAccounts();
  return all.filter((a) => a.ownerProfileId === ownerId);
}

export const getOwners = () => owners;
export const getOwnerById = (id: string) => owners.find((o) => o.id === id);
export const getFinancialAccounts = () => accounts;
export const getAccountsForOwner = (ownerId: string) =>
  accounts.filter((a) => a.ownerProfileId === ownerId);

// ─── Mutators ───────────────────────────────────────────────────────
export async function createOwner(input: Partial<OwnerProfile>): Promise<OwnerProfile | null> {
  try {
    const { data, error } = await supabase
      .from("owner_profiles" as any)
      .insert(ownerToDb(input) as any)
      .select("*")
      .single();
    if (error) throw error;
    const created = ownerFromDb(data);
    owners = [created, ...owners];
    emit();
    return created;
  } catch (e: any) {
    console.warn("[ownersStore] createOwner failed", e);
    toast.error(`Failed to save owner: ${e?.message ?? "unknown error"}`);
    return null;
  }
}

export async function updateOwner(id: string, patch: Partial<OwnerProfile>): Promise<void> {
  const prev = owners.find((o) => o.id === id);
  if (!prev) return;
  const next = { ...prev, ...patch };
  owners = owners.map((o) => (o.id === id ? next : o));
  emit();
  try {
    const { error } = await supabase
      .from("owner_profiles" as any)
      .update(ownerToDb(next) as any)
      .eq("id", id);
    if (error) throw error;
  } catch (e: any) {
    console.warn("[ownersStore] updateOwner failed", e);
    owners = owners.map((o) => (o.id === id ? prev : o));
    emit();
    toast.error(`Failed to update owner: ${e?.message ?? "unknown error"}`);
  }
}

export async function deleteOwner(id: string): Promise<void> {
  const prev = owners;
  owners = owners.filter((o) => o.id !== id);
  emit();
  try {
    const { error } = await supabase.from("owner_profiles" as any).delete().eq("id", id);
    if (error) throw error;
  } catch (e: any) {
    console.warn("[ownersStore] deleteOwner failed", e);
    owners = prev;
    emit();
    toast.error(`Failed to delete owner: ${e?.message ?? "unknown error"}`);
  }
}

export async function createFinancialAccount(input: Partial<FinancialAccount>): Promise<FinancialAccount | null> {
  const payload = { ...input } as Partial<FinancialAccount>;
  if (!payload.category && payload.accountType) payload.category = categoryOf(payload.accountType);
  try {
    const { data, error } = await supabase
      .from("financial_accounts" as any)
      .insert(accountToDb(payload) as any)
      .select("*")
      .single();
    if (error) throw error;
    const created = accountFromDb(data);
    accounts = [created, ...accounts];
    emit();
    return created;
  } catch (e: any) {
    console.warn("[ownersStore] createFinancialAccount failed", e);
    toast.error(`Failed to save account: ${e?.message ?? "unknown error"}`);
    return null;
  }
}

export async function updateFinancialAccount(id: string, patch: Partial<FinancialAccount>): Promise<void> {
  const prev = accounts.find((a) => a.id === id);
  if (!prev) return;
  const next = { ...prev, ...patch };
  accounts = accounts.map((a) => (a.id === id ? next : a));
  emit();
  try {
    const { error } = await supabase
      .from("financial_accounts" as any)
      .update(accountToDb(next) as any)
      .eq("id", id);
    if (error) throw error;
  } catch (e: any) {
    console.warn("[ownersStore] updateFinancialAccount failed", e);
    accounts = accounts.map((a) => (a.id === id ? prev : a));
    emit();
    toast.error(`Failed to update account: ${e?.message ?? "unknown error"}`);
  }
}

export async function deleteFinancialAccount(id: string): Promise<void> {
  const prev = accounts;
  accounts = accounts.filter((a) => a.id !== id);
  emit();
  try {
    const { error } = await supabase.from("financial_accounts" as any).delete().eq("id", id);
    if (error) throw error;
  } catch (e: any) {
    console.warn("[ownersStore] deleteFinancialAccount failed", e);
    accounts = prev;
    emit();
    toast.error(`Failed to delete account: ${e?.message ?? "unknown error"}`);
  }
}
