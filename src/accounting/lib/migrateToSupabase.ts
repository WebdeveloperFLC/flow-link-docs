import { supabase } from '@/integrations/supabase/client';

export interface MigrationResult {
  store: string;
  found: number;
  migrated: number;
  skipped: number;
  errors: string[];
}

type CoaItem = {
  id?: string;
  code?: string;
  name?: string;
  groupCode?: string;
  group_code?: string;
  typeCode?: string;
  type_code?: string;
  currency?: string;
  normalBalance?: string;
  openingBalance?: number;
  isActive?: boolean;
  description?: string;
  automationTags?: string[];
};

type JournalLineItem = {
  accountCode?: string;
  account_code?: string;
  accountName?: string;
  account_name?: string;
  description?: string;
  debit?: number;
  credit?: number;
};

type JournalItem = {
  entryDate?: string;
  entry_date?: string;
  entity?: string;
  currency?: string;
  sourceType?: string;
  source_type?: string;
  narration?: string;
  status?: string;
  reference?: string;
  lines?: JournalLineItem[];
};

type BankItem = {
  nickname?: string;
  accountNickname?: string;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  entity?: string;
  country?: string;
  currency?: string;
  currentBalance?: number;
  status?: string;
};

type VendorItem = {
  name?: string;
  category?: string;
  email?: string;
  phone?: string;
  currency?: string;
  status?: string;
};

type InsertedJournal = { id: string };

function readLocal<T = unknown>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : parsed?.items || [];
  } catch {
    return [];
  }
}

export async function migrateAllToSupabase(): Promise<MigrationResult[]> {
  const results: MigrationResult[] = [];

  // 1. COA accounts
  const coaItems = readLocal<CoaItem>('accounting:coa:v4').concat(readLocal<CoaItem>('accounting:coa:v5'));
  if (coaItems.length > 0) {
    let migrated = 0;
    let skipped = 0;
    const errors: string[] = [];
    for (const item of coaItems) {
      if (!item.id?.includes('-')) {
        skipped++;
        continue;
      }
      const { error } = await supabase
        .from('accounting_coa' as never)
        .upsert(
          {
            code: item.code,
            name: item.name,
            group_code: item.groupCode || item.group_code,
            type_code: item.typeCode || item.type_code,
            currency: item.currency || 'CAD',
            normal_balance: item.normalBalance || 'DEBIT',
            opening_balance: item.openingBalance || 0,
            is_active: item.isActive ?? true,
            description: item.description,
            automation_tags: item.automationTags || [],
          },
          { onConflict: 'code,entity_id', ignoreDuplicates: true },
        );
      if (error) errors.push(`COA ${item.code}: ${error.message}`);
      else migrated++;
    }
    results.push({ store: 'Chart of Accounts', found: coaItems.length, migrated, skipped, errors });
  }

  // 2. Journals
  const journalItems = readLocal<JournalItem>('accounting:journals:v2');
  if (journalItems.length > 0) {
    let migrated = 0;
    const errors: string[] = [];
    for (const j of journalItems) {
      const { data, error } = await supabase
        .from('accounting_journals')
        .insert({
          entry_date: j.entryDate || j.entry_date,
          entity: j.entity,
          currency: j.currency || 'CAD',
          source_type: j.sourceType || j.source_type || 'MANUAL',
          narration: j.narration,
          status: j.status || 'DRAFT',
          reference: j.reference,
        } as never)
        .select('id')
        .single();
      if (error) {
        errors.push(`Journal: ${error.message}`);
        continue;
      }
      const journalId = (data as InsertedJournal).id;
      if (j.lines?.length > 0) {
        const { error: lineError } = await supabase.from('accounting_journal_lines').insert(
          j.lines.map((l: JournalLineItem, i: number) => ({
            journal_id: journalId,
            line_number: i + 1,
            account_code: l.accountCode || l.account_code,
            account_name: l.accountName || l.account_name,
            description: l.description,
            debit: l.debit || 0,
            credit: l.credit || 0,
          })) as never,
        );
        if (lineError) {
          errors.push(`Journal lines (${journalId}): ${lineError.message}`);
          // Keep migration consistent: if lines fail, remove header row.
          await supabase.from('accounting_journals').delete().eq('id', journalId);
          continue;
        }
      }
      migrated++;
    }
    results.push({ store: 'Journal entries', found: journalItems.length, migrated, skipped: 0, errors });
  }

  // 3. Bank accounts
  const bankItems = readLocal<BankItem>('accounting:bank-accounts:v2');
  if (bankItems.length > 0) {
    let migrated = 0;
    const errors: string[] = [];
    for (const b of bankItems) {
      const { error } = await supabase.from('accounting_bank_accounts').upsert(
        {
          nickname: b.nickname || b.accountNickname,
          bank_name: b.bankName,
          account_holder: b.accountHolderName,
          account_number: b.accountNumber,
          entity: b.entity,
          country: b.country || 'CA',
          currency: b.currency || 'CAD',
          current_balance: b.currentBalance || 0,
          status: b.status || 'ACTIVE',
        } as never,
        { ignoreDuplicates: true },
      );
      if (error) errors.push(`Bank: ${error.message}`);
      else migrated++;
    }
    results.push({ store: 'Bank accounts', found: bankItems.length, migrated, skipped: 0, errors });
  }

  // 4. Vendors
  const vendorItems = readLocal<VendorItem>('accounting:vendors:v2');
  if (vendorItems.length > 0) {
    let migrated = 0;
    const errors: string[] = [];
    for (const v of vendorItems) {
      const { error } = await supabase.from('accounting_vendors').insert({
        name: v.name,
        category: v.category,
        email: v.email,
        phone: v.phone,
        currency: v.currency || 'INR',
        status: v.status || 'ACTIVE',
      } as never);
      if (error) errors.push(`Vendor: ${error.message}`);
      else migrated++;
    }
    results.push({ store: 'Vendors', found: vendorItems.length, migrated, skipped: 0, errors });
  }

  return results;
}

export function clearMigratedLocalStorage() {
  const keys = [
    'accounting:coa:v4',
    'accounting:coa:v5',
    'accounting:journals:v2',
    'accounting:bank-accounts:v2',
    'accounting:vendors:v2',
    'accounting:clients:v2',
    'accounting:ap-bills:v2',
    'accounting:ar-invoices:v2',
    'accounting:petty-cash:v2',
    'accounting:intercompany:v1',
    'accounting:reimbursements:v1',
    'accounting:card-reconciliation:v1',
    'accounting:masters:v5',
    'accounting:entities:v3',
  ];
  keys.forEach((k) => localStorage.removeItem(k));
}
