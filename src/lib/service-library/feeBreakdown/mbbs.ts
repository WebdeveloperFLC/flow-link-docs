import { breakdown, fee, na } from "./builders";
import type { GovtFeeBreakdownSource } from "./types";

const SABA_TUITION = "https://www.saba.edu/admissions/tuition-and-fees/";
const SYNERGY_TUITION = "https://synergy.ru/abiturientam/programmyi_obucheniya/medical_doctor";
const MUA_TUITION = "https://www.mua.edu/admissions/tuition-and-fees";
const SMU_TUITION = "https://medicine.stmatthews.edu/admissions/tuition-and-fees";
const SEU_TUITION = "https://seu.edu.ge/en/admissions";
const IBSU_TUITION = "https://ibsu.edu.ge/en/schools/medical-school/program/medical-program/";
const ABMU_TUITION = "https://abmu.edu.ge/en/faculty/educational-programmes";

function mdCaribbeanFees(
  libraryId: string,
  title: string,
  tuitionUrl: string,
  islandLabel: string,
): GovtFeeBreakdownSource {
  return breakdown(libraryId, title, "USD", tuitionUrl, "Jun 2026", [
    fee("application", "Application fee", { amount: null, currency: "USD", unit: "per applicant", notes: "Verify on official site" }),
    fee("tuition_semester", "MD tuition (per semester)", { amount: null, currency: "USD", unit: "per semester", notes: "Always quote from official fee schedule" }),
    fee("tuition_total", "Total program tuition (indicative)", { amount: null, currency: "USD", unit: "varies", notes: "Sum of all semesters" }),
    fee("admin_fees", "Student services / administrative fees", { amount: null, currency: "USD", unit: "per semester", notes: "Per university catalog" }),
    fee("usmle", "USMLE Step 1 & Step 2 CK exam fees", { amount: null, currency: "USD", unit: "per exam", notes: "During program" }),
    fee("visa_island", `${islandLabel} visa & permit fees`, { amount: null, currency: "USD", unit: "varies", notes: "Verify for applicant nationality" }),
    fee("visa_us", "US visa / SEVIS (clinical years)", { amount: null, currency: "USD", unit: "varies", notes: "F-1 or university-advised status" }),
    na("vfs_service", "VAC service charge", "Not applicable — direct university / consulate process"),
    fee("other", `Books, equipment & housing (${islandLabel})`, { amount: null, currency: "USD", unit: "per semester", notes: "Verify on official housing page" }),
  ], "University and official fees only. Always confirm on official tuition page before quoting clients.");
}

function georgiaMdFees(libraryId: string, title: string, tuitionUrl: string): GovtFeeBreakdownSource {
  return breakdown(libraryId, title, "USD", tuitionUrl, "Jun 2026", [
    fee("application", "Application fee", { amount: null, currency: "USD", unit: "per applicant", notes: "Verify on official site" }),
    fee("tuition_annual", "MD tuition (annual)", { amount: null, currency: "USD", unit: "per year", notes: "6-year programme — verify fee schedule" }),
    fee("tuition_total", "Total program tuition (indicative)", { amount: null, currency: "USD", unit: "varies", notes: "Sum of 6 years" }),
    fee("admin_fees", "Registration / admin fees", { amount: null, currency: "USD", unit: "varies", notes: "Per university catalog" }),
    fee("visa_georgia", "Georgia student visa (D5) & residence permit", { amount: null, currency: "USD", unit: "varies", notes: "Consulate + migration fees" }),
    fee("insurance", "Health insurance", { amount: null, currency: "USD", unit: "per year", notes: "Mandatory for international students" }),
    fee("other", "Books, equipment & housing (Georgia)", { amount: null, currency: "USD", unit: "per month", notes: "Tbilisi/Batumi living costs vary" }),
  ], "University and official fees only. Always confirm on official tuition page before quoting clients.");
}

export const MBBS_FEE_BREAKDOWNS: GovtFeeBreakdownSource[] = [
  breakdown(
    "b2000001-0001-4000-8000-0000000000d1",
    "Saba University School of Medicine — MD program fees",
    "USD",
    SABA_TUITION,
    "Jun 2026",
    [
      fee("application", "Application fee", { amount: null, currency: "USD", unit: "per applicant", notes: "Verify on saba.edu" }),
      fee("tuition_semester", "MD tuition (per semester)", { amount: null, currency: "USD", unit: "per semester", notes: "10 semesters total" }),
      fee("tuition_total", "Total program tuition (indicative)", { amount: null, currency: "USD", unit: "varies", notes: "Sum of 10 semesters" }),
      fee("admin_fees", "Student services / administrative fees", { amount: null, currency: "USD", unit: "per semester", notes: "Per SUSOM catalog" }),
      fee("usmle", "USMLE Step 1 & Step 2 CK exam fees", { amount: null, currency: "USD", unit: "per exam", notes: "During program" }),
      fee("visa_saba", "Saba / Dutch Caribbean visa & permit fees", { amount: null, currency: "USD", unit: "varies", notes: "Consulate + immigration" }),
      fee("visa_us", "US visa / SEVIS (clinical years)", { amount: null, currency: "USD", unit: "varies", notes: "F-1 or university-advised status" }),
      na("vfs_service", "VAC service charge", "Not applicable"),
      fee("other", "Books, equipment & housing (Saba island)", { amount: null, currency: "USD", unit: "per semester", notes: "See saba.edu housing page" }),
    ],
    "University and official fees only. Tuition changes each academic year — always confirm on saba.edu before quoting clients.",
  ),
  breakdown(
    "b2000001-0001-4000-8000-0000000000d2",
    "Synergy University — General Medicine fees",
    "RUB",
    SYNERGY_TUITION,
    "Jun 2026",
    [
      fee("application", "Application fee", { amount: null, currency: "RUB", unit: "per applicant", notes: "Verify on synergy.ru" }),
      fee("tuition_annual", "Tuition (annual)", { amount: null, currency: "RUB", unit: "per year", notes: "6-year specialist programme" }),
      fee("tuition_total", "Total program tuition (indicative)", { amount: null, currency: "RUB", unit: "varies", notes: "Contact admissions for current RUB/USD quote" }),
      fee("dormitory", "Dormitory / housing", { amount: null, currency: "RUB", unit: "per month", notes: "International student housing — verify availability" }),
      fee("visa_russia", "Russian student visa & migration fees", { amount: null, currency: "RUB", unit: "varies", notes: "Consulate + registration" }),
      fee("insurance", "Medical insurance", { amount: null, currency: "RUB", unit: "per year", notes: "Required for visa and enrollment" }),
      fee("other", "Books, equipment & living (Moscow)", { amount: null, currency: "RUB", unit: "per month", notes: "Moscow living costs — budget separately" }),
    ],
    "University and official fees only. Request current fee quote from Synergy admissions before client commitment.",
  ),
  mdCaribbeanFees(
    "b2000001-0001-4000-8000-0000000000d3",
    "Medical University of the Americas — MD program fees",
    MUA_TUITION,
    "Nevis",
  ),
  mdCaribbeanFees(
    "b2000001-0001-4000-8000-0000000000d4",
    "St. Matthew's University — MD program fees",
    SMU_TUITION,
    "Cayman Islands",
  ),
  georgiaMdFees(
    "b2000001-0001-4000-8000-0000000000d5",
    "Georgian National University SEU — MD program fees",
    SEU_TUITION,
  ),
  georgiaMdFees(
    "b2000001-0001-4000-8000-0000000000d6",
    "International Black Sea University — MD program fees",
    IBSU_TUITION,
  ),
  georgiaMdFees(
    "b2000001-0001-4000-8000-0000000000d7",
    "Avicenna Batumi Medical University — MD program fees",
    ABMU_TUITION,
  ),
];
