import type { ReactNode } from "react";
import type { EmployeeRow } from "../lib/types";
import {
  employeeCurrency,
  formatMoney,
  parseEmergencyContacts,
  payrollCompanyLabel,
  weeklyOffDays,
} from "./format";
import { employmentTypeLabel } from "./emp360Filters";
import { formatSecurityChequeUploadedAt } from "./securityCheque";
import { buildMonthlySalaryStructure, employeeToStructureInput } from "./salaryStructure";

type Row = [string, string | ReactNode];

function yn(v: boolean | null | undefined) {
  if (v == null) return "—";
  return v ? "Yes" : "No";
}

function row(label: string, value: string | null | undefined | ReactNode): Row {
  return [label, value ?? "—"];
}

type BuildArgs = {
  emp: EmployeeRow;
  reportingManagerLabel: string | null;
  crmProfileLabel: string | null;
  money: (n: number | null | undefined) => string;
  currency: string;
};

export function buildEmp360InfoSections(args: BuildArgs) {
  const { emp, reportingManagerLabel, crmProfileLabel, money, currency } = args;
  const emergencyContacts = parseEmergencyContacts(emp.emergency_contacts);
  const shift = emp.shifts;
  const weeklyOff =
    shift?.working_days_per_week != null
      ? `${weeklyOffDays(shift.working_days_per_week)} day(s) off`
      : null;

  const personal: Row[] = [
    row("Employee code", emp.emp_code),
    row("First name", emp.first_name),
    row("Middle name", emp.middle_name),
    row("Last name", emp.last_name),
    row("Full name", emp.full_name),
    row("Gender", emp.gender),
    row("Date of birth", emp.dob),
    row("Mobile", emp.mobile),
    row("Email", emp.email),
    row("Nationality", emp.nationality),
    row("Marital status", emp.marital_status),
    row("Blood group", emp.blood_group),
    row("Current address", emp.addr_current),
    row("Permanent address", emp.addr_permanent),
    ...(emp.emergency ? [row("Emergency (legacy)", emp.emergency)] : []),
    ...emergencyContacts
      .filter((c) => c.name || c.phone)
      .flatMap((c, i) => [
        row(`Emergency contact ${i + 1}`, `${c.name} · ${c.phone} (${c.relation})`),
      ]),
  ];

  const employment: Row[] = [
    row("CRM user link", crmProfileLabel ?? (emp.staff_id ? emp.staff_id : null)),
    row("Employee status", emp.status),
    row("Employee category", emp.hr_employee_categories?.label),
    row("Employment type", employmentTypeLabel(emp)),
    row("Department", emp.departments?.name ?? emp.department),
    row("Designation", emp.designations?.name ?? emp.designation),
    row("Branch", emp.branches?.name),
    row("Payroll company", emp.companies ? payrollCompanyLabel(emp.companies) : null),
    row("Payroll country", emp.payroll_country ?? "IN"),
    row("Salary currency", currency),
    row("Reporting manager", reportingManagerLabel),
    row("Date of joining", emp.date_of_joining),
    row("Probation start", emp.probation_start_date),
    row("Probation end", emp.probation_end_date),
    row("Notice period", emp.notice_period),
    row("Work week", emp.work_week),
    row("Exit date", emp.exit_date),
    row("Exit reason", emp.exit_reason),
    row(
      "Rehire eligible",
      emp.rehire_eligible == null ? null : emp.rehire_eligible ? "Yes" : "No",
    ),
  ];

  const shiftRows: Row[] = [
    row(
      "Assigned shift",
      shift
        ? `${shift.name} (${shift.login_time?.slice(0, 5)}–${shift.logout_time?.slice(0, 5)})`
        : null,
    ),
    row("Shift timezone", shift?.timezone),
    row("Working days per week", shift?.working_days_per_week),
    row("Weekly off pattern", weeklyOff),
  ];

  const salaryStructure = buildMonthlySalaryStructure(employeeToStructureInput(emp));

  const salary: Row[] = [
    row("Salary package (CTC)", money(salaryStructure.salaryPackage)),
    row("Basic", money(salaryStructure.basic)),
    row("HRA", money(salaryStructure.hra)),
    row("Conveyance", money(salaryStructure.conveyance)),
    row(`Bonus (${salaryStructure.bonusPercentage}%)`, money(salaryStructure.bonusAmount)),
    row("Other allowances", money(salaryStructure.otherAllowances)),
    row("Total earnings (A)", money(salaryStructure.totalEarningsA)),
    row("Employer cost (B)", money(salaryStructure.totalEmployerCostB)),
    row("Difference (CTC − A − B)", money(salaryStructure.difference)),
    row("Monthly gross (legacy)", money(emp.monthly_gross)),
    row("Special allowance", money(emp.special_allow)),
    row("Incentive", money(emp.incentive)),
    row("Bonus", money(emp.bonus)),
    row("Other deductions / month", emp.other_deductions ? money(emp.other_deductions) : "—"),
  ];

  const statutory: Row[] = [
    row("Employer PF applicable", yn(emp.employer_pf_applicable ?? emp.pf_applicable)),
    row("Employer ESIC applicable", yn(emp.employer_esic_applicable ?? emp.esic_applicable)),
    row("Employee PF %", emp.employee_pf_pct != null ? `${emp.employee_pf_pct}%` : "12%"),
    row("Employer PF %", emp.employer_pf_pct != null ? `${emp.employer_pf_pct}%` : "12%"),
    row("Employee ESIC %", emp.employee_esic_pct != null ? `${emp.employee_esic_pct}%` : "0.75%"),
    row("Employer ESIC %", emp.employer_esic_pct != null ? `${emp.employer_esic_pct}%` : "3.25%"),
    row(
      "Professional tax amount",
      emp.professional_tax_amount != null ? money(emp.professional_tax_amount) : "Default",
    ),
    row("PF applicable", yn(emp.pf_applicable)),
    row("Has PF account", yn(emp.has_pf_account)),
    row("PF number", emp.pf_number),
    row("UAN", emp.uan),
    row("ESIC applicable", yn(emp.esic_applicable)),
    row("Has ESIC account", yn(emp.has_esic_account)),
    row("ESIC number", emp.esic_number),
    row("Professional tax (PT)", yn(emp.pt_applicable)),
    row("TDS applicable", yn(emp.tds_applicable)),
    row("LWF applicable", yn(emp.lwf_applicable)),
  ];

  const bank: Row[] = [
    row("Account holder name", emp.bank_holder_name),
    row("Bank name", emp.bank_name),
    row("Account number", emp.bank_account_number),
    row("IFSC", emp.bank_ifsc),
    row("Bank branch", emp.bank_branch),
    row("Account type", emp.bank_account_type),
    row("Bank verified", yn(emp.bank_verified)),
    ...(emp.bank_verified
      ? [
          row("Verified by", emp.bank_verified_by),
          row("Verified at", formatSecurityChequeUploadedAt(emp.bank_verified_at)),
        ]
      : []),
    row("Security cheque status", emp.security_cheque_status),
    row("Security cheque reason", emp.security_cheque_reason),
    row("Security cheque file", emp.security_cheque_file_name),
    row("Cheque uploaded by", emp.security_cheque_uploaded_by_label),
    row(
      "Cheque uploaded at",
      formatSecurityChequeUploadedAt(emp.security_cheque_uploaded_at),
    ),
  ];

  return [
    { title: "Personal information", rows: personal },
    { title: "Employment information", rows: employment },
    { title: "Shift & schedule", rows: shiftRows },
    { title: "Salary & compensation", rows: salary },
    { title: "Statutory & deductions", rows: statutory },
    { title: "Bank & security cheque", rows: bank },
  ];
}

export function emp360MoneyFormatter(emp: EmployeeRow) {
  const currency = employeeCurrency(emp);
  return (n: number | null | undefined) => formatMoney(n ?? 0, currency);
}
