/** Shared validation for Node scripts and browser TS (no type imports). */

const ACADEMY_TAB_IDS = new Set([
  "overview",
  "institution",
  "programs",
  "fees",
  "countryinsights",
  "practice",
  "eligibility",
  "acceptance",
  "testday",
  "checklist",
  "binder",
  "visaforms",
  "process",
  "dos",
  "redflags",
  "faqs",
  "compliance",
  "downloads",
  "sampledocs",
  "documentstructure",
  "quiz",
  "notes",
  "changelog",
]);

const SCHEMA_VERSION = "1.0";

/**
 * @param {unknown} raw
 * @param {{ requireSchemaVersion?: boolean }} [opts]
 * @returns {{ ok: boolean, schemaVersion: string | null, issues: { path: string, message: string }[] }}
 */
export function validateKnowledgeCentreJsonCore(raw, opts = {}) {
  const issues = [];

  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ok: false,
      schemaVersion: null,
      issues: [{ path: "$", message: "Root must be a JSON object" }],
    };
  }

  /** @type {Record<string, unknown>} */
  const obj = raw;
  const schemaVersion =
    typeof obj.schemaVersion === "string" && obj.schemaVersion.trim()
      ? obj.schemaVersion.trim()
      : null;

  if (opts.requireSchemaVersion && schemaVersion !== SCHEMA_VERSION) {
    issues.push({
      path: "schemaVersion",
      message: `schemaVersion must be "${SCHEMA_VERSION}" for Knowledge Centre v1.0 imports`,
    });
  }

  if (schemaVersion === SCHEMA_VERSION) {
    if (typeof obj.displayName !== "string" || !obj.displayName.trim()) {
      issues.push({ path: "displayName", message: "displayName is required (non-empty string)" });
    }

    const nav = obj.navigation;
    if (nav == null || typeof nav !== "object" || Array.isArray(nav)) {
      issues.push({ path: "navigation", message: "navigation object is required for schemaVersion 1.0" });
    } else {
      const sections = /** @type {{ sections?: unknown }} */ (nav).sections;
      if (!Array.isArray(sections) || sections.length === 0) {
        issues.push({
          path: "navigation.sections",
          message: "navigation.sections must be a non-empty array",
        });
      } else {
        const seen = new Set();
        sections.forEach((section, index) => {
          const base = `navigation.sections[${index}]`;
          if (section == null || typeof section !== "object" || Array.isArray(section)) {
            issues.push({ path: base, message: "Each section must be an object" });
            return;
          }
          const id = /** @type {{ id?: unknown }} */ (section).id;
          if (typeof id !== "string" || !ACADEMY_TAB_IDS.has(id)) {
            issues.push({
              path: `${base}.id`,
              message: `id must be one of: ${[...ACADEMY_TAB_IDS].join(", ")}`,
            });
          } else if (seen.has(id)) {
            issues.push({ path: `${base}.id`, message: `Duplicate section id "${id}"` });
          } else {
            seen.add(id);
          }
          const label = /** @type {{ label?: unknown }} */ (section).label;
          if (label != null && typeof label !== "string") {
            issues.push({ path: `${base}.label`, message: "label must be a string when present" });
          }
          const sortOrder = /** @type {{ sortOrder?: unknown }} */ (section).sortOrder;
          if (sortOrder != null && typeof sortOrder !== "number") {
            issues.push({ path: `${base}.sortOrder`, message: "sortOrder must be a number when present" });
          }
        });
      }
    }
  }

  if (Array.isArray(obj.faqs)) {
    obj.faqs.forEach((faq, i) => {
      if (faq == null || typeof faq !== "object") {
        issues.push({ path: `faqs[${i}]`, message: "FAQ must be an object" });
        return;
      }
      const row = /** @type {{ q?: unknown, a?: unknown }} */ (faq);
      if (typeof row.q !== "string" || !row.q.trim()) {
        issues.push({ path: `faqs[${i}].q`, message: "Question (q) is required" });
      }
      if (typeof row.a !== "string" || !row.a.trim()) {
        issues.push({ path: `faqs[${i}].a`, message: "Answer (a) is required" });
      }
    });
  }

  if (Array.isArray(obj.quiz)) {
    obj.quiz.forEach((item, i) => {
      if (item == null || typeof item !== "object") {
        issues.push({ path: `quiz[${i}]`, message: "Quiz item must be an object" });
        return;
      }
      const row = /** @type {{ question?: unknown, options?: unknown, correctIndex?: unknown }} */ (item);
      if (typeof row.question !== "string" || !row.question.trim()) {
        issues.push({ path: `quiz[${i}].question`, message: "question is required" });
      }
      if (!Array.isArray(row.options) || row.options.length < 2) {
        issues.push({ path: `quiz[${i}].options`, message: "options must be an array with at least 2 items" });
      } else {
        const badOption = row.options.some((o) => typeof o !== "string");
        if (badOption) {
          issues.push({ path: `quiz[${i}].options`, message: "each option must be a string" });
        }
      }
      if (typeof row.correctIndex !== "number" || !Number.isInteger(row.correctIndex)) {
        issues.push({ path: `quiz[${i}].correctIndex`, message: "correctIndex must be an integer" });
      } else if (Array.isArray(row.options) && (row.correctIndex < 0 || row.correctIndex >= row.options.length)) {
        issues.push({
          path: `quiz[${i}].correctIndex`,
          message: "correctIndex must be within options range",
        });
      }
    });
  }

  if (Array.isArray(obj.redFlags)) {
    obj.redFlags.forEach((flag, i) => {
      if (flag == null || typeof flag !== "object") {
        issues.push({ path: `redFlags[${i}]`, message: "Red flag must be an object" });
        return;
      }
      const row = /** @type {{ title?: unknown, fix?: unknown }} */ (flag);
      if (typeof row.title !== "string" || !row.title.trim()) {
        issues.push({ path: `redFlags[${i}].title`, message: "title is required" });
      }
      if (typeof row.fix !== "string" || !row.fix.trim()) {
        issues.push({ path: `redFlags[${i}].fix`, message: "fix is required" });
      }
    });
  }

  if (Array.isArray(obj.resources)) {
    obj.resources.forEach((res, i) => {
      if (res == null || typeof res !== "object") {
        issues.push({ path: `resources[${i}]`, message: "Resource must be an object" });
        return;
      }
      const row = /** @type {{ title?: unknown, url?: unknown }} */ (res);
      if (typeof row.title !== "string" || !row.title.trim()) {
        issues.push({ path: `resources[${i}].title`, message: "title is required" });
      }
      if (typeof row.url !== "string" || !row.url.trim()) {
        issues.push({ path: `resources[${i}].url`, message: "url is required" });
      }
    });
  }

  return { ok: issues.length === 0, schemaVersion, issues };
}
