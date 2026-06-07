import { VISA_COUNTRY_PRIORITY } from "@/lib/service-library/countryBadges";

/** Temporary entry visas vs permanent / economic immigration pathways. */
export type VisaImmigrationBucket = "visa" | "immigration";

export type CoachingVariant = "general" | "academic" | "other";

const IMMIGRATION_KEYWORDS = [
  "express entry",
  "permanent",
  " pr",
  "pgwp",
  "post study",
  "post-study",
  "post study work",
  "skilled migrant",
  "skilled migration",
  "skilled worker",
  "green card",
  "opportunity card",
  "chancenkarte",
  "job seeker",
  "graduate route",
  "subclass 189",
  "subclass 190",
  "subclass 491",
  "subclass 485",
  "smc",
  "work permit",
  "sponsorship",
  "sponsor",
];

const VISA_KEYWORDS = [
  "student",
  "visitor",
  "visit",
  "trv",
  "schengen",
  "super visa",
  "b1/b2",
  "f-1",
  "partner visa",
  "spouse",
  "spousal",
  "family reunion",
  "fiancé",
  "fiance",
];

export function resolveServiceCountries(
  serviceField: string,
  mappedCountries: string[],
): string[] {
  if (mappedCountries.length > 0) return mappedCountries;
  if (VISA_COUNTRY_PRIORITY.includes(serviceField)) return [serviceField];
  return mappedCountries;
}

export function classifyVisaImmigration(args: {
  subService: string;
  displayName?: string;
  navBucket?: VisaImmigrationBucket;
}): VisaImmigrationBucket {
  if (args.navBucket === "visa" || args.navBucket === "immigration") return args.navBucket;

  const hay = `${args.displayName ?? ""} ${args.subService}`.toLowerCase();

  const immigrationHit = IMMIGRATION_KEYWORDS.some((k) => hay.includes(k));
  const visaHit = VISA_KEYWORDS.some((k) => hay.includes(k));

  if (immigrationHit && !visaHit) return "immigration";
  if (visaHit && !immigrationHit) return "visa";

  // Spousal sponsorship / partner visas are immigration programs; visitor/student stay visa.
  if (hay.includes("sponsorship") || hay.includes("express entry")) return "immigration";
  if (hay.includes("student") || hay.includes("visitor") || hay.includes("schengen")) return "visa";

  return immigrationHit ? "immigration" : "visa";
}

export function coachingFamilyLabel(serviceField: string): string {
  const s = serviceField.trim();
  if (!s) return "Other";
  if (s.toLowerCase() === "ielts") return "IELTS";
  return s;
}

export function classifyCoachingVariant(subService: string, displayName?: string): CoachingVariant {
  const hay = `${displayName ?? ""} ${subService}`.toLowerCase();
  if (/\bacademic\b/.test(hay) || /\bac\b/.test(hay)) return "academic";
  if (/\bgeneral\b/.test(hay) || /\bgn\b/.test(hay)) return "general";
  return "other";
}

export function coachingVariantLabel(v: CoachingVariant): string {
  if (v === "general") return "General";
  if (v === "academic") return "Academic";
  return "All formats";
}

export const VISA_IMMIGRATION_BUCKETS: { key: VisaImmigrationBucket; label: string }[] = [
  { key: "visa", label: "Visa" },
  { key: "immigration", label: "Immigration" },
];
