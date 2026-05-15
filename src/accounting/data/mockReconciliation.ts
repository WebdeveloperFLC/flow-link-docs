import type { BankStatement, ReconMatch, SystemEntry } from '../types/reconciliation';

// Statement covering Oct 1 - Oct 18, 2024 for the RBC Business Chequing (fa1)
export const MOCK_BANK_STATEMENT: BankStatement = {
  accountId: 'fa1',
  startDate: '2024-10-01',
  endDate: '2024-10-18',
  openingBalance: 198420,
  closingBalance: 245000,
  lines: [
    { id: 'b1', date: '2024-10-01', description: 'WeWork Toronto Rent', amount: -8500, reference: 'WW-OCT-2024' },
    { id: 'b2', date: '2024-10-02', description: 'Payroll Disbursement Period 20', amount: -113600, reference: 'PAY20' },
    { id: 'b3', date: '2024-10-03', description: 'Maple Realty Wire In', amount: 16950, reference: 'WIRE-MR-9981' },
    { id: 'b4', date: '2024-10-05', description: 'ACME OFFICE SUPPLIES TORONTO', amount: -1401.20, reference: 'EFT-AC-441' },
    { id: 'b5', date: '2024-10-07', description: 'AMAZON WEB SERVICES *AWS', amount: -6502.10, reference: 'CARD-AMEX' },
    { id: 'b6', date: '2024-10-08', description: 'Air Canada — Conference Travel', amount: -3200, reference: 'AC-118' },
    { id: 'b7', date: '2024-10-10', description: 'JetBrains Renewal — INR FX', amount: -3018.50, reference: 'WIRE-JB-001' },
    { id: 'b8', date: '2024-10-12', description: 'CRA HST Q3 Remittance', amount: -18420, reference: 'CRA-HST-Q3' },
    { id: 'b9', date: '2024-10-14', description: 'TD BANK INVOICE 0051', amount: 9040, reference: 'EFT-TD-2117' },
    { id: 'b10', date: '2024-10-15', description: 'Toronto Hydro — Pre-auth', amount: -1240, reference: 'PAD-TH-9921' },
    { id: 'b11', date: '2024-10-16', description: 'Bank Service Fee', amount: -42, reference: 'FEE-OCT' },
    { id: 'b12', date: '2024-10-17', description: 'Interest Earned', amount: 18.40, reference: 'INT-OCT' },
    { id: 'b13', date: '2024-10-18', description: 'UNKNOWN MERCHANT 4422', amount: -129.99, reference: 'POS-4422' },
  ],
};

export const MOCK_SYSTEM_ENTRIES: SystemEntry[] = [
  { id: 's1', journalId: 'je-rent-oct', entryNumber: 'JE-2024-0010', date: '2024-10-01', description: 'October rent — WeWork', amount: -8500, reference: 'WW-OCT-2024' },
  { id: 's2', journalId: 'je2',          entryNumber: 'JE-2024-0002', date: '2024-10-02', description: 'Bi-weekly payroll — Canada', amount: -113600, reference: 'PAY-2024-20' },
  { id: 's3', journalId: 'je3',          entryNumber: 'JE-2024-0003', date: '2024-10-03', description: 'Receipt — Maple Realty', amount: 16950, reference: 'INV-2024-0042' },
  { id: 's4', journalId: 'je4',          entryNumber: 'JE-2024-0004', date: '2024-10-05', description: 'Acme Office Supplies bill', amount: -1401.20, reference: 'BILL-ACME-9921' },
  { id: 's5', journalId: 'je5',          entryNumber: 'JE-2024-0005', date: '2024-10-08', description: 'AWS October infra', amount: -4820, reference: 'AWS-OCT-2024' }, // amount mismatch with bank
  { id: 's6', journalId: 'je6',          entryNumber: 'JE-2024-0006', date: '2024-10-08', description: 'Travel — Vancouver conference', amount: -3200, reference: 'EXP-RPT-118' },
  { id: 's7', journalId: 'je-jb',        entryNumber: 'JE-2024-0011', date: '2024-10-10', description: 'JetBrains licence — FX wire', amount: -3018.50, reference: 'JB-RENEW-24' },
  { id: 's8', journalId: 'je8',          entryNumber: 'JE-2024-0008', date: '2024-10-12', description: 'CRA HST Q3 remittance', amount: -18420, reference: 'CRA-HST-Q3' },
  { id: 's9', journalId: 'je9',          entryNumber: 'JE-2024-0009', date: '2024-10-14', description: 'TD Bank — training revenue', amount: 9040, reference: 'INV-2024-0051' },
  { id: 's10', journalId: 'je-th',       entryNumber: 'JE-2024-0012', date: '2024-10-15', description: 'Toronto Hydro — utilities', amount: -1240, reference: 'PAD-TH-9921' },
];

/** Build initial matches based on amount + date proximity + reference fuzzy match. */
export function buildInitialMatches(): ReconMatch[] {
  const matches: ReconMatch[] = [];
  for (const b of MOCK_BANK_STATEMENT.lines) {
    let best: { entry: SystemEntry; score: number; reasons: string[] } | null = null;
    for (const s of MOCK_SYSTEM_ENTRIES) {
      const reasons: string[] = [];
      let score = 0;
      if (Math.abs(s.amount - b.amount) < 0.01) { score += 60; reasons.push('Exact amount'); }
      else if (Math.abs(Math.abs(s.amount) - Math.abs(b.amount)) / Math.max(Math.abs(b.amount), 1) < 0.05) {
        score += 25; reasons.push('Amount ±5%');
      }
      const dDays = Math.abs((new Date(s.date).getTime() - new Date(b.date).getTime()) / 86400000);
      if (dDays === 0) { score += 25; reasons.push('Same date'); }
      else if (dDays <= 2) { score += 15; reasons.push(`Date ±${dDays}d`); }
      if (b.reference && s.reference && (b.reference === s.reference || s.reference.includes(b.reference) || b.reference.includes(s.reference))) {
        score += 15; reasons.push('Reference match');
      }
      const bDesc = b.description.toLowerCase();
      const sDesc = s.description.toLowerCase();
      const tokens = sDesc.split(/\s+/).filter(t => t.length >= 4);
      if (tokens.some(t => bDesc.includes(t))) { score += 10; reasons.push('Description'); }
      if (!best || score > best.score) best = { entry: s, score, reasons };
    }
    let status: ReconMatch['status'];
    if (best && best.score >= 85) status = 'AUTO_MATCHED';
    else if (best && best.score >= 50) status = 'REVIEW_NEEDED';
    else status = 'UNMATCHED';
    matches.push({
      id: `m-${b.id}`,
      bankLineId: b.id,
      systemEntryId: status === 'UNMATCHED' ? null : best!.entry.id,
      status,
      confidence: best ? Math.min(100, best.score) : 0,
      reasons: status === 'UNMATCHED' ? [] : best!.reasons,
    });
  }
  return matches;
}