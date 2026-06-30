type TemplateLike = {
  standaloneFile?: string;
  fileUrl?: string;
};

/** Infer guide slug from filenames like `canada-visitor-visa-free-guide.html`. */
export function inferGuideSlugFromStandalone(standalone: string): string | null {
  const base = standalone.replace(/\.html$/i, "");
  const match = base.match(/^(.+?)-(?:free-guide(?:-SAMPLE)?)$/i);
  return match?.[1] ?? null;
}

/** Root-level shareable HTML guides (copied to public/ for client links). */
const ROOT_SHAREABLE_GUIDES = new Set(["canada-visitor-visa-free-guide.html"]);

export function resolveTemplateGuideUrl(
  template: TemplateLike,
  guideSlug?: string | null,
): string | undefined {
  const standalone = template.standaloneFile?.trim();
  if (standalone) {
    if (/^https?:\/\//i.test(standalone) || standalone.startsWith("/")) return standalone;
    if (ROOT_SHAREABLE_GUIDES.has(standalone.toLowerCase())) {
      return `/${standalone}`;
    }
    const slug =
      guideSlug?.trim() || inferGuideSlugFromStandalone(standalone) || "canada-student-visa";
    return `/content/service-library/${slug}/downloads/${standalone}`;
  }
  const fileUrl = template.fileUrl?.trim();
  if (fileUrl && !fileUrl.startsWith("#")) return fileUrl;
  return undefined;
}
