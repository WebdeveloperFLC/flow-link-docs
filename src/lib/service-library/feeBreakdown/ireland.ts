import { breakdown, fee, na } from "./builders";
import type { GovtFeeBreakdownSource } from "./types";

const IRISH_IMM = "https://www.irishimmigration.ie/coming-to-visit-ireland/";

export const IRELAND_FEE_BREAKDOWNS: GovtFeeBreakdownSource[] = [
  breakdown(
    "b2000001-0001-4000-8000-0000000000a3",
    "Ireland – Stamp 2 Student Permission",
    "EUR",
    IRISH_IMM,
    "Jun 2026",
    [
      fee("visa_application", "D visa / residence permission fee (if visa required)", {
        amount: 60,
        currency: "EUR",
        unit: "per applicant",
        notes: "Visa-required nationals · Stamp 2 registration after arrival",
      }),
      fee("other", "IRP / registration fee (in Ireland)", {
        amount: 300,
        currency: "EUR",
        unit: "per applicant",
        notes: "Immigration registration card — paid after arrival in Ireland",
      }),
      na("dependent_adult", "Dependants", "Separate permission if accompanying"),
      na("dependent_child", "Child fee", "Separate if dependant applies"),
      na("landing_rprf", "Landing fee", "Not applicable"),
      na("biometrics", "Biometrics (government)", "No separate charge for Ireland visa"),
      fee("vfs_service", "VFS service charge", {
        amount: null,
        currency: "EUR",
        unit: "per applicant",
        notes: "VFS Ireland India — check vfsglobal.com",
      }),
      na("health_surcharge", "Healthcare surcharge", "Not applicable — private insurance often required"),
      na("sevis", "SEVIS fee", "US only"),
      na("priority_service", "Priority processing", "Not standard"),
    ],
  ),
  breakdown(
    "b2000001-0001-4000-8000-0000000000a4",
    "Ireland – Short Stay Visit Visa (C)",
    "EUR",
    IRISH_IMM,
    "Jun 2026",
    [
      fee("visa_application", "Short stay C visa fee", {
        amount: 60,
        currency: "EUR",
        unit: "per applicant",
        notes: "Single entry short stay",
      }),
      fee("visa_application_multi", "Multi-entry short stay visa", {
        amount: 100,
        currency: "EUR",
        unit: "per applicant",
        notes: "If multi-entry requested",
      }),
      na("dependent_adult", "Dependants", "Each traveller applies separately"),
      na("dependent_child", "Child fee", "Same visa fee per person"),
      na("landing_rprf", "Landing fee", "Not applicable"),
      na("biometrics", "Biometrics (government)", "No separate charge"),
      fee("vfs_service", "VFS service charge", {
        amount: null,
        currency: "EUR",
        unit: "per applicant",
        notes: "VFS Ireland — check vfsglobal.com",
      }),
      na("health_surcharge", "Healthcare surcharge", "Not applicable for short visit"),
      na("sevis", "SEVIS fee", "US only"),
      na("priority_service", "Priority processing", "Not standard"),
    ],
  ),
];
