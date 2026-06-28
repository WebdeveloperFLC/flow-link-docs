import { useMemo } from "react";
import { useHrAccess } from "../../context/HrPayrollProvider";
import { useReportScope } from "../../hooks/useReportScope";
import { HrReportShell } from "../../components/reports/HrReportShell";
import { ReportFilterBar } from "../../components/reports/ReportFilterBar";
import { HrReportTable, reportExportRows, type HrReportColumn } from "../../components/reports/HrReportTable";
import { buildOfficialContactExport, buildPersonalContactExport } from "../../lib/employeeContact";
import { employmentTypeLabel } from "../../lib/emp360Filters";
import { employeeSummaryCounts } from "../../lib/reportFilters";
import { payrollCompanyLabel } from "../../lib/format";
import { downloadReportTable, printReportTable } from "../../lib/hrReportExport";

type Row = {
  id: string;
  empCode: string;
  fullName: string;
  branch: string;
  department: string;
  designation: string;
  category: string;
  company: string;
  country: string;
  manager: string;
  doj: string;
  status: string;
  shift: string;
  workWeek: string;
  personalEmail: string;
  personalMobile: string;
  alternatePersonalMobile: string;
  homeTelephone: string;
  preferredContactMethod: string;
  personalEmergencyPerson: string;
  personalEmergencyRelation: string;
  personalEmergencyNumber: string;
  personalEmergencyEmail: string;
  personalEmergencyAlternateMobile: string;
  personalEmergencyAddress: string;
  companyEmail: string;
  officialCommunicationEmail: string;
  companyMobile: string;
  extensionNumber: string;
  directOfficeNumber: string;
  companyEmergencyPerson: string;
  companyEmergencyNumber: string;
  companyEmergencyEmail: string;
};

const COLUMNS: HrReportColumn<Row>[] = [
  { key: "empCode", label: "Employee Code", sortable: true, exportValue: (r) => r.empCode },
  { key: "fullName", label: "Employee Name", sortable: true, exportValue: (r) => r.fullName },
  { key: "branch", label: "Branch", sortable: true, exportValue: (r) => r.branch },
  { key: "department", label: "Department", sortable: true, exportValue: (r) => r.department },
  { key: "designation", label: "Designation", sortable: true, exportValue: (r) => r.designation },
  { key: "category", label: "Employee Category", sortable: true, exportValue: (r) => r.category },
  { key: "company", label: "Payroll Company", sortable: true, exportValue: (r) => r.company },
  { key: "country", label: "Payroll Country", sortable: true, exportValue: (r) => r.country },
  { key: "manager", label: "Reporting Manager", sortable: true, exportValue: (r) => r.manager },
  { key: "doj", label: "Date of Joining", sortable: true, exportValue: (r) => r.doj },
  { key: "status", label: "Employment Status", sortable: true, exportValue: (r) => r.status },
  { key: "shift", label: "Shift", sortable: true, exportValue: (r) => r.shift },
  { key: "workWeek", label: "Work Week", sortable: true, exportValue: (r) => r.workWeek },
  { key: "personalEmail", label: "Personal Email", sortable: true, exportValue: (r) => r.personalEmail },
  { key: "personalMobile", label: "Personal Mobile", sortable: true, exportValue: (r) => r.personalMobile },
  { key: "alternatePersonalMobile", label: "Alternate Personal Mobile", exportValue: (r) => r.alternatePersonalMobile },
  { key: "homeTelephone", label: "Home Telephone", exportValue: (r) => r.homeTelephone },
  { key: "preferredContactMethod", label: "Preferred Contact Method", exportValue: (r) => r.preferredContactMethod },
  { key: "personalEmergencyPerson", label: "Personal Emergency Person", exportValue: (r) => r.personalEmergencyPerson },
  { key: "personalEmergencyRelation", label: "Personal Emergency Relation", exportValue: (r) => r.personalEmergencyRelation },
  { key: "personalEmergencyNumber", label: "Personal Emergency Number", exportValue: (r) => r.personalEmergencyNumber },
  { key: "personalEmergencyEmail", label: "Personal Emergency Email", exportValue: (r) => r.personalEmergencyEmail },
  { key: "personalEmergencyAlternateMobile", label: "Personal Emergency Alternate Mobile", exportValue: (r) => r.personalEmergencyAlternateMobile },
  { key: "personalEmergencyAddress", label: "Personal Emergency Address", exportValue: (r) => r.personalEmergencyAddress },
  { key: "companyEmail", label: "Company Email", sortable: true, exportValue: (r) => r.companyEmail },
  { key: "officialCommunicationEmail", label: "Official Communication Email", exportValue: (r) => r.officialCommunicationEmail },
  { key: "companyMobile", label: "Company Mobile", sortable: true, exportValue: (r) => r.companyMobile },
  { key: "extensionNumber", label: "Extension", exportValue: (r) => r.extensionNumber },
  { key: "directOfficeNumber", label: "Direct Office Number", exportValue: (r) => r.directOfficeNumber },
  { key: "companyEmergencyPerson", label: "Company Emergency Person", exportValue: (r) => r.companyEmergencyPerson },
  { key: "companyEmergencyNumber", label: "Company Emergency Number", exportValue: (r) => r.companyEmergencyNumber },
  { key: "companyEmergencyEmail", label: "Company Emergency Email", exportValue: (r) => r.companyEmergencyEmail },
];

const EXPORT_HEADERS = COLUMNS.map((c) => c.label);

export default function HrEmployeeReportPage() {
  const { can, fire } = useHrAccess();
  const scope = useReportScope({ requireDateRange: false });
  const {
    filters,
    setFilters,
    employees,
    filteredEmployees,
    filterOptions,
    categoryOptions,
    employmentTypes,
    loading,
    refLoading,
  } = scope;

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of employees) m.set(e.id, e.full_name);
    return m;
  }, [employees]);

  const rows = useMemo<Row[]>(() =>
    filteredEmployees.map((e) => {
      const personal = buildPersonalContactExport(e);
      const official = buildOfficialContactExport(e);
      return {
        id: e.id,
        empCode: e.emp_code,
        fullName: e.full_name,
        branch: e.branches?.name ?? "—",
        department: e.departments?.name ?? e.department ?? "—",
        designation: e.designations?.name ?? e.designation ?? "—",
        category: employmentTypeLabel(e),
        company: e.companies ? payrollCompanyLabel(e.companies) : "—",
        country: (e.payroll_country ?? "IN").toUpperCase(),
        manager: e.reporting_mgr_id ? nameById.get(e.reporting_mgr_id) ?? "—" : "—",
        doj: e.date_of_joining ?? "—",
        status: e.status,
        shift: e.shifts?.name ?? "—",
        workWeek: e.work_week ?? "—",
        ...personal,
        ...official,
      };
    }),
  [filteredEmployees, nameById]);

  const summary = useMemo(() => employeeSummaryCounts(filteredEmployees), [filteredEmployees]);
  const canExport = can("export");

  const exportReport = (fmt: "CSV" | "Excel") => {
    downloadReportTable(EXPORT_HEADERS, reportExportRows(COLUMNS, rows), "employee_report", fmt);
    fire(`${fmt} exported`);
  };

  const exportPdf = () => {
    printReportTable("Employee Report", `${rows.length} employees`, EXPORT_HEADERS, reportExportRows(COLUMNS, rows));
    fire("Print dialog opened");
  };

  return (
    <HrReportShell
      title="Employee Report"
      subtitle="Active roster with master fields"
      recordCount={rows.length}
      summaryCards={[
        { lab: "Total Employees", val: summary.total, tone: "blue" },
        { lab: "Active", val: summary.active, tone: "green" },
        { lab: "Inactive", val: summary.inactive, tone: "rose" },
        { lab: "On Probation", val: summary.probation, tone: "orange" },
        { lab: "Confirmed", val: summary.confirmed, tone: "cyan" },
      ]}
      loading={loading}
      canExport={canExport}
      onExportCsv={() => exportReport("CSV")}
      onExportExcel={() => exportReport("Excel")}
      onExportPdf={exportPdf}
      filterBar={
        <ReportFilterBar
          filters={filters}
          onChange={setFilters}
          options={filterOptions}
          employmentTypes={employmentTypes}
          categoryOptions={categoryOptions}
          showStatus
          showWorkWeek
          workWeekOptions={scope.workWeekOptions}
          refLoading={refLoading}
        />
      }
    >
      <HrReportTable columns={COLUMNS} rows={rows} rowKey={(r) => r.id} />
    </HrReportShell>
  );
}
