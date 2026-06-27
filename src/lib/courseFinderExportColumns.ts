import type { ExportColumnDef } from "@/lib/export";
import {
  admissionSummary,
  formatDurationMonths,
  intakeSummary,
  tuitionSummary,
  type CfCourseLike,
} from "@/lib/courseFinderSummaries";

export type CourseFinderExportRow = CfCourseLike & {
  id: string;
  institution: string;
  country: string;
  city: string;
  programUrl: string;
};

export const COURSE_FINDER_EXPORT_COLUMNS: ExportColumnDef<CourseFinderExportRow>[] = [
  { id: "institution", header: "Institution", accessor: (r) => r.institution },
  { id: "program", header: "Program", accessor: (r) => r.name },
  { id: "country", header: "Country", accessor: (r) => r.country },
  { id: "city", header: "City", accessor: (r) => r.city },
  { id: "level", header: "Qualification", accessor: (r) => r.study_level },
  { id: "field", header: "Field of study", accessor: (r) => r.field_of_study },
  { id: "duration", header: "Duration", accessor: (r) => formatDurationMonths(r.duration_months) },
  { id: "tuition", header: "Tuition summary", accessor: tuitionSummary },
  { id: "admission", header: "Admission summary", accessor: admissionSummary },
  { id: "intakes", header: "Intakes", accessor: intakeSummary },
  { id: "pgwp", header: "PGWP", accessor: (r) => (r.pgwp_eligible ? "Yes" : "No") },
  { id: "coop", header: "Co-op", accessor: (r) => (r.coop_available ? "Yes" : "No") },
  {
    id: "scholarship",
    header: "Scholarships available",
    accessor: (r) => (r.scholarship_available ? "Yes" : "No"),
  },
  { id: "programUrl", header: "Official program URL", accessor: (r) => r.programUrl },
];
