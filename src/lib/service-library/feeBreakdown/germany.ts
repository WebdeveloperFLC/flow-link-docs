import { breakdown, fee, na, schengenStudent, schengenVisitor } from "./builders";
import type { GovtFeeBreakdownSource } from "./types";

const VFS_DE = "VFS Germany India: service fee + optional courier — check vfs-global.com";

export const GERMANY_FEE_BREAKDOWNS: GovtFeeBreakdownSource[] = [
  schengenStudent(
    "b2000001-0001-4000-8000-000000000051",
    "Germany",
    VFS_DE,
    "National D visa for studies · blocked account (Sperrkonto) required — not a govt fee",
  ),
  schengenVisitor("b2000001-0001-4000-8000-000000000052", "Germany", VFS_DE),
  breakdown(
    "b2000001-0001-4000-8000-000000000053",
    "Germany – Family Reunion (Spouse) Visa",
    "EUR",
    "https://www.germany-visa.org/family-reunion-visa/",
    "Jun 2026",
    [
      fee("visa_application", "National D visa (family reunion) fee", {
        amount: 75,
        currency: "EUR",
        unit: "per applicant",
      }),
      fee("dependent_child", "Minor child family reunion", {
        amount: 75,
        currency: "EUR",
        unit: "per dependent child",
        notes: "Reduced or exempt for minors in some cases — verify embassy",
      }),
      na("landing_rprf", "Landing fee", "Residence permit fee paid in Germany after arrival"),
      fee("other", "Residence permit fee (in Germany)", {
        amount: 100,
        currency: "EUR",
        unit: "per applicant",
        notes: "Approximate Ausländerbehörde charge — varies by municipality",
      }),
      na("biometrics", "Biometrics (government)", "Included in visa fee"),
      fee("vfs_service", "VFS service charge", {
        amount: null,
        currency: "EUR",
        unit: "per applicant",
        notes: VFS_DE,
      }),
      na("health_surcharge", "Healthcare surcharge", "Not applicable — health insurance required"),
      na("sevis", "SEVIS fee", "US only"),
      na("priority_service", "Priority processing", "Not standard"),
    ],
  ),
  breakdown(
    "b2000001-0001-4000-8000-000000000054",
    "Germany – Opportunity Card (Chancenkarte)",
    "EUR",
    "https://www.make-it-in-germany.com/en/visa-residence/types/chancenkarte",
    "Jun 2026",
    [
      fee("visa_application", "National D visa / Opportunity Card fee", {
        amount: 75,
        currency: "EUR",
        unit: "per applicant",
      }),
      na("dependent_adult", "Dependants", "Separate applications if accompanying"),
      na("landing_rprf", "Landing fee", "Residence permit issued in Germany"),
      fee("other", "Residence permit fee (in Germany)", {
        amount: 100,
        currency: "EUR",
        unit: "per applicant",
        notes: "Paid to local immigration office",
      }),
      na("biometrics", "Biometrics (government)", "Included in visa fee"),
      fee("vfs_service", "VFS service charge", {
        amount: null,
        currency: "EUR",
        unit: "per applicant",
        notes: VFS_DE,
      }),
      na("health_surcharge", "Healthcare surcharge", "Not applicable"),
      na("sevis", "SEVIS fee", "US only"),
      na("priority_service", "Priority processing", "Not standard"),
    ],
  ),
  breakdown(
    "b2000001-0001-4000-8000-000000000055",
    "Germany – Job Seeker Visa",
    "EUR",
    "https://www.make-it-in-germany.com/en/visa-residence/types/job-search-opportunity-card",
    "Jun 2026",
    [
      fee("visa_application", "Job seeker national D visa fee", {
        amount: 75,
        currency: "EUR",
        unit: "per applicant",
      }),
      na("dependent_adult", "Dependants", "Generally not permitted on job seeker route"),
      na("landing_rprf", "Landing fee", "Not applicable"),
      na("biometrics", "Biometrics (government)", "Included in visa fee"),
      fee("vfs_service", "VFS service charge", {
        amount: null,
        currency: "EUR",
        unit: "per applicant",
        notes: VFS_DE,
      }),
      na("health_surcharge", "Healthcare surcharge", "Not applicable"),
      na("sevis", "SEVIS fee", "US only"),
      na("priority_service", "Priority processing", "Not standard"),
    ],
  ),
];
