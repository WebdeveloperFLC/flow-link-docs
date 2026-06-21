/** Date-range helpers for Employee 360 section views (no payroll/leave maths). */

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

export function defaultLeaveYearRange() {
  const y = new Date().getFullYear();
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

export function sectionRangeFromSearchParams(
  params: URLSearchParams,
  defaults: { from: string; to: string },
) {
  return {
    from: params.get("from") ?? defaults.from,
    to: params.get("to") ?? defaults.to,
  };
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
