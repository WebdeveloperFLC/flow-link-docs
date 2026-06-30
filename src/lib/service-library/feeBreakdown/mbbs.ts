import tuitionData from "./data/mbbs-tuition-data.json";
import { breakdown, fee, na } from "./builders";
import type { GovtFeeBreakdownItem, GovtFeeBreakdownSource } from "./types";

type CaribbeanTuition = {
  archetype: "caribbean_md";
  currency: "USD";
  sourceUrl: string;
  islandLabel: string;
  applicationFee: number;
  basicTuitionPerSem: number;
  clinicalTuitionPerSem: number;
  adminBasicPerSem?: number;
  adminClinicalPerSem?: number;
  adminPerSem?: number;
  totalTuitionAndAdmin?: number;
  totalTuitionOnly?: number;
  usmleStep1: number;
  usmleStep2: number;
  rateNote: string;
};

type GeorgiaTuition = {
  archetype: "georgia_md";
  currency: "USD";
  sourceUrl: string;
  annualTuition: number;
  totalProgramTuition: number;
  programYears: number;
  rateNote: string;
};

type RussiaTuition = {
  archetype: "russia_specialist";
  currency: "RUB";
  sourceUrl: string;
  annualTuition: number;
  totalProgramTuition: number;
  programYears: number;
  rateNote: string;
};

type MbbsTuitionEntry = CaribbeanTuition | GeorgiaTuition | RussiaTuition;

const TUITION_BY_ID = tuitionData as Record<string, MbbsTuitionEntry>;

function caribbeanFees(libraryId: string, title: string, t: CaribbeanTuition): GovtFeeBreakdownSource {
  const adminItems: GovtFeeBreakdownItem[] = [];
  if (t.adminPerSem != null) {
    adminItems.push(
      fee("admin_fees", "Student services / administrative fees", {
        amount: t.adminPerSem,
        currency: "USD",
        unit: "per semester",
        notes: "All 10 semesters — verify on official site",
      }),
    );
  } else if (t.adminBasicPerSem != null && t.adminClinicalPerSem != null) {
    adminItems.push(
      fee("admin_basic", "Administrative fees — basic science (per semester)", {
        amount: t.adminBasicPerSem,
        currency: "USD",
        unit: "per semester",
        notes: "Terms 1–5",
      }),
      fee("admin_clinical", "Administrative fees — clinical (per semester)", {
        amount: t.adminClinicalPerSem,
        currency: "USD",
        unit: "per semester",
        notes: "Terms 6–10",
      }),
    );
  }

  const totalAmount = t.totalTuitionAndAdmin ?? t.totalTuitionOnly ?? null;

  return breakdown(libraryId, title, "USD", t.sourceUrl, "Jun 2026", [
    fee("application", "Application / seat deposit", {
      amount: t.applicationFee,
      currency: "USD",
      unit: "per applicant",
      notes: t.rateNote,
    }),
    fee("tuition_basic", "MD tuition — basic science (per semester)", {
      amount: t.basicTuitionPerSem,
      currency: "USD",
      unit: "per semester",
      notes: "Terms 1–5 (5 semesters)",
    }),
    fee("tuition_clinical", "MD tuition — clinical (per semester)", {
      amount: t.clinicalTuitionPerSem,
      currency: "USD",
      unit: "per semester",
      notes: "Terms 6–10 (5 semesters)",
    }),
    ...adminItems,
    ...(totalAmount != null
      ? [
          fee("tuition_total", "Total program tuition (indicative)", {
            amount: totalAmount,
            currency: "USD",
            unit: "program total",
            notes: t.totalTuitionOnly != null ? "Tuition only — excludes admin if not listed above" : t.rateNote,
          }),
        ]
      : []),
    fee("usmle_step1", "USMLE Step 1 exam fee", {
      amount: t.usmleStep1,
      currency: "USD",
      unit: "per exam",
      notes: "NBME fee — verify current rate",
    }),
    fee("usmle_step2", "USMLE Step 2 CK exam fee", {
      amount: t.usmleStep2,
      currency: "USD",
      unit: "per exam",
      notes: "During clinical years",
    }),
    fee("visa_island", `${t.islandLabel} visa & permit fees`, {
      amount: null,
      currency: "USD",
      unit: "varies",
      notes: "Consulate + immigration — verify for applicant nationality",
    }),
    fee("visa_us", "US visa / SEVIS (clinical years)", {
      amount: null,
      currency: "USD",
      unit: "varies",
      notes: "F-1 or university-advised status",
    }),
    na("vfs_service", "VAC service charge", "Not applicable — direct university / consulate process"),
    fee("other", `Books, equipment & housing (${t.islandLabel})`, {
      amount: null,
      currency: "USD",
      unit: "per semester",
      notes: "See official housing page",
    }),
  ], `University and official fees only. ${t.rateNote}.`);
}

function georgiaFees(libraryId: string, title: string, t: GeorgiaTuition): GovtFeeBreakdownSource {
  return breakdown(libraryId, title, "USD", t.sourceUrl, "Jun 2026", [
    fee("application", "Application fee", {
      amount: null,
      currency: "USD",
      unit: "per applicant",
      notes: "Verify on official site",
    }),
    fee("tuition_annual", "MD tuition (annual)", {
      amount: t.annualTuition,
      currency: "USD",
      unit: "per year",
      notes: `${t.programYears}-year programme — ${t.rateNote}`,
    }),
    fee("tuition_total", "Total program tuition (indicative)", {
      amount: t.totalProgramTuition,
      currency: "USD",
      unit: "program total",
      notes: `${t.programYears} years × USD $${t.annualTuition.toLocaleString("en-US")}/year`,
    }),
    fee("admin_fees", "Registration / admin fees", {
      amount: null,
      currency: "USD",
      unit: "varies",
      notes: "Per university catalog",
    }),
    fee("visa_georgia", "Georgia student visa (D5) & residence permit", {
      amount: null,
      currency: "USD",
      unit: "varies",
      notes: "Consulate + migration fees",
    }),
    fee("insurance", "Health insurance", {
      amount: null,
      currency: "USD",
      unit: "per year",
      notes: "Mandatory for international students",
    }),
    fee("other", "Books, equipment & housing (Georgia)", {
      amount: null,
      currency: "USD",
      unit: "per month",
      notes: "Tbilisi/Batumi living costs vary",
    }),
  ], `University and official fees only. ${t.rateNote}.`);
}

function russiaFees(libraryId: string, title: string, t: RussiaTuition): GovtFeeBreakdownSource {
  return breakdown(libraryId, title, "RUB", t.sourceUrl, "Jun 2026", [
    fee("application", "Application fee", {
      amount: null,
      currency: "RUB",
      unit: "per applicant",
      notes: "Verify on synergy.ru",
    }),
    fee("tuition_annual", "Tuition (annual)", {
      amount: t.annualTuition,
      currency: "RUB",
      unit: "per year",
      notes: t.rateNote,
    }),
    fee("tuition_total", "Total program tuition (indicative)", {
      amount: t.totalProgramTuition,
      currency: "RUB",
      unit: "program total",
      notes: `${t.programYears} years × ₽${t.annualTuition.toLocaleString("en-US")}/year`,
    }),
    fee("dormitory", "Dormitory / housing", {
      amount: null,
      currency: "RUB",
      unit: "per month",
      notes: "International student housing — verify availability",
    }),
    fee("visa_russia", "Russian student visa & migration fees", {
      amount: null,
      currency: "RUB",
      unit: "varies",
      notes: "Consulate + registration",
    }),
    fee("insurance", "Medical insurance", {
      amount: null,
      currency: "RUB",
      unit: "per year",
      notes: "Required for visa and enrollment",
    }),
    fee("other", "Books, equipment & living (Moscow)", {
      amount: null,
      currency: "RUB",
      unit: "per month",
      notes: "Moscow living costs — budget separately",
    }),
  ], `University and official fees only. ${t.rateNote}.`);
}

const INSTITUTION_TITLES: Record<string, string> = {
  "b2000001-0001-4000-8000-0000000000d1": "Saba University School of Medicine — MD program fees",
  "b2000001-0001-4000-8000-0000000000d2": "Synergy University — General Medicine fees",
  "b2000001-0001-4000-8000-0000000000d3": "Medical University of the Americas — MD program fees",
  "b2000001-0001-4000-8000-0000000000d4": "St. Matthew's University — MD program fees",
  "b2000001-0001-4000-8000-0000000000d5": "Georgian National University SEU — MD program fees",
  "b2000001-0001-4000-8000-0000000000d6": "International Black Sea University — MD program fees",
  "b2000001-0001-4000-8000-0000000000d7": "Avicenna Batumi Medical University — MD program fees",
};

function buildMbbsFeeBreakdown(libraryId: string): GovtFeeBreakdownSource | null {
  const t = TUITION_BY_ID[libraryId];
  const title = INSTITUTION_TITLES[libraryId];
  if (!t || !title) return null;

  if (t.archetype === "caribbean_md") return caribbeanFees(libraryId, title, t);
  if (t.archetype === "georgia_md") return georgiaFees(libraryId, title, t);
  return russiaFees(libraryId, title, t);
}

export const MBBS_FEE_BREAKDOWNS: GovtFeeBreakdownSource[] = Object.keys(TUITION_BY_ID)
  .map((id) => buildMbbsFeeBreakdown(id))
  .filter((b): b is GovtFeeBreakdownSource => b != null);
