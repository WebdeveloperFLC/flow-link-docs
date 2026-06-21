/** Date-range helpers for Employee 360 profile (no payroll/leave maths). */

export function defaultEmp360Range(cycle?: { start_date: string; end_date: string } | null) {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const fallbackFrom = `${y}-${m}-01`;
  const fallbackTo = today.toISOString().slice(0, 10);
  return {
    from: cycle?.start_date ?? fallbackFrom,
    to: cycle?.end_date ?? fallbackTo,
  };
}

export function emp360RangeFromSearchParams(
  params: URLSearchParams,
  cycle?: { start_date: string; end_date: string } | null,
) {
  const defaults = defaultEmp360Range(cycle);
  const from = params.get("from") ?? defaults.from;
  const to = params.get("to") ?? defaults.to;
  return { from, to };
}

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function dateInRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

export function leaveOverlapsRange(
  fromDate: string,
  toDate: string,
  rangeFrom: string,
  rangeTo: string,
): boolean {
  return rangesOverlap(fromDate, toDate, rangeFrom, rangeTo);
}

export function mergeEmp360SearchParams(
  listParams: URLSearchParams,
  from: string,
  to: string,
): URLSearchParams {
  const p = new URLSearchParams(listParams);
  p.set("from", from);
  p.set("to", to);
  return p;
}
