import { breakdown, fee, na } from "./builders";
import type { GovtFeeBreakdownSource } from "./types";

const SABA_TUITION = "https://www.saba.edu/admissions/tuition-and-fees/";

export const MBBS_FEE_BREAKDOWNS: GovtFeeBreakdownSource[] = [
  breakdown(
    "b2000001-0001-4000-8000-0000000000d1",
    "Saba University School of Medicine — MD program fees",
    "USD",
    SABA_TUITION,
    "Jun 2026",
    [
      fee("application", "Application fee", {
        amount: null,
        currency: "USD",
        unit: "per applicant",
        notes: "Verify on saba.edu — may vary by intake",
      }),
      fee("tuition_semester", "MD tuition (per semester)", {
        amount: null,
        currency: "USD",
        unit: "per semester",
        notes: "10 semesters total · always quote from official fee schedule",
      }),
      fee("tuition_total", "Total program tuition (indicative)", {
        amount: null,
        currency: "USD",
        unit: "varies",
        notes: "Sum of 10 semesters — verify before client commitment",
      }),
      fee("admin_fees", "Student services / administrative fees", {
        amount: null,
        currency: "USD",
        unit: "per semester",
        notes: "Per SUSOM catalog",
      }),
      fee("usmle", "USMLE Step 1 & Step 2 CK exam fees", {
        amount: null,
        currency: "USD",
        unit: "per exam",
        notes: "During program — verify current USMLE fees",
      }),
      fee("visa_saba", "Saba / Dutch Caribbean visa & permit fees", {
        amount: null,
        currency: "USD",
        unit: "varies",
        notes: "Consulate + immigration — verify for applicant nationality",
      }),
      fee("visa_us", "US visa / SEVIS (clinical years)", {
        amount: null,
        currency: "USD",
        unit: "varies",
        notes: "F-1 or university-advised status for US rotations",
      }),
      na("vfs_service", "VAC service charge", "Not applicable — direct university / consulate process"),
      na("health_surcharge", "Healthcare surcharge (govt)", "Private health insurance required instead"),
      na("landing_rprf", "Landing fee", "Not applicable for student route"),
      fee("other", "Books, equipment & housing (Saba island)", {
        amount: null,
        currency: "USD",
        unit: "per semester",
        notes: "See saba.edu/student-experience/housing/",
      }),
    ],
    "University and official fees only. Tuition changes each academic year — always confirm on saba.edu before quoting clients.",
  ),
];
