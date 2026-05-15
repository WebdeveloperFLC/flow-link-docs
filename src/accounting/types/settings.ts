export type EntityType = "COMPANY" | "BRANCH" | "SUB_BRANCH" | "BRAND" | "PERSONAL";

export interface SettingsEntity {
  id: string;
  name: string;
  type: EntityType;
  parentId: string | null;
  country: string; // ISO-2
  currency: string;
  fiscalYearStart: string; // MM-DD
  taxIds: { label: string; value: string }[];
}

export const COUNTRY_FLAG: Record<string, string> = {
  CA: "🇨🇦", US: "🇺🇸", IN: "🇮🇳", GB: "🇬🇧", DE: "🇩🇪", AE: "🇦🇪",
  AU: "🇦🇺", SG: "🇸🇬", CZ: "🇨🇿", FR: "🇫🇷",
};