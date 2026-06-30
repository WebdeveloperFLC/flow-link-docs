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
const SCHEMA_REF = "flc-knowledge-guide-schema-v1.0";

const ZIP_NAV_KEYS = new Set([
  "overview",
  "eligibility",
  "cost",
  "checklist",
  "binder",
  "visaforms",
  "process",
  "working",
  "dos",
  "redflags",
  "faqs",
  "compliance",
  "downloads",
  "sampledocs",
  "quiz",
  "related",
  "sources",
]);

const SECTION_TYPES = new Set([
  "overview",
  "criteria-list",
  "cost-breakdown",
  "checklist",
  "document-binder",
  "forms-table",
  "timeline",
  "working-rights",
  "dos-donts",
  "red-flags",
  "faqs",
  "list",
  "downloads",
  "sample-docs",
  "quiz",
  "related",
  "sources",
]);

const GOVT_DOMAIN =
  /(?:^|\.)((canada|gc)\.ca|gov\.(uk|au|nz|in|sg)|europa\.eu|homeaffairs\.gov\.au|uscis\.gov|state\.gov)/i;

function isZipGuide(obj) {
  return obj.schemaRef === SCHEMA_REF && obj.schemaVersion === SCHEMA_VERSION && Array.isArray(obj.navigation);
}

function isLegacyKcNav(obj) {
  const nav = obj.navigation;
  return nav && typeof nav === "object" && !Array.isArray(nav) && Array.isArray(nav.sections);
}

function validateSourceRefs(sourceRefs, path, issues, requireGovUrl = false) {
  if (sourceRefs == null) return;
  if (!Array.isArray(sourceRefs)) {
    issues.push({ path, message: "sourceRefs must be an array when present" });
    return;
  }
  sourceRefs.forEach((ref, i) => {
    const base = `${path}[${i}]`;
    if (ref == null || typeof ref !== "object") {
      issues.push({ path: base, message: "sourceRef must be an object" });
      return;
    }
    if (typeof ref.id !== "string" || !ref.id.trim()) {
      issues.push({ path: `${base}.id`, message: "sourceRef id is required" });
    }
    if (typeof ref.url !== "string" || !ref.url.trim()) {
      issues.push({ path: `${base}.url`, message: "sourceRef url is required" });
    } else if (requireGovUrl && !GOVT_DOMAIN.test(ref.url)) {
      issues.push({ path: `${base}.url`, message: "source URL should be an official government domain" });
    }
  });
}

function hasDataForKey(obj, dataKey) {
  const val = obj[dataKey];
  if (val == null) return false;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === "object") {
    if (Array.isArray(val.items) && val.items.length > 0) return true;
    if (Array.isArray(val.forms) && val.forms.length > 0) return true;
    if (Array.isArray(val.templates) && val.templates.length > 0) return true;
    if (Array.isArray(val.categories) && val.categories.length > 0) return true;
    if (val.flagStatus) return true;
    if (val.applicant || val.spouse) return true;
    if (Array.isArray(val.sections) && val.sections.length > 0) return true;
    if (val.dos || val.donts || val.mistakes) return true;
    return Object.keys(val).length > 0;
  }
  return true;
}

function validateZipGuide(obj, issues, opts) {
  if (typeof obj.slug !== "string" || !obj.slug.trim()) {
    issues.push({ path: "slug", message: "slug is required (non-empty string)" });
  }
  if (typeof obj.displayName !== "string" || !obj.displayName.trim()) {
    issues.push({ path: "displayName", message: "displayName is required (non-empty string)" });
  }
  if (typeof obj.shortDescription !== "string" || !obj.shortDescription.trim()) {
    issues.push({ path: "shortDescription", message: "shortDescription is required (non-empty string)" });
  }
  if (typeof obj.country !== "string" || !obj.country.trim()) {
    issues.push({ path: "country", message: "country is required (non-empty string)" });
  }
  if (typeof obj.service !== "string" || !obj.service.trim()) {
    issues.push({ path: "service", message: "service is required (non-empty string)" });
  }
  if (typeof obj.navBucket !== "string" || !obj.navBucket.trim()) {
    issues.push({ path: "navBucket", message: "navBucket is required (non-empty string)" });
  }
  if (typeof obj.builtToStandard !== "string" || !obj.builtToStandard.trim()) {
    issues.push({ path: "builtToStandard", message: "builtToStandard is required" });
  }
  if (typeof obj.sourcePolicy !== "string" || !obj.sourcePolicy.trim()) {
    issues.push({ path: "sourcePolicy", message: "sourcePolicy is required" });
  }

  const policyAlert = obj.policyAlert;
  if (policyAlert == null || typeof policyAlert !== "object" || Array.isArray(policyAlert)) {
    issues.push({ path: "policyAlert", message: "policyAlert object is required" });
  } else if (typeof policyAlert.summary !== "string" || !policyAlert.summary.trim()) {
    issues.push({ path: "policyAlert.summary", message: "policyAlert.summary is required" });
  } else {
    validateSourceRefs(policyAlert.sourceRefs, "policyAlert.sourceRefs", issues);
  }

  if (!Array.isArray(obj.kpis) || obj.kpis.length < 1) {
    issues.push({ path: "kpis", message: "kpis must be a non-empty array" });
  } else {
    obj.kpis.forEach((kpi, i) => {
      const base = `kpis[${i}]`;
      if (kpi == null || typeof kpi !== "object") {
        issues.push({ path: base, message: "KPI must be an object" });
        return;
      }
      if (typeof kpi.label !== "string" || !kpi.label.trim()) {
        issues.push({ path: `${base}.label`, message: "label is required" });
      }
      if (typeof kpi.value !== "string" || !kpi.value.trim()) {
        issues.push({ path: `${base}.value`, message: "value is required" });
      }
      validateSourceRefs(kpi.sourceRefs, `${base}.sourceRefs`, issues);
    });
  }

  if (!Array.isArray(obj.sources) || obj.sources.length === 0) {
    issues.push({ path: "sources", message: "sources registry must be a non-empty array" });
  } else {
    obj.sources.forEach((src, i) => {
      const base = `sources[${i}]`;
      if (src == null || typeof src !== "object") {
        issues.push({ path: base, message: "Source must be an object" });
        return;
      }
      for (const field of ["id", "authority", "page", "category", "url", "reason"]) {
        if (typeof src[field] !== "string" || !src[field].trim()) {
          issues.push({ path: `${base}.${field}`, message: `${field} is required` });
        }
      }
      if (typeof src.url === "string" && src.url.trim() && !GOVT_DOMAIN.test(src.url)) {
        issues.push({ path: `${base}.url`, message: "source url should be an official government domain" });
      }
    });
  }

  if (!Array.isArray(obj.navigation) || obj.navigation.length === 0) {
    issues.push({ path: "navigation", message: "navigation must be a non-empty array" });
  } else {
    const seenKeys = new Set();
    let hasCostSection = false;

    obj.navigation.forEach((entry, index) => {
      const base = `navigation[${index}]`;
      if (entry == null || typeof entry !== "object" || Array.isArray(entry)) {
        issues.push({ path: base, message: "Each navigation entry must be an object" });
        return;
      }
      if (typeof entry.key !== "string" || !ZIP_NAV_KEYS.has(entry.key)) {
        issues.push({
          path: `${base}.key`,
          message: `key must be one of: ${[...ZIP_NAV_KEYS].join(", ")}`,
        });
      } else if (seenKeys.has(entry.key)) {
        issues.push({ path: `${base}.key`, message: `Duplicate navigation key "${entry.key}"` });
      } else {
        seenKeys.add(entry.key);
      }
      if (typeof entry.label !== "string" || !entry.label.trim()) {
        issues.push({ path: `${base}.label`, message: "label is required" });
      }
      if (typeof entry.sectionType !== "string" || !SECTION_TYPES.has(entry.sectionType)) {
        issues.push({
          path: `${base}.sectionType`,
          message: `sectionType must be one of: ${[...SECTION_TYPES].join(", ")}`,
        });
      }
      if (typeof entry.dataKey !== "string" || !entry.dataKey.trim()) {
        issues.push({ path: `${base}.dataKey`, message: "dataKey is required" });
      }
      if (entry.applicable !== true) {
        issues.push({
          path: `${base}.applicable`,
          message: "applicable must be true when a navigation entry is present (omit entry to hide section)",
        });
      }

      if (entry.sectionType === "cost-breakdown") hasCostSection = true;

      if (
        typeof entry.dataKey === "string" &&
        entry.applicable === true &&
        entry.key !== "related" &&
        entry.key !== "sources"
      ) {
        const data = obj[entry.dataKey];
        const stub = data && typeof data === "object" && data.flagStatus;
        if (!hasDataForKey(obj, entry.dataKey) && !stub) {
          issues.push({
            path: entry.dataKey,
            message: `navigation references dataKey "${entry.dataKey}" but no matching content found at top level`,
          });
        }
        if (stub && (typeof data.flagReason !== "string" || !data.flagReason.trim())) {
          issues.push({
            path: `${entry.dataKey}.flagReason`,
            message: "flagReason is required when flagStatus is set",
          });
        }
      }
    });

    if (hasCostSection && !obj.currencyConfig) {
      issues.push({
        path: "currencyConfig",
        message: "currencyConfig is required when a cost-breakdown section is present",
      });
    }
  }

  if (obj.currencyConfig != null) {
    const cc = obj.currencyConfig;
    if (typeof cc !== "object" || Array.isArray(cc)) {
      issues.push({ path: "currencyConfig", message: "currencyConfig must be an object" });
    } else {
      if (typeof cc.baseCurrency !== "string" || !cc.baseCurrency.trim()) {
        issues.push({ path: "currencyConfig.baseCurrency", message: "baseCurrency is required" });
      }
      if (typeof cc.displayCurrency !== "string" || !cc.displayCurrency.trim()) {
        issues.push({ path: "currencyConfig.displayCurrency", message: "displayCurrency is required" });
      }
    }
  }

  if (!Array.isArray(obj.changelog)) {
    issues.push({ path: "changelog", message: "changelog must be an array" });
  }

  if (!Array.isArray(obj.about) || obj.about.length === 0) {
    issues.push({ path: "about", message: "about must be a non-empty array" });
  }
}

function validateLegacyKc(obj, issues) {
  if (typeof obj.displayName !== "string" || !obj.displayName.trim()) {
    issues.push({ path: "displayName", message: "displayName is required (non-empty string)" });
  }

  const nav = obj.navigation;
  if (nav == null || typeof nav !== "object" || Array.isArray(nav)) {
    issues.push({ path: "navigation", message: "navigation object is required for legacy schemaVersion 1.0" });
  } else {
    const sections = nav.sections;
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
        const id = section.id;
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
        const label = section.label;
        if (label != null && typeof label !== "string") {
          issues.push({ path: `${base}.label`, message: "label must be a string when present" });
        }
        const sortOrder = section.sortOrder;
        if (sortOrder != null && typeof sortOrder !== "number") {
          issues.push({ path: `${base}.sortOrder`, message: "sortOrder must be a number when present" });
        }
      });
    }
  }
}

/**
 * @param {unknown} raw
 * @param {{ requireSchemaVersion?: boolean }} [opts]
 * @returns {{ ok: boolean, schemaVersion: string | null, schemaRef: string | null, issues: { path: string, message: string }[] }}
 */
export function validateKnowledgeCentreJsonCore(raw, opts = {}) {
  const issues = [];

  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ok: false,
      schemaVersion: null,
      schemaRef: null,
      issues: [{ path: "$", message: "Root must be a JSON object" }],
    };
  }

  /** @type {Record<string, unknown>} */
  const obj = raw;
  const schemaVersion =
    typeof obj.schemaVersion === "string" && obj.schemaVersion.trim()
      ? obj.schemaVersion.trim()
      : null;
  const schemaRef =
    typeof obj.schemaRef === "string" && obj.schemaRef.trim() ? obj.schemaRef.trim() : null;

  const isZip = isZipGuide(obj);
  const isLegacy = !isZip && schemaVersion === SCHEMA_VERSION && isLegacyKcNav(obj);

  if (opts.requireSchemaVersion) {
    if (schemaVersion !== SCHEMA_VERSION) {
      issues.push({
        path: "schemaVersion",
        message: `schemaVersion must be "${SCHEMA_VERSION}" for Knowledge Centre imports`,
      });
    }
    if (!isZip && !isLegacy) {
      issues.push({
        path: "schemaRef",
        message: `schemaRef must be "${SCHEMA_REF}" for new production imports (or use legacy navigation.sections for unmigrated services)`,
      });
    }
  }

  if (isZip) {
    if (schemaRef !== SCHEMA_REF) {
      issues.push({
        path: "schemaRef",
        message: `schemaRef must be "${SCHEMA_REF}" for ZIP bundle guides`,
      });
    }
    validateZipGuide(obj, issues, opts);
  } else if (schemaVersion === SCHEMA_VERSION) {
    validateLegacyKc(obj, issues);
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

  return { ok: issues.length === 0, schemaVersion, schemaRef, issues };
}
