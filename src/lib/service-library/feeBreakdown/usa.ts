import { breakdown, fee, na } from "./builders";
import type { GovtFeeBreakdownSource } from "./types";

const DOS = "https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/fees/fees-visa-services.html";
const SEVIS = "https://www.fmjfee.com";

export const USA_FEE_BREAKDOWNS: GovtFeeBreakdownSource[] = [
  breakdown(
    "b2000001-0001-4000-8000-000000000031",
    "USA – F-1 Student Visa",
    "USD",
    DOS,
    "Jun 2026",
    [
      fee("visa_application", "MRV visa application fee (F-1)", {
        amount: 185,
        currency: "USD",
        unit: "per applicant",
      }),
      fee("sevis", "SEVIS I-901 fee (F-1)", {
        amount: 350,
        currency: "USD",
        unit: "per applicant",
        notes: "Paid to DHS via fmjfee.com · before visa interview",
      }),
      na("dependent_adult", "F-2 dependant MRV", "F-2 dependants pay MRV $185 · no separate SEVIS"),
      na("dependent_child", "F-2 child MRV", "Same as adult dependant"),
      na("landing_rprf", "Landing fee", "Not applicable"),
      na("biometrics", "Biometrics fee", "Included in MRV — no separate charge"),
      fee("vfs_service", "Visa application centre service fee", {
        amount: null,
        currency: "USD",
        unit: "per applicant",
        notes: "Varies by embassy / CGI Federal location",
      }),
      na("health_surcharge", "Healthcare surcharge", "Not applicable — university insurance required"),
      na("priority_service", "Priority processing", "Not available for student visas"),
      fee("other", "Visa Integrity Fee (if implemented)", {
        amount: 250,
        currency: "USD",
        unit: "per applicant",
        notes: "FY2026 legislation — confirm whether collected at issuance for your post",
      }),
    ],
  ),
  breakdown(
    "b2000001-0001-4000-8000-000000000032",
    "USA – B1/B2 Visitor Visa",
    "USD",
    DOS,
    "Jun 2026",
    [
      fee("visa_application", "MRV visa application fee (B1/B2)", {
        amount: 185,
        currency: "USD",
        unit: "per applicant",
        notes: "Non-refundable regardless of outcome",
      }),
      na("sevis", "SEVIS fee", "Not applicable for visitor visas"),
      na("dependent_adult", "Dependant fee", "Each traveller pays own MRV"),
      na("dependent_child", "Child fee", "Same MRV per person"),
      na("landing_rprf", "Landing fee", "Not applicable"),
      na("biometrics", "Biometrics fee", "Included in MRV"),
      fee("vfs_service", "Visa application centre service fee", {
        amount: null,
        currency: "USD",
        unit: "per applicant",
        notes: "Varies by location · check ustraveldocs.com",
      }),
      na("health_surcharge", "Healthcare surcharge", "Not applicable"),
      na("priority_service", "Priority processing", "Not available"),
      fee("other", "Visa reciprocity / issuance fee", {
        amount: null,
        currency: "USD",
        unit: "per applicant",
        notes: "Some nationalities pay additional issuance fee if visa approved — check reciprocity table",
      }),
    ],
  ),
  breakdown(
    "b2000001-0001-4000-8000-000000000033",
    "USA – Spouse / Fiancé Visa (CR-1 / IR-1 / K-1)",
    "USD",
    DOS,
    "Jun 2026",
    [
      fee("visa_application", "Immigrant visa application fee (IV)", {
        amount: 325,
        currency: "USD",
        unit: "per applicant",
        notes: "Immediate relative / family preference after petition approved",
      }),
      fee("other", "I-130 petition fee (USCIS)", {
        amount: 675,
        currency: "USD",
        unit: "per petition",
        notes: "Paid to USCIS when petition filed — separate from DOS IV fee",
      }),
      fee("other", "K-1 fiancé visa MRV fee", {
        amount: 265,
        currency: "USD",
        unit: "per applicant",
        notes: "K-1 nonimmigrant route — different from CR-1/IR-1",
      }),
      na("sevis", "SEVIS fee", "Not applicable"),
      na("landing_rprf", "Landing fee", "USCIS immigrant fee may apply after visa issuance"),
      fee("other", "USCIS immigrant fee (after visa)", {
        amount: 235,
        currency: "USD",
        unit: "per applicant",
        notes: "Paid online after immigrant visa issued · before Green Card production",
      }),
      na("biometrics", "Biometrics", "Included in USCIS/DOS processes"),
      fee("vfs_service", "Embassy / NVC service charges", {
        amount: null,
        currency: "USD",
        unit: "varies",
        notes: "Document courier, medical exam scheduling — third-party",
      }),
      na("health_surcharge", "Healthcare surcharge", "Not applicable"),
      na("priority_service", "Priority processing", "Not available"),
    ],
  ),
  breakdown(
    "b2000001-0001-4000-8000-000000000034",
    "USA – Green Card (Employment & Family)",
    "USD",
    DOS,
    "Jun 2026",
    [
      fee("visa_application", "Immigrant visa application fee (employment-based)", {
        amount: 345,
        currency: "USD",
        unit: "per applicant",
        notes: "After approved I-140 / I-526",
      }),
      fee("other", "I-140 petition fee (USCIS)", {
        amount: 715,
        currency: "USD",
        unit: "per petition",
        notes: "Employment-based immigrant petition",
      }),
      fee("other", "USCIS immigrant fee", {
        amount: 235,
        currency: "USD",
        unit: "per applicant",
        notes: "After visa issuance",
      }),
      fee("dependent_adult", "Accompanying spouse IV fee", {
        amount: 325,
        currency: "USD",
        unit: "per dependent adult",
        notes: "Family preference categories",
      }),
      fee("dependent_child", "Accompanying child IV fee", {
        amount: 325,
        currency: "USD",
        unit: "per dependent child",
      }),
      na("sevis", "SEVIS fee", "Not applicable"),
      na("landing_rprf", "Landing fee", "USCIS immigrant fee covers card production"),
      na("biometrics", "Biometrics", "Included in USCIS filing"),
      fee("vfs_service", "Embassy service charges", {
        amount: null,
        currency: "USD",
        unit: "varies",
        notes: "Medical exam, courier — paid to providers",
      }),
      na("health_surcharge", "Healthcare surcharge", "Not applicable"),
      na("priority_service", "Premium processing (I-140)", {
        amount: 2805,
        currency: "USD",
        unit: "per petition",
        notes: "Optional USCIS premium for petition stage only",
      }),
    ],
  ),
];
