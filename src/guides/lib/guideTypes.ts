/** CRM module key used to gate guide visibility (optional). */
export type GuideRelatedModule =
  | "institutions"
  | "commissions"
  | "clients"
  | "digital_success_hub"
  | "incentives"
  | "hr_payroll"
  | "accounting";

export interface StaffGuideDef {
  /** URL segment, e.g. `/guides/institutions-module` */
  slug: string;
  /** Full page title */
  title: string;
  /** Short label for sidebar navigation */
  navLabel: string;
  /** One-line summary on the index page */
  description: string;
  /** Grouping label on the index page */
  category: string;
  /** Markdown filename under `docs/guides/` (not docs/governance/) */
  contentFile: string;
  /** When set, user needs view access on this module (admins always see it). */
  relatedModule?: GuideRelatedModule;
}
