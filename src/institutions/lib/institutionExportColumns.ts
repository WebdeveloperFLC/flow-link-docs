import type { ExportColumnDef } from "@/lib/export";
import type { UpiInstitution } from "../types/upi";

export const INSTITUTION_EXPORT_COLUMNS: ExportColumnDef<UpiInstitution>[] = [
  { id: "name", header: "Name", accessor: (r) => r.name },
  { id: "country", header: "Country", accessor: (r) => r.country_name },
  { id: "type", header: "Institution Type", accessor: (r) => r.institution_type },
  { id: "status", header: "Status", accessor: (r) => r.institution_status },
  { id: "partner", header: "Partner", accessor: (r) => r.is_partner },
  { id: "active", header: "Active", accessor: (r) => r.is_active },
  { id: "website", header: "Website", accessor: (r) => r.website_url },
  { id: "completeness", header: "Completeness %", accessor: (r) => r.completeness_score },
  { id: "catalog", header: "Catalog Status", accessor: (r) => r.catalog_status },
];
