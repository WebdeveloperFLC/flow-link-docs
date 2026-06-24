import { employeeCurrency, formatMoney } from "./format";
import type { EmployeeRow, PayrollLineRow } from "./types";

export type BankTransferRow = {
  empCode: string;
  fullName: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  netSalary: number;
  currency: string;
  bankVerified: boolean;
  hasBankDetails: boolean;
};

/** Canada EFT: transit → bank_ifsc, institution → bank_branch (no separate schema columns). */
export function isCanadaPayrollEmployee(e: {
  payroll_country?: string | null;
  salary_currency?: string | null;
}): boolean {
  return e.payroll_country === "CA" || e.salary_currency === "CAD";
}

export function employeeHasBankDetails(e: EmployeeRow): boolean {
  const account = e.bank_account_number?.trim();
  if (!account) return false;
  if (isCanadaPayrollEmployee(e)) {
    return Boolean(e.bank_ifsc?.trim() && e.bank_branch?.trim());
  }
  return Boolean(e.bank_ifsc?.trim());
}

export function buildBankTransferRows(
  lines: Array<PayrollLineRow & { employees?: EmployeeRow | null }>,
): BankTransferRow[] {
  return lines
    .filter((l) => l.employees)
    .map((l) => {
      const e = l.employees!;
      const currency = employeeCurrency(e);
      return {
        empCode: e.emp_code,
        fullName: e.bank_holder_name?.trim() || e.full_name,
        bankName: e.bank_name?.trim() || "",
        accountNumber: e.bank_account_number?.trim() || "",
        ifsc: e.bank_ifsc?.trim() || "",
        branch: e.bank_branch?.trim() || "",
        netSalary: l.net_salary,
        currency,
        bankVerified: e.bank_verified,
        hasBankDetails: employeeHasBankDetails(e),
      };
    })
    .sort((a, b) => a.empCode.localeCompare(b.empCode));
}

const CSV_HEADERS = [
  "Employee Code",
  "Beneficiary Name",
  "Bank Name",
  "Account Number",
  "IFSC",
  "Branch",
  "Net Amount",
  "Currency",
  "Bank Verified",
] as const;

function csvEscape(v: string | number): string {
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function bankTransferCsv(rows: BankTransferRow[]): string {
  const lines = [
    CSV_HEADERS.join(","),
    ...rows.map((r) =>
      [
        r.empCode,
        r.fullName,
        r.bankName,
        r.accountNumber,
        r.ifsc,
        r.branch,
        r.netSalary,
        r.currency,
        r.bankVerified ? "Yes" : "No",
      ]
        .map(csvEscape)
        .join(","),
    ),
  ];
  return lines.join("\n");
}

export function downloadBankTransferCsv(rows: BankTransferRow[], cycleLabel: string) {
  const blob = new Blob([bankTransferCsv(rows)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `bank_transfer_${cycleLabel.replace(/\s+/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function bankTransferValidation(rows: BankTransferRow[]): {
  missingBank: BankTransferRow[];
  unverified: BankTransferRow[];
  totalNet: Record<string, number>;
} {
  const missingBank = rows.filter((r) => !r.hasBankDetails);
  const unverified = rows.filter((r) => r.hasBankDetails && !r.bankVerified);
  const totalNet: Record<string, number> = {};
  for (const r of rows) {
    totalNet[r.currency] = (totalNet[r.currency] ?? 0) + r.netSalary;
  }
  return { missingBank, unverified, totalNet };
}

export function formatBankTransferSummary(totalNet: Record<string, number>): string {
  return Object.entries(totalNet)
    .map(([cur, n]) => formatMoney(n, cur))
    .join(" · ");
}

/** Shared bank-export confirmation — used by Verify and Salary Register. */
export function confirmBankTransferExport(rows: BankTransferRow[]): boolean {
  const { missingBank, unverified } = bankTransferValidation(rows);
  if (missingBank.length) {
    const proceed = confirm(
      `${missingBank.length} employee(s) missing required bank details. Export anyway?`,
    );
    if (!proceed) return false;
  } else if (unverified.length) {
    const proceed = confirm(
      `${unverified.length} employee(s) have unverified bank details. Export anyway?`,
    );
    if (!proceed) return false;
  }
  return true;
}
