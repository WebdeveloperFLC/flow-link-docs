import type { StaffGuideDef } from "./guideTypes";

/**
 * Register staff guides here. Add a markdown file under `docs/guides/` and a
 * matching entry in this list — the sidebar and index page update automatically.
 */
export const STAFF_GUIDES: StaffGuideDef[] = [
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
  {
    slug: "whatsapp-helpline",
    title: "WhatsApp Helpline — Staff Guide",
    navLabel: "WhatsApp Helpline",
    description:
      "Helpline inbox, AI intake, leads, counselor privacy, mock testing (Phase 0), and Meta Cloud API setup (Phase 1).",
    category: "CRM",
    contentFile: "whatsapp-helpline.md",
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
