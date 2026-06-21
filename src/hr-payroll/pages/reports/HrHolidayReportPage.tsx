import { useMemo } from "react";
import { useHrAccess } from "../../context/HrPayrollProvider";
import { useHrHolidays } from "../../hooks/useHrHolidays";
import { useHrReferenceData } from "../../hooks/useHrEmployees";
import { useReportScope } from "../../hooks/useReportScope";
import { HrReportShell } from "../../components/reports/HrReportShell";
import { ReportFilterBar } from "../../components/reports/ReportFilterBar";
import { HrReportTable, reportExportRows, type HrReportColumn } from "../../components/reports/HrReportTable";
import {
  filterHolidays,
  holidayBranchCountry,
  type HolidayCountryFilter,
} from "../../lib/holidayFilters";
import { dateInRange } from "../../lib/reportFilters";
import { downloadReportTable, printReportTable } from "../../lib/hrReportExport";
import type { BranchRow } from "../../lib/types";

type Row = {
  id: string;
  name: string;
  date: string;
  holidayType: string;
  country: string;
  branch: string;
  categoryTags: string;
  workWeekTags: string;
  payable: string;
};

const COLUMNS: HrReportColumn<Row>[] = [
  { key: "name", label: "Holiday Name", sortable: true, exportValue: (r) => r.name },
  { key: "date", label: "Holiday Date", sortable: true, exportValue: (r) => r.date },
  { key: "holidayType", label: "Holiday Type", sortable: true, exportValue: (r) => r.holidayType },
  { key: "country", label: "Country", sortable: true, exportValue: (r) => r.country },
  { key: "branch", label: "Branch", sortable: true, exportValue: (r) => r.branch },
  { key: "categoryTags", label: "Employee Category", exportValue: (r) => r.categoryTags },
  { key: "workWeekTags", label: "Work Week", exportValue: (r) => r.workWeekTags },
  { key: "payable", label: "Payable", sortable: true, exportValue: (r) => r.payable },
];

const EXPORT_HEADERS = COLUMNS.map((c) => c.label);

function payableLabel(type: string): string {
  return type === "Optional" ? "No" : "Yes";
}

function tagLabels(tags: string[] | null | undefined) {
  const list = (tags ?? []).filter((t) => !["india_staff", "canada_staff"].includes(t));
  return list.length ? list.join(", ") : "—";
}

export default function HrHolidayReportPage() {
  const { can, fire } = useHrAccess();
  const scope = useReportScope();
  const {
    from,
    to,
    filters,
    setFilters,
    setFrom,
    setTo,
    cycleLabel,
    filterOptions,
    categoryOptions,
    employmentTypes,
    loading: scopeLoading,
    refLoading,
  } = scope;

  const { data: holidays = [], isLoading: holidayLoading } = useHrHolidays();
  const { data: ref } = useHrReferenceData();

  const branchesById = useMemo(() => {
    const m: Record<string, BranchRow> = {};
    for (const b of ref?.branches ?? []) m[b.id] = b;
    return m;
  }, [ref?.branches]);

  const countryFilter = (filters.country === "All" ? "All" : filters.country) as HolidayCountryFilter;

  const rows = useMemo<Row[]>(() => {
    const filtered = filterHolidays(
      holidays,
      countryFilter,
      filters.branch,
      filters.holidayType !== "All" ? filters.holidayType : "All",
      branchesById,
    )
      .filter((h) => dateInRange(h.holiday_date, from, to));

    return filtered.map((h) => {
      const branchCountry = holidayBranchCountry(h, branchesById);
      const tags = h.applicable_tags ?? [];
      const workWeek = tags.filter((t) => t.includes("Day") || t === "5-Day" || t === "6-Day");
      const categories = tags.filter((t) => !["india_staff", "canada_staff", "5-Day", "6-Day", "Day"].includes(t));
      return {
        id: h.id,
        name: h.name,
        date: h.holiday_date,
        holidayType: h.type,
        country: branchCountry ?? (tags.includes("canada_staff") ? "CA" : tags.includes("india_staff") ? "IN" : "All"),
        branch: h.branches?.name ?? (h.branch_id ? branchesById[h.branch_id]?.name ?? "—" : "All branches"),
        categoryTags: categories.length ? categories.join(", ") : tagLabels(tags),
        workWeekTags: workWeek.length ? workWeek.join(", ") : "—",
        payable: payableLabel(h.type),
      };
    });
  }, [holidays, countryFilter, filters.branch, filters.holidayType, branchesById, from, to]);

  const summary = useMemo(() => {
    let national = 0;
    let festival = 0;
    let company = 0;
    let optional = 0;
    for (const r of rows) {
      if (r.holidayType === "National") national += 1;
      else if (r.holidayType === "Festival") festival += 1;
      else if (r.holidayType === "Company") company += 1;
      else if (r.holidayType === "Optional") optional += 1;
    }
    return { total: rows.length, national, festival, company, optional };
  }, [rows]);

  const canExport = can("export");
  const loading = scopeLoading || holidayLoading;
  const subtitle = `${from} to ${to}`;

  const exportReport = (fmt: "CSV" | "Excel") => {
    downloadReportTable(
      EXPORT_HEADERS,
      reportExportRows(COLUMNS, rows),
      `holiday_report_${from}_${to}`,
      fmt,
    );
    fire(`${fmt} exported`);
  };

  const exportPdf = () => {
    printReportTable("Holiday Report", subtitle, EXPORT_HEADERS, reportExportRows(COLUMNS, rows));
    fire("Print dialog opened");
  };

  return (
    <HrReportShell
      title="Holiday Report"
      subtitle={subtitle}
      recordCount={rows.length}
      summaryCards={[
        { lab: "Total Holidays", val: summary.total, tone: "blue" },
        { lab: "National", val: summary.national, tone: "green" },
        { lab: "Festival", val: summary.festival, tone: "gold" },
        { lab: "Company", val: summary.company, tone: "cyan" },
        { lab: "Optional", val: summary.optional, tone: "purple" },
      ]}
      loading={loading}
      canExport={canExport}
      onExportCsv={() => exportReport("CSV")}
      onExportExcel={() => exportReport("Excel")}
      onExportPdf={exportPdf}
      filterBar={
        <ReportFilterBar
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          cycleLabel={cycleLabel}
          filters={filters}
          onChange={setFilters}
          options={filterOptions}
          employmentTypes={employmentTypes}
          categoryOptions={categoryOptions}
          showHolidayType
          showOrgFilters
          refLoading={refLoading}
        />
      }
    >
      <HrReportTable columns={COLUMNS} rows={rows} rowKey={(r) => r.id} />
    </HrReportShell>
  );
}
