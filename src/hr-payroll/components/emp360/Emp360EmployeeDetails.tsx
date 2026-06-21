import { InfoCard } from "../ui/InfoCard";
import { useCrmProfile } from "../../hooks/useHrTeam";
import { employeeCurrency } from "../../lib/format";
import { buildEmp360InfoSections, emp360MoneyFormatter } from "../../lib/emp360EmployeeFields";
import type { EmployeeRow } from "../../lib/types";

type Props = {
  emp: EmployeeRow;
  employees: EmployeeRow[];
};

export function Emp360EmployeeDetails({ emp, employees }: Props) {
  const reportingManager = emp.reporting_mgr_id
    ? employees.find((e) => e.id === emp.reporting_mgr_id)
    : null;
  const { data: crmProfile } = useCrmProfile(emp.staff_id);
  const crmProfileLabel = crmProfile
    ? `${crmProfile.full_name ?? "Linked user"}${crmProfile.email ? ` · ${crmProfile.email}` : ""}`
    : null;

  const sections = buildEmp360InfoSections({
    emp,
    reportingManagerLabel: reportingManager
      ? `${reportingManager.full_name} (${reportingManager.emp_code})`
      : null,
    crmProfileLabel,
    money: emp360MoneyFormatter(emp),
    currency: employeeCurrency(emp),
  });

  return (
    <div className="emp360-info-grid">
      {sections.map((section) => (
        <InfoCard key={section.title} title={section.title} rows={section.rows} />
      ))}
    </div>
  );
}
