export function inr(n: number | null | undefined): string {
  return formatMoney(n, "INR");
}

export function formatMoney(n: number | null | undefined, currency = "INR"): string {
  const v = Math.round(n ?? 0);
  if (currency === "CAD") {
    return `CA$${v.toLocaleString("en-CA")}`;
  }
  return `₹${v.toLocaleString("en-IN")}`;
}

export function displayEmployeeName(e: {
  first_name?: string | null;
  last_name?: string | null;
  full_name: string;
}): string {
  const fn = [e.first_name, e.last_name].filter(Boolean).join(" ").trim();
  return fn || e.full_name;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
}

export function fillSalaryComponents(monthly: number) {
  const basic = Math.round(monthly * 0.5);
  const hra = Math.round(monthly * 0.2);
  const conveyance = 1600;
  const special = monthly - basic - hra - conveyance;
  return { basic, hra, conveyance, special_allow: special };
}
