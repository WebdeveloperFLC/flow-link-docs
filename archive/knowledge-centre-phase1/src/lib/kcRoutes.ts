/** Canonical Knowledge Centre paths — merged into Service Library module. */
export const KC_MODULE_BASE = "/service-library";

export const kcRoutes = {
  articles: () => `${KC_MODULE_BASE}/articles`,
  article: (slug: string) => `${KC_MODULE_BASE}/articles/${encodeURIComponent(slug)}`,
  faqs: () => `${KC_MODULE_BASE}/faqs`,
  quiz: () => `${KC_MODULE_BASE}/quiz`,
  quizRun: (slug: string) => `${KC_MODULE_BASE}/quiz/${encodeURIComponent(slug)}`,
  downloads: () => `${KC_MODULE_BASE}/downloads`,
  officialSources: () => `${KC_MODULE_BASE}/official-sources`,
  search: (q?: string) =>
    q?.trim() ? `${KC_MODULE_BASE}/search?q=${encodeURIComponent(q.trim())}` : `${KC_MODULE_BASE}/search`,
  serviceGuide: (libraryId: string) =>
    `${KC_MODULE_BASE}?id=${encodeURIComponent(libraryId)}&tab=guide`,
  admin: () => "/service-library-admin/knowledge-centre",
  adminArticle: (id: string) => `/service-library-admin/knowledge-centre/articles/${encodeURIComponent(id)}`,
};
