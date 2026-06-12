/**
 * Target suggestion from prior period totals.
 */

export function suggestTargetFromPrior(priorTotal: number, growthPct = 10): number {
  if (priorTotal <= 0) return 0;
  return Math.round(priorTotal * (1 + growthPct / 100) * 100) / 100;
}

export function priorPeriodKey(periodKey: string): string | null {
  const m = /^(\d{4})-(\d{2})$/.exec(periodKey.trim());
  if (!m) return null;
  let y = Number(m[1]);
  let mo = Number(m[2]) - 1;
  if (mo < 1) {
    mo = 12;
    y -= 1;
  }
  return `${y}-${String(mo).padStart(2, "0")}`;
}

export function payoutsToCsv(
  rows: {
    counselor_name: string;
    counselor_id: string;
    gross_amount: number;
    tds_amount: number;
    net_amount: number;
    settlement_currency: string;
    status: string;
    period_key?: string;
    payout_id?: string;
  }[],
): string {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    "payout_id,period_key,counselor_name,counselor_id,gross,tds,net,currency,status",
    ...rows.map((r) =>
      [
        esc(r.payout_id ?? ""),
        esc(r.period_key ?? ""),
        esc(r.counselor_name),
        esc(r.counselor_id),
        esc(r.gross_amount),
        esc(r.tds_amount),
        esc(r.net_amount),
        esc(r.settlement_currency),
        esc(r.status),
      ].join(","),
    ),
  ];
  return lines.join("\n");
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
