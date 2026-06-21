/**
 * document_manifest[] — typed uploadable document definitions per service.
 */
import { assertValidMasterItemCode } from "./document-master-codes.mjs";

export const SUBMISSION_MILESTONE_ITEMS = [
  {
    item_key: "govt_fee_receipt",
    label: "Government visa fee paid; official receipt saved",
    notes: "Separate consultancy fee on invoice. Never commingle with government payment.",
    mandatory: true,
  },
  {
    item_key: "client_checklist_signed",
    label: "Client reviewed, signed, and dated this checklist",
    mandatory: true,
  },
  {
    item_key: "qa_signoff",
    label: "Quality review / QA sign-off — all documents cross-checked",
    notes: "Verify expiry dates, translations, and consistency across forms.",
    mandatory: true,
  },
  {
    item_key: "application_lodged",
    label: "Application lodged; confirmation / reference number saved on file",
    notes: "Screenshot portal confirmation and note tracking details for client.",
    mandatory: true,
  },
];

/** @param {string} text @param {number} [i] */
export function slugKey(text, i = 0) {
  return (
    String(text ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 48) || `item_${i}`
  );
}

/**
 * @param {unknown} manifest
 * @param {string} [serviceLabel]
 */
export function validateDocumentManifest(manifest, serviceLabel = "service") {
  if (!Array.isArray(manifest)) {
    throw new Error(`${serviceLabel}: document_manifest must be an array`);
  }
  if (manifest.length === 0) {
    throw new Error(`${serviceLabel}: document_manifest must not be empty when present`);
  }

  const keys = new Set();
  /** @type {import('./document-manifest.mjs').DocumentManifestItem[]} */
  const normalized = [];

  manifest.forEach((raw, index) => {
    const ctx = `${serviceLabel} document_manifest[${index}]`;
    if (!raw || typeof raw !== "object") {
      throw new Error(`${ctx}: must be an object`);
    }

    const item_key = String(raw.item_key ?? "").trim();
    const label = String(raw.label ?? "").trim();
    const master_item_code = assertValidMasterItemCode(raw.master_item_code, ctx);
    const section_key = String(raw.section_key ?? "identity").trim();
    const section_label = String(raw.section_label ?? "Identity & travel documents").trim();
    const party_scope = String(raw.party_scope ?? "applicant").trim();

    if (!item_key) throw new Error(`${ctx}: item_key is required`);
    if (!label) throw new Error(`${ctx}: label is required`);
    if (keys.has(item_key)) throw new Error(`${ctx}: duplicate item_key "${item_key}"`);
    keys.add(item_key);

    normalized.push({
      item_key,
      label,
      master_item_code,
      section_key,
      section_label,
      mandatory: raw.mandatory !== false,
      party_scope,
      notes: raw.notes ? String(raw.notes) : undefined,
      sort_order: Number.isFinite(raw.sort_order) ? raw.sort_order : (index + 1) * 10,
    });
  });

  normalized.sort((a, b) => a.sort_order - b.sort_order);
  return normalized;
}

/**
 * @param {import('./document-manifest.mjs').DocumentManifestItem[]} manifest
 */
export function manifestToChecklistSections(manifest) {
  /** @type {Map<string, { title: string, items: Array<{ title: string, note?: string, badge: string }> }>} */
  const bySection = new Map();

  for (const row of manifest) {
    const sectionTitle = row.section_label;
    if (!bySection.has(sectionTitle)) {
      bySection.set(sectionTitle, { title: sectionTitle, items: [] });
    }
    bySection.get(sectionTitle).items.push({
      title: row.label,
      note: row.notes,
      badge: row.mandatory ? "REQUIRED" : "IF APPLICABLE",
    });
  }

  return [...bySection.values()];
}

/**
 * @param {object} args
 * @param {string} args.slug
 * @param {string} args.displayName
 * @param {string} args.libraryId
 * @param {string} args.country
 * @param {import('./document-manifest.mjs').DocumentManifestItem[]} args.manifest
 */
export function buildWorkflowTemplateFromManifest({ slug, displayName, libraryId, country, manifest }) {
  const category = `${libraryId}::${country}`;
  const name = `${displayName} — Document binder`;

  /** @type {Array<object>} */
  const allItems = [];
  /** @type {Map<string, { id: string, section_key: string, label: string, sort_order: number, item_ids: string[] }>} */
  const groupMap = new Map();

  for (const row of manifest) {
    const id = row.item_key;
    allItems.push({
      id,
      name: row.label,
      mandatory: row.mandatory,
      notes: row.notes,
      master_item_code: row.master_item_code,
      party_scope: row.party_scope,
      requirement_kind: "document",
      section_key: row.section_key,
      section_label: row.section_label,
    });

    const groupId = slugKey(row.section_key, groupMap.size);
    if (!groupMap.has(row.section_key)) {
      groupMap.set(row.section_key, {
        id: groupId,
        section_key: row.section_key,
        label: row.section_label,
        sort_order: groupMap.size,
        item_ids: [],
      });
    }
    groupMap.get(row.section_key).item_ids.push(id);
  }

  const milestoneGroup = {
    id: "fees_submission",
    section_key: "fees_submission",
    label: "Fees & submission",
    sort_order: groupMap.size,
    item_ids: [],
  };

  for (const ms of SUBMISSION_MILESTONE_ITEMS) {
    allItems.push({
      id: ms.item_key,
      name: ms.label,
      mandatory: ms.mandatory,
      notes: ms.notes,
      requirement_kind: "milestone",
      section_key: "fees_submission",
      section_label: "Fees & submission",
    });
    milestoneGroup.item_ids.push(ms.item_key);
  }

  const groups = [...groupMap.values(), milestoneGroup];

  return {
    slug,
    name,
    country,
    category,
    version: 2,
    source: "document_manifest",
    items: allItems,
    groups,
  };
}

/** @param {unknown} value */
export function sqlJson(value) {
  return JSON.stringify(value).replace(/'/g, "''");
}
