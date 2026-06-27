import type { ExportColumnDef } from "@/lib/export";
import type { UpiCourseStaging } from "../types/upi";
import { formatCampusDisplay } from "./courseDedup";

export interface ProgramExportLookups {
  instName: (id: string | null) => string;
  instCountry: (id: string | null) => string | null;
  levelName: (id: string | null) => string;
}

function metaStr(r: UpiCourseStaging, key: string): string {
  const m = r.metadata as Record<string, unknown> | null;
  const v = m?.[key];
  return v == null ? "" : String(v).trim();
}

function formatDuration(r: UpiCourseStaging): string {
  if (r.duration_value == null) return "";
  return `${r.duration_value} ${r.duration_unit ?? "months"}`;
}

function deliveryMode(r: UpiCourseStaging): string {
  const m = r.metadata as Record<string, unknown> | null;
  return String(m?.program_delivery_mode ?? (r.is_online ? "Online" : "")).trim();
}

function joinIntakes(r: UpiCourseStaging): string {
  const months = r.intake_months as string[] | null;
  return months?.length ? months.join(", ") : "";
}

function pgwpLabel(r: UpiCourseStaging): string {
  if (r.is_pgwp_eligible === true) return "Yes";
  if (r.is_pgwp_eligible === false) return "No";
  return "";
}

/** Counselling-friendly columns aligned with program sheet import headers where possible. */
export function buildProgramExportColumns(lookups: ProgramExportLookups): ExportColumnDef<UpiCourseStaging>[] {
  const { instName, instCountry, levelName } = lookups;
  return [
    { id: "program", header: "Program Name", accessor: (r) => r.course_title },
    { id: "institution", header: "Institution", accessor: (r) => instName(r.institution_id) },
    { id: "sheetInstitute", header: "Sheet Institute", accessor: (r) => metaStr(r, "institute_name") },
    { id: "country", header: "Country", accessor: (r) => instCountry(r.institution_id) ?? r.country_name ?? "" },
    { id: "level", header: "Program Level", accessor: (r) => levelName(r.program_level_id) },
    {
      id: "campus",
      header: "Campus",
      accessor: (r) => {
        const d = formatCampusDisplay(r);
        return d === "—" ? "" : d;
      },
    },
    { id: "city", header: "City", accessor: (r) => r.city },
    { id: "state", header: "State / Province", accessor: (r) => r.state_province },
    { id: "duration", header: "Duration", accessor: formatDuration },
    { id: "tuition", header: "Tuition Fees", accessor: (r) => r.tuition_fee_per },
    { id: "tuitionType", header: "Tuition Fees Type", accessor: (r) => metaStr(r, "tuition_fees_type") || r.tuition_fee_per },
    { id: "currency", header: "Currency", accessor: (r) => r.currency },
    { id: "appFee", header: "Application Fees", accessor: (r) => r.application_fee },
    { id: "intakes", header: "Course Intake", accessor: joinIntakes },
    { id: "ielts", header: "IELTS Overall Score", accessor: (r) => r.ielts_overall },
    { id: "ieltsMin", header: "IELTS Min Band", accessor: (r) => r.ielts_min_component },
    { id: "pte", header: "PTE Overall Score", accessor: (r) => r.pte_overall },
    { id: "toefl", header: "TOEFL Overall Score", accessor: (r) => r.toefl_overall },
    { id: "duolingo", header: "Duolingo Overall Score", accessor: (r) => r.duolingo_overall },
    { id: "gpa", header: "GPA Requirement", accessor: (r) => r.gpa_requirement },
    { id: "pgwp", header: "PGWP Eligible", accessor: pgwpLabel },
    { id: "delivery", header: "Program Delivery Mode", accessor: deliveryMode },
    { id: "field", header: "Field of Study", accessor: (r) => metaStr(r, "field_of_study") },
    { id: "programUrl", header: "Program URL", accessor: (r) => r.program_url ?? r.source_url },
    { id: "applyUrl", header: "Application URL Link", accessor: (r) => metaStr(r, "apply_url") },
    { id: "status", header: "Review Status", accessor: (r) => r.review_status?.replace(/_/g, " ") ?? "" },
    { id: "confidence", header: "Confidence %", accessor: (r) => (r.confidence_score != null ? Math.round(r.confidence_score) : "") },
    { id: "source", header: "Source", accessor: (r) => r.source_type },
  ];
}
