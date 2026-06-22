import type { DocumentManifestItem, ServiceAcademyMetadata } from "./academyTypes";

export type DocumentStructureDocument = {
  item_key: string;
  master_item_code: string;
  label?: string;
  mandatory: boolean;
  is_active: boolean;
  sort_order: number;
  notes?: string;
};

export type DocumentStructureSection = {
  section_key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  documents: DocumentStructureDocument[];
};

export type ServiceDocumentStructure = {
  sections: DocumentStructureSection[];
  updated_at?: string;
};

/** ADR notes value when seeded from Service Library document_structure. */
export const SERVICE_LIBRARY_STRUCTURE_NOTE = "service_library_structure";

/** Default section templates — admins may add custom sections. */
export const DEFAULT_DOCUMENT_SECTION_TEMPLATES: { section_key: string; label: string }[] = [
  { section_key: "personal_documents", label: "Personal Documents" },
  { section_key: "academic_documents", label: "Academic Documents" },
  { section_key: "financial_documents", label: "Financial Documents" },
  { section_key: "employment_documents", label: "Employment Documents" },
  { section_key: "relationship_documents", label: "Relationship Documents" },
  { section_key: "sponsor_documents", label: "Sponsor Documents" },
  { section_key: "travel_documents", label: "Travel Documents" },
  { section_key: "application_forms", label: "Application Forms" },
  { section_key: "other_documents", label: "Other Documents" },
];

const LEGACY_SECTION_KEY_MAP: Record<string, string> = {
  identity: "personal_documents",
  personal: "personal_documents",
  education: "academic_documents",
  academic: "academic_documents",
  financial: "financial_documents",
  employment: "employment_documents",
  relationship: "relationship_documents",
  sponsor: "sponsor_documents",
  travel: "travel_documents",
  forms: "application_forms",
  application: "application_forms",
  other: "other_documents",
};

export function slugKey(text: string, index = 0): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48) || `item_${index}`
  );
}

function normalizeSectionKey(key: string): string {
  const k = key.trim().toLowerCase();
  return LEGACY_SECTION_KEY_MAP[k] ?? k;
}

export function createDefaultDocumentStructure(): ServiceDocumentStructure {
  return {
    sections: DEFAULT_DOCUMENT_SECTION_TEMPLATES.map((t, i) => ({
      section_key: t.section_key,
      label: t.label,
      sort_order: (i + 1) * 10,
      is_active: true,
      documents: [],
    })),
    updated_at: new Date().toISOString(),
  };
}

/** Flat manifest → hierarchical document_structure. */
export function documentManifestToStructure(
  manifest: DocumentManifestItem[],
): ServiceDocumentStructure {
  const sectionMap = new Map<string, DocumentStructureSection>();

  for (const row of manifest) {
    const sectionKey = normalizeSectionKey(row.section_key ?? "other_documents");
    const sectionLabel =
      row.section_label?.trim() ||
      DEFAULT_DOCUMENT_SECTION_TEMPLATES.find((t) => t.section_key === sectionKey)?.label ||
      sectionKey;

    if (!sectionMap.has(sectionKey)) {
      sectionMap.set(sectionKey, {
        section_key: sectionKey,
        label: sectionLabel,
        sort_order: sectionMap.size * 10 + 10,
        is_active: true,
        documents: [],
      });
    }

    const section = sectionMap.get(sectionKey)!;
    section.documents.push({
      item_key: row.item_key,
      master_item_code: row.master_item_code,
      label: row.label,
      mandatory: row.mandatory !== false,
      is_active: true,
      sort_order: row.sort_order ?? (section.documents.length + 1) * 10,
      notes: row.notes,
    });
  }

  const sections = [...sectionMap.values()]
    .map((s) => ({
      ...s,
      documents: [...s.documents].sort((a, b) => a.sort_order - b.sort_order),
    }))
    .sort((a, b) => a.sort_order - b.sort_order);

  return { sections, updated_at: new Date().toISOString() };
}

export function normalizeDocumentStructure(raw: unknown): ServiceDocumentStructure | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as { sections?: unknown };
  if (!Array.isArray(obj.sections)) return null;

  const sections: DocumentStructureSection[] = [];
  for (const sec of obj.sections) {
    if (!sec || typeof sec !== "object") continue;
    const s = sec as Record<string, unknown>;
    const section_key = String(s.section_key ?? "").trim();
    const label = String(s.label ?? "").trim();
    if (!section_key || !label) continue;

    const documents: DocumentStructureDocument[] = [];
    if (Array.isArray(s.documents)) {
      for (const doc of s.documents) {
        if (!doc || typeof doc !== "object") continue;
        const d = doc as Record<string, unknown>;
        const master_item_code = String(d.master_item_code ?? "").trim();
        const item_key = String(d.item_key ?? master_item_code).trim();
        if (!master_item_code || !item_key) continue;
        documents.push({
          item_key,
          master_item_code,
          label: d.label ? String(d.label) : undefined,
          mandatory: d.mandatory !== false,
          is_active: d.is_active !== false,
          sort_order: Number.isFinite(d.sort_order) ? Number(d.sort_order) : documents.length * 10 + 10,
          notes: d.notes ? String(d.notes) : undefined,
        });
      }
    }

    sections.push({
      section_key: normalizeSectionKey(section_key),
      label,
      sort_order: Number.isFinite(s.sort_order) ? Number(s.sort_order) : sections.length * 10 + 10,
      is_active: s.is_active !== false,
      documents: documents.sort((a, b) => a.sort_order - b.sort_order),
    });
  }

  if (sections.length === 0) return null;
  sections.sort((a, b) => a.sort_order - b.sort_order);
  return {
    sections,
    updated_at: (raw as { updated_at?: string }).updated_at,
  };
}

/** Resolve document_structure from metadata; converts legacy manifest when needed. */
export function resolveDocumentStructure(
  meta: Pick<ServiceAcademyMetadata, "document_structure" | "document_manifest">,
): ServiceDocumentStructure | null {
  const direct = normalizeDocumentStructure(meta.document_structure);
  if (direct) return direct;
  if (Array.isArray(meta.document_manifest) && meta.document_manifest.length > 0) {
    return documentManifestToStructure(meta.document_manifest);
  }
  return null;
}

export type DocumentStructureSeedItem = {
  code: string;
  mandatory: boolean;
  sectionKey: string;
  sectionLabel: string;
  label?: string;
  notes?: string;
};

/** Active sections + documents flattened for client ADR seeding. */
export function flattenDocumentStructureForSeeding(
  structure: ServiceDocumentStructure,
  catalogueCodes: ReadonlySet<string>,
): DocumentStructureSeedItem[] {
  const out: DocumentStructureSeedItem[] = [];
  const seen = new Set<string>();

  for (const section of [...structure.sections].sort((a, b) => a.sort_order - b.sort_order)) {
    if (!section.is_active) continue;
    for (const doc of [...section.documents].sort((a, b) => a.sort_order - b.sort_order)) {
      if (!doc.is_active) continue;
      if (!catalogueCodes.has(doc.master_item_code)) continue;
      if (seen.has(doc.master_item_code)) continue;
      seen.add(doc.master_item_code);
      out.push({
        code: doc.master_item_code,
        mandatory: doc.mandatory,
        sectionKey: section.section_key,
        sectionLabel: section.label,
        label: doc.label,
        notes: doc.notes,
      });
    }
  }
  return out;
}

export function reorderSections(
  structure: ServiceDocumentStructure,
  activeId: string,
  overId: string,
): ServiceDocumentStructure {
  const ids = structure.sections.map((s) => s.section_key);
  const oldIndex = ids.indexOf(activeId);
  const newIndex = ids.indexOf(overId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return structure;
  const moved = arrayMove(structure.sections, oldIndex, newIndex).map((s, i) => ({
    ...s,
    sort_order: (i + 1) * 10,
  }));
  return { ...structure, sections: moved, updated_at: new Date().toISOString() };
}

export function reorderDocumentsInSection(
  structure: ServiceDocumentStructure,
  sectionKey: string,
  activeItemKey: string,
  overItemKey: string,
): ServiceDocumentStructure {
  return {
    ...structure,
    sections: structure.sections.map((section) => {
      if (section.section_key !== sectionKey) return section;
      const ids = section.documents.map((d) => d.item_key);
      const oldIndex = ids.indexOf(activeItemKey);
      const newIndex = ids.indexOf(overItemKey);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return section;
      const moved = arrayMove(section.documents, oldIndex, newIndex).map((d, i) => ({
        ...d,
        sort_order: (i + 1) * 10,
      }));
      return { ...section, documents: moved };
    }),
    updated_at: new Date().toISOString(),
  };
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}
