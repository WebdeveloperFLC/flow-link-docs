import { supabase } from "@/integrations/supabase/client";

export type Country = {
  code: string;
  name: string;
  flag_emoji: string | null;
  status: "active" | "coming_soon";
  order_index: number;
};

export type Pathway = {
  id: string;
  country_code: string;
  pathway_code: string;
  label: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  order_index: number;
};

/** Map DB country name (e.g. "Canada") <-> ISO code ("CA"). */
const NAME_TO_CODE: Record<string, string> = {
  Canada: "CA",
  Germany: "DE",
  "United Kingdom": "UK",
  Australia: "AU",
  "United States": "US",
  "New Zealand": "NZ",
  "United Arab Emirates": "AE",
};
const CODE_TO_NAME: Record<string, string> = Object.fromEntries(Object.entries(NAME_TO_CODE).map(([k, v]) => [v, k]));

export function countryCodeFor(name: string | null | undefined): string {
  if (!name) return "CA";
  if (NAME_TO_CODE[name]) return NAME_TO_CODE[name];
  if (name.length === 2 || name.length === 3) return name.toUpperCase();
  return "CA";
}

export function countryNameFor(code: string | null | undefined): string {
  if (!code) return "Canada";
  return CODE_TO_NAME[code.toUpperCase()] ?? code;
}

/** ISO code → flag emoji, for the countries we support. */
const CODE_TO_FLAG: Record<string, string> = {
  CA: "🇨🇦",
  DE: "🇩🇪",
  UK: "🇬🇧",
  AU: "🇦🇺",
  US: "🇺🇸",
  NZ: "🇳🇿",
  AE: "🇦🇪",
};

/** ISO code → international dial code. */
const CODE_TO_DIAL: Record<string, string> = {
  CA: "+1",
  DE: "+49",
  UK: "+44",
  AU: "+61",
  US: "+1",
  NZ: "+64",
  AE: "+971",
};

export function flagFor(code: string | null | undefined): string {
  if (!code) return "🌍";
  return CODE_TO_FLAG[code.toUpperCase()] ?? "🌍";
}

export function dialCodeFor(code: string | null | undefined): string {
  if (!code) return "";
  return CODE_TO_DIAL[code.toUpperCase()] ?? "";
}

export async function listCountries(): Promise<Country[]> {
  const { data } = await supabase
    .from("countries")
    .select("code, name, flag_emoji, status, order_index")
    .order("order_index");
  return (data ?? []) as Country[];
}

export async function listPathways(countryCode: string): Promise<Pathway[]> {
  const { data } = await supabase
    .from("country_pathways")
    .select("*")
    .eq("country_code", countryCode)
    .eq("is_active", true)
    .order("order_index");
  return (data ?? []) as Pathway[];
}
