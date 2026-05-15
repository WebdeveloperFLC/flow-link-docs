import type { Journal } from '../data/mockJournals';
import type { BankStatementLine, ReconciliationMatch } from '../data/mockReconciliation';

export function parseCSVStatement(csvText: string, currency: string): BankStatementLine[] {
  const rows = csvText
    .split(/\r?\n/)
    .map(r => r.trim())
    .filter(Boolean);
  if (rows.length <= 1) return [];
  const dataRows = rows.slice(1);
  const out: BankStatementLine[] = [];
  dataRows.forEach((row, idx) => {
    const cells = row.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const [dateRaw = '', description = '', reference = '', debitRaw = '', creditRaw = '', balanceRaw = ''] = cells;
    const date = normaliseDate(dateRaw);
    const debit = toNum(debitRaw);
    const credit = toNum(creditRaw);
    const balance = toNum(balanceRaw);
    out.push({
      id: `csv-${Date.now()}-${idx}`,
      date,
      description,
      reference: reference || undefined,
      debit,
      credit,
      balance,
      currency,
      rawText: row,
    });
  });
  return out;
}

function toNum(s: string): number {
  if (!s) return 0;
  const n = Number(s.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function normaliseDate(s: string): string {
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m1 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m1) {
    const [, a, b, y] = m1;
    // Heuristic: if first part > 12, treat as DD/MM/YYYY, else MM/DD/YYYY
    const ai = parseInt(a, 10);
    const bi = parseInt(b, 10);
    const dd = ai > 12 ? ai : bi;
    const mm = ai > 12 ? bi : ai;
    return `${y}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  }
  return s;
}

function journalAmount(j: Journal): number {
  return j.lines.reduce((sum, l) => sum + l.debit, 0);
}

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3);
}

function descriptionScore(a: string, b: string): { score: number; matches: string[] } {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return { score: 0, matches: [] };
  const setA = new Set(ta);
  const setB = new Set(tb);
  const union = new Set([...setA, ...setB]);
  const matches = [...setA].filter(t => setB.has(t));
  const score = (matches.length / union.size) * 25;
  return { score, matches };
}

export function matchStatementToJournals(
  statementLines: BankStatementLine[],
  journals: Journal[]
): ReconciliationMatch[] {
  const candidates = journals.filter(j => j.status === 'POSTED' || j.status === 'PENDING_REVIEW');
  return statementLines.map(line => {
    const lineAmt = line.debit || line.credit;
    if (lineAmt === 0) {
      return {
        statementLineId: line.id,
        confidence: 0,
        matchType: 'UNMATCHED',
        matchReasons: ['Opening balance / non-transactional line'],
        status: 'UNMATCHED',
      } as ReconciliationMatch;
    }

    let best: { j: Journal; score: number; reasons: string[] } | null = null;
    for (const j of candidates) {
      const jAmt = journalAmount(j);
      if (jAmt === 0) continue;
      const diffPct = Math.abs(jAmt - lineAmt) / Math.max(lineAmt, 1);
      let score = 0;
      const reasons: string[] = [];
      if (Math.abs(jAmt - lineAmt) < 0.01) {
        score += 50;
        reasons.push(`Exact amount match: ${line.currency} ${lineAmt.toLocaleString()}`);
      } else if (diffPct <= 0.01) {
        score += 30;
        reasons.push('Amount within 1%');
      } else if (diffPct <= 0.05) {
        score += 15;
        reasons.push('Amount within 5%');
      } else {
        continue;
      }

      const dDays = Math.abs((new Date(j.entryDate).getTime() - new Date(line.date).getTime()) / 86400000);
      if (dDays === 0) { score += 25; reasons.push('Date match: same day'); }
      else if (dDays <= 3) { score += 15; reasons.push(`Date within ${Math.round(dDays)}d`); }
      else if (dDays <= 7) { score += 8; reasons.push(`Date within ${Math.round(dDays)}d`); }

      const desc = descriptionScore(line.description, `${j.narration} ${j.reference}`);
      if (desc.score > 0) {
        score += desc.score;
        if (desc.matches.length) {
          reasons.push(`Description matches '${desc.matches.slice(0, 2).join(', ')}'`);
        }
      }

      if (line.reference && j.reference) {
        if (line.reference === j.reference) { score += 10; reasons.push('Reference exact match'); }
        else if (
          line.reference.toLowerCase().includes(j.reference.toLowerCase()) ||
          j.reference.toLowerCase().includes(line.reference.toLowerCase())
        ) {
          score += 5; reasons.push('Reference partial match');
        }
      }

      if (!best || score > best.score) best = { j, score, reasons };
    }

    if (!best || best.score < 40) {
      return {
        statementLineId: line.id,
        confidence: best ? Math.round(best.score) : 0,
        matchType: 'UNMATCHED',
        matchReasons: [],
        status: 'UNMATCHED',
      } as ReconciliationMatch;
    }

    const score = Math.round(Math.min(100, best.score));
    let matchType: ReconciliationMatch['matchType'] = 'FUZZY';
    let status: ReconciliationMatch['status'] = 'NEEDS_REVIEW';
    if (score >= 85) {
      matchType = 'EXACT';
      status = 'AUTO_MATCHED';
    }
    return {
      statementLineId: line.id,
      journalLineId: best.j.id,
      journalEntryNumber: best.j.entryNumber,
      confidence: score,
      matchType,
      matchReasons: best.reasons,
      status,
    } as ReconciliationMatch;
  });
}

export function calculateReconciliationSummary(matches: ReconciliationMatch[]) {
  const total = matches.length;
  const autoMatched = matches.filter(m => m.status === 'AUTO_MATCHED').length;
  const needsReview = matches.filter(m => m.status === 'NEEDS_REVIEW').length;
  const unmatched = matches.filter(m => m.status === 'UNMATCHED').length;
  const confirmedCount = matches.filter(m => m.status === 'CONFIRMED').length;
  const matchedNotUnmatched = total - unmatched;
  const reconciliationRate = total === 0 ? 0 : Math.round((matchedNotUnmatched / total) * 100);
  return {
    total,
    autoMatched,
    needsReview,
    unmatched,
    confirmedCount,
    reconciliationRate,
    totalMatchedAmount: 0,
    totalUnmatchedAmount: 0,
  };
}
