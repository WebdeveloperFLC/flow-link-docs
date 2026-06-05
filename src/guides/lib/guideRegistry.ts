import type { StaffGuideDef } from "./guideTypes";

/**
 * Register staff guides here. Add a markdown file under `docs/guides/` and a
 * matching entry in this list — the sidebar and index page update automatically.
 *
 * Index: docs/guides/README.md
 */
export const STAFF_GUIDES: StaffGuideDef[] = [
  // —— SOP ——
  {
    slug: "counselor-sop",
    title: "Counselor SOP",
    navLabel: "Counselor SOP",
    description: "Daily counselor workflow, client access, key modules, and escalation.",
    category: "SOP",
    contentFile: "counselor-sop.md",
    relatedModule: "clients",
  },
  {
    slug: "student-application-sop",
    title: "Student Application SOP",
    navLabel: "Student Application SOP",
    description: "Application stages from intake through submission readiness in the CRM.",
    category: "SOP",
    contentFile: "student-application-sop.md",
    relatedModule: "clients",
  },
  {
    slug: "visa-filing-sop",
    title: "Visa Filing SOP",
    navLabel: "Visa Filing SOP",
    description: "Visa filing steps, CRM status tracking, and approval outcomes.",
    category: "SOP",
    contentFile: "visa-filing-sop.md",
    relatedModule: "clients",
  },
  {
    slug: "lead-assignment-sop",
    title: "Lead Assignment SOP",
    navLabel: "Lead Assignment SOP",
    description: "Lead sources, assignment, telecaller queue, and conversion to clients.",
    category: "SOP",
    contentFile: "lead-assignment-sop.md",
    relatedModule: "clients",
  },
  // —— Integrations ——
  {
    slug: "odoo-usage-guide",
    title: "Odoo Usage Guide",
    navLabel: "Odoo Usage",
    description: "CRM ↔ Odoo sync overview, staff expectations, and troubleshooting.",
    category: "Integrations",
    contentFile: "odoo-usage-guide.md",
  },
  {
    slug: "whatsapp-helpline",
    title: "WhatsApp Usage Guide",
    navLabel: "WhatsApp Usage",
    description:
      "Helpline inbox, AI intake, leads, counselor privacy, mock testing (Phase 0), and Meta Cloud API (Phase 1).",
    category: "Integrations",
    contentFile: "whatsapp-helpline.md",
  },
  {
    slug: "telecmi-usage-guide",
    title: "TeleCMI Usage Guide",
    navLabel: "TeleCMI Usage",
    description: "Click-to-call, browser phone, telecaller queue, and telephony settings.",
    category: "Integrations",
    contentFile: "telecmi-usage-guide.md",
  },
  {
    slug: "lms-usage-guide",
    title: "LMS Usage Guide",
    navLabel: "LMS Usage",
    description: "Learning management system access and relationship to CRM (draft).",
    category: "Integrations",
    contentFile: "lms-usage-guide.md",
  },
  {
    slug: "whatsapp-meta-team-setup",
    title: "Helpline on Meta — Team setup",
    navLabel: "WhatsApp Meta setup",
    description:
      "Step-by-step: Meta Developer, sandbox, webhook, Supabase secrets, and go-live checklist.",
    category: "Integrations",
    contentFile: "whatsapp-meta-team-setup.md",
  },
  // —— Module guides ——
  {
    slug: "institutions-module",
    title: "Institutions Module — Staff Operational Guide",
    navLabel: "Institutions Module",
    description:
      "Partner schools, website sources, document uploads, Course Review, publishing to Course Finder, and commission-confidential access.",
    category: "Institutions",
    contentFile: "institutions-module.md",
    relatedModule: "institutions",
  },
];

const contentModules = import.meta.glob("../../../docs/guides/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function contentPathFor(file: string): string | undefined {
  return Object.keys(contentModules).find((k) => k.endsWith(`/${file}`));
}

export function getGuideBySlug(slug: string): StaffGuideDef | undefined {
  return STAFF_GUIDES.find((g) => g.slug === slug);
}

export function getGuideContent(slug: string): string | null {
  const guide = getGuideBySlug(slug);
  if (!guide) return null;
  const path = contentPathFor(guide.contentFile);
  return path ? contentModules[path] : null;
}
