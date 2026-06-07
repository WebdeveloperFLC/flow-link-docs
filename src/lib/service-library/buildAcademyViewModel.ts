import {
  type Master,
  type Override,
  type FeeItem,
  type SubmissionItem,
  type ChecklistFile,
  type Attachment,
  type SopTask,
  resolveForCountry,
  htmlToPlain,
} from "@/lib/serviceLibrary";
import {
  mergeAcademyMetadata,
  normalizeAcademyMetadata,
  type ServiceAcademyMetadata,
  type AcademyKpiTone,
  type AcademyTagVariant,
} from "./academyTypes";

export type AcademyViewModel = {
  masterId: string;
  country: string | null;
  categoryLabel: string;
  breadcrumbTitle: string;
  title: string;
  subtitle: string;
  version: string;
  versionStatus: string;
  updatedLabel: string;
  tags: { label: string; variant: AcademyTagVariant }[];
  chips: { label: string; variant: AcademyTagVariant }[];
  policyAlert: { date: string; summary: string } | null;
  alert: { title: string; body: string } | null;
  kpis: { label: string; value: string; sub?: string; tone: AcademyKpiTone }[];
  about: { label: string; value: string; link?: string; warning?: boolean }[];
  eligibility: { criterion: string; met: boolean; note?: string }[];
  redFlagsBanner: string;
  redFlags: { num: number; title: string; description: string; fix: string; severity: string }[];
  faqs: { q: string; a: string }[];
  compliance: string[];
  proTips: string[];
  postApproval: string[];
  compare: { columns: string[]; rows: { label: string; values: string[] }[] } | null;
  performance: {
    ourRate: number;
    industryRate: number;
    stats: { label: string; value: string }[];
  };
  approvalFactors: { label: string; ours: number; benchmark: number }[];
  timeline: { weeks: string; title: string }[];
  fees: { consultancy: string; govt: string; thirdParty: string };
  checklist: {
    completed: number;
    total: number;
    submission: { id: string; label: string; mandatory: boolean; done: boolean }[];
    documentNotes: string;
  };
  process: { step: number; title: string; duration: string; owner: string; notes?: string }[];
  dosDonts: { dos: string[]; donts: string[]; mistakes: string[] };
  resources: { title: string; url: string; description?: string }[];
  downloads: { name: string; size: string; fileId: string }[];
  sampleDocs: {
    title: string;
    description?: string;
    filePath?: string;
    url?: string;
    mimeType?: string;
    docKind?: string;
    isImage: boolean;
  }[];
  quiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
    level?: 1 | 2 | 3;
  }[];
  internalNotes: { author: string; date: string; text: string }[];
  changelog: { version: string; date: string; author: string; summary: string }[];
  relatedServices: { id: string; label: string }[];
  sopHtml: string | null;
  shareLink: string;
  needsReview: boolean;
  learningMinutes: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  visa_immigration: "Visa & Immigration",
  coaching_services: "Education Services",
  allied_services: "Education Services",
  travel_financial: "Financial",
};

function parseProcessFlow(raw: unknown): { title: string; duration?: string; owner?: string; notes?: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    if (typeof item === "string") {
      return { title: item, duration: "", owner: "Counselor" };
    }
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      return {
        title: String(o.title ?? o.step ?? `Step ${i + 1}`),
        duration: o.duration ? String(o.duration) : o.weeks ? String(o.weeks) : "",
        owner: o.owner ? String(o.owner) : "Counselor",
        notes: o.notes ? String(o.notes) : undefined,
      };
    }
    return { title: `Step ${i + 1}`, duration: "", owner: "" };
  });
}

function splitLines(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n|•/)
    .map((s) => s.replace(/^[\s\-*]+/, "").trim())
    .filter(Boolean);
}

function formatFee(items: FeeItem[], labelMatch: RegExp): string {
  const row = items.find((f) => labelMatch.test(f.fee_label));
  if (!row?.amount) return "—";
  const cur = row.currency ? `${row.currency} ` : "";
  return `${cur}${row.amount}`.trim();
}

export function buildAcademyViewModel(args: {
  master: Master & { academy_metadata?: unknown };
  override?: (Override & { academy_metadata?: unknown }) | null;
  country: string | null;
  countries: string[];
  feeItems: FeeItem[];
  submissionItems: SubmissionItem[];
  checklistFiles: ChecklistFile[];
  attachments?: Attachment[];
  sopTasks: SopTask[];
  submissionCompletedIds: Set<string>;
  relatedMasters?: { id: string; label: string }[];
}): AcademyViewModel {
  const { master, override, country, countries } = args;
  const baseMeta = normalizeAcademyMetadata(master.academy_metadata);
  const patchMeta = normalizeAcademyMetadata(override?.academy_metadata);
  const meta = mergeAcademyMetadata(baseMeta, patchMeta);
  const resolved = resolveForCountry(master, override ?? null);

  const displayCountry = country ?? countries[0] ?? null;
  const countryFlag = displayCountry ? "" : "";
  const defaultTitle = displayCountry
    ? `${displayCountry} – ${master.sub_service}`
    : `${master.service} · ${master.sub_service}`;

  const dosFromGuide = splitLines(resolved.quick_guide_what_to_do);
  const mistakesFromGuide = splitLines(resolved.quick_guide_common_mistakes);
  const dontsFromGuide = [
    ...splitLines(resolved.quick_guide_escalation_rules),
    ...splitLines(resolved.quick_guide_important_reminders),
  ];

  const processSteps = parseProcessFlow(resolved.process_flow);
  const feesScoped = args.feeItems;

  const submission = args.submissionItems.map((item) => ({
    id: item.id,
    label: item.item_label,
    mandatory: item.is_mandatory,
    done: args.submissionCompletedIds.has(item.id),
  }));
  const completed = submission.filter((s) => s.done).length;
  const total = submission.length || meta.kpis?.find((k) => k.label.toLowerCase().includes("doc"))?.value ? 14 : 0;

  const consultancy = formatFee(feesScoped, /consult|service|our/i) !== "—"
    ? formatFee(feesScoped, /consult|service|our/i)
    : meta.kpis?.find((k) => k.label.toLowerCase().includes("consult"))?.value ?? "—";

  const govt = formatFee(feesScoped, /govt|government|ircc/i) !== "—"
    ? formatFee(feesScoped, /govt|government|ircc/i)
    : "See fee items";

  const redFlags = (meta.redFlags ?? []).map((r, i) => ({
    num: i + 1,
    title: r.title,
    description: r.description ?? "",
    fix: r.fix,
    severity: r.severity ?? "Common",
  }));

  const policy =
    meta.policyAlert?.active !== false && meta.policyAlert?.summary
      ? { date: meta.policyAlert.date ?? "", summary: meta.policyAlert.summary }
      : null;

  return {
    masterId: master.id,
    country: displayCountry,
    categoryLabel: CATEGORY_LABELS[master.service_category] ?? master.service_category,
    breadcrumbTitle: meta.displayName?.split("–")[0]?.trim() ?? defaultTitle.split("–")[0]?.trim() ?? master.sub_service,
    title: meta.displayName ?? defaultTitle,
    subtitle: meta.shortDescription ?? `${master.service}`,
    version: meta.version ?? "v1.0",
    versionStatus: meta.versionStatus ?? (master.is_active ? "Live" : "Draft"),
    updatedLabel: meta.updatedLabel ?? "",
    tags:
      meta.tags ??
      (master.is_active
        ? [{ label: "Active service", variant: "success" as const }]
        : [{ label: "Inactive", variant: "neutral" as const }]),
    chips: meta.chips ?? [],
    policyAlert: policy,
    alert: meta.alert?.title ? { title: meta.alert.title, body: meta.alert.body ?? "" } : null,
    kpis:
      meta.kpis ??
      [
        { label: "Required docs", value: String(submission.length || "—"), sub: "From checklist", tone: "violet" },
      ],
    about:
      meta.about ??
      (resolved.checklist_text
        ? [{ label: "Document notes", value: htmlToPlain(resolved.checklist_text) }]
        : [{ label: "Description", value: "Add content in Service Library Admin → Service content." }]),
    eligibility: (meta.eligibility ?? []).map((e) => ({
      criterion: e.criterion,
      met: !!e.met,
      note: e.note,
    })),
    redFlagsBanner:
      meta.redFlagsBanner ??
      "Review refusal patterns before reapplying.",
    redFlags,
    faqs: meta.faqs ?? [],
    compliance: meta.compliance ?? [],
    proTips: meta.proTips ?? [],
    postApproval: meta.postApproval ?? [],
    compare: meta.compare ?? null,
    performance: {
      ourRate: meta.performance?.ourRate ?? 0,
      industryRate: meta.performance?.industryRate ?? 0,
      stats: meta.performance?.stats ?? [],
    },
    approvalFactors: meta.approvalFactors ?? [],
    timeline: meta.timeline ?? [],
    fees: {
      consultancy,
      govt,
      thirdParty: "Varies",
    },
    checklist: {
      completed,
      total: submission.length || total,
      submission,
      documentNotes: htmlToPlain(resolved.checklist_text) || "—",
    },
    process: processSteps.map((s, i) => ({
      step: i + 1,
      title: s.title,
      duration: s.duration ?? "",
      owner: s.owner ?? "Counselor",
      notes: s.notes,
    })),
    dosDonts: {
      dos: meta.donts?.dos?.length ? meta.donts.dos : dosFromGuide,
      donts: meta.donts?.donts?.length ? meta.donts.donts : dontsFromGuide,
      mistakes: meta.donts?.mistakes?.length ? meta.donts.mistakes : mistakesFromGuide,
    },
    resources: meta.resources ?? [],
    downloads: args.checklistFiles
      .filter((f) => f.is_current)
      .map((f) => ({
        name: f.file_name,
        size: f.size_bytes ? `${Math.round(f.size_bytes / 1024)} KB` : "—",
        fileId: f.id,
      })),
    sampleDocs: [
      ...(meta.sampleDocs ?? []).map((d) => ({
        title: d.title,
        description: d.description,
        filePath: d.filePath,
        url: d.url,
        mimeType: d.mimeType,
        docKind: d.docKind,
        isImage: !!d.mimeType?.startsWith("image/"),
      })),
      ...(args.attachments ?? [])
        .filter((a) => /sample|mock|example/i.test(a.label ?? a.file_name))
        .map((a) => ({
          title: a.label ?? a.file_name,
          description: "Uploaded sample document",
          filePath: a.file_path,
          mimeType: a.mime_type ?? undefined,
          isImage: !!a.mime_type?.startsWith("image/"),
        })),
    ],
    quiz: meta.quiz ?? [],
    internalNotes: (meta.staffNotes ?? []).map((n) => ({
      author: n.author,
      date: n.date,
      text: n.text,
    })),
    changelog: meta.changelog ?? [],
    relatedServices: args.relatedMasters ?? (meta.relatedServices ?? []).map((r) => ({
      id: r.libraryId ?? "",
      label: r.label,
    })),
    sopHtml: resolved.internal_sop_html,
    shareLink: (() => {
      const url = new URL(
        typeof window !== "undefined" ? window.location.origin : "https://app",
      );
      url.pathname = "/service-library";
      url.searchParams.set("id", master.id);
      if (displayCountry) url.searchParams.set("country", displayCountry);
      return url.toString();
    })(),
    needsReview: meta.reviewStatus === "needs_review",
    learningMinutes: meta.learningMinutes ?? 0,
  };
}
