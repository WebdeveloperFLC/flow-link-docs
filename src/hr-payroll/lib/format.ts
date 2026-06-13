export function inr(n: number | null | undefined): string {
  return `₹${Math.round(n ?? 0).toLocaleString("en-IN")}`;
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
