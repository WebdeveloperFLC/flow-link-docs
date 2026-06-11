import type { AcademyViewModel } from "./buildAcademyViewModel";
import type { AcademyTabId } from "./academyTabs";
import { resolveAcademyTabs, tabLabel } from "./academyTabs";

export type PageSearchEntry = {
  tabId: AcademyTabId;
  label: string;
  hint?: string;
};

function push(
  out: PageSearchEntry[],
  seen: Set<string>,
  tabId: AcademyTabId,
  label: string,
  hint?: string,
) {
  const key = `${tabId}::${label.toLowerCase()}`;
  if (!label.trim() || seen.has(key)) return;
  seen.add(key);
  out.push({ tabId, label: label.trim(), hint });
}

/** Searchable snippets for the currently open service page (not other services). */
export function buildPageSearchIndex(view: AcademyViewModel): PageSearchEntry[] {
  const out: PageSearchEntry[] = [];
  const seen = new Set<string>();
  const allowed = new Set(resolveAcademyTabs(view));

  for (const tabId of allowed) {
    push(out, seen, tabId, tabLabel(tabId, view));
  }

  if (allowed.has("overview")) {
    for (const row of view.about) push(out, seen, "overview", row.label, row.value);
    for (const tip of view.proTips) push(out, seen, "overview", tip);
    if (view.alert?.title) push(out, seen, "overview", view.alert.title, view.alert.body);
  }

  if (allowed.has("redflags")) {
    for (const rf of view.redFlags) {
      push(out, seen, "redflags", rf.title, rf.description);
      push(out, seen, "redflags", rf.fix, "Fix");
    }
  }

  if (allowed.has("faqs")) {
    for (const faq of view.faqs) push(out, seen, "faqs", faq.q, faq.a);
  }

  if (allowed.has("checklist")) {
    for (const item of view.checklist.submission) {
      push(out, seen, "checklist", item.label, item.mandatory ? "Required" : "Optional");
    }
    if (view.checklist.documentNotes) {
      push(out, seen, "checklist", "Document notes", view.checklist.documentNotes);
    }
  }

  if (allowed.has("process")) {
    for (const step of view.process) {
      push(out, seen, "process", step.title, step.duration ? `Step ${step.step}` : undefined);
    }
  }

  if (allowed.has("dos")) {
    for (const d of view.dosDonts.dos) push(out, seen, "dos", d, "Do");
    for (const d of view.dosDonts.donts) push(out, seen, "dos", d, "Don't");
    for (const m of view.dosDonts.mistakes) push(out, seen, "dos", m, "Common mistake");
  }

  if (allowed.has("compliance")) {
    for (const c of view.compliance) push(out, seen, "compliance", c);
  }

  if (allowed.has("downloads")) {
    for (const d of view.downloads) push(out, seen, "downloads", d.name, "Download");
    for (const r of view.resources) push(out, seen, "downloads", r.title, r.description);
  }

  if (allowed.has("sampledocs")) {
    for (const d of view.sampleDocs) push(out, seen, "sampledocs", d.title, d.description);
  }

  if (allowed.has("quiz")) {
    for (const q of view.quiz) push(out, seen, "quiz", q.question);
  }

  if (allowed.has("notes")) {
    for (const n of view.internalNotes) push(out, seen, "notes", n.text, `${n.author} · ${n.date}`);
  }

  if (allowed.has("changelog")) {
    for (const c of view.changelog) push(out, seen, "changelog", c.summary, `${c.version} · ${c.date}`);
    if (view.policyAlert?.summary) {
      push(out, seen, "changelog", "Policy update", view.policyAlert.summary);
    }
  }

  if (allowed.has("visaforms")) {
    for (const f of view.visaForms) push(out, seen, "visaforms", f.title, f.code || undefined);
  }

  if (allowed.has("eligibility")) {
    for (const e of view.eligibility) push(out, seen, "eligibility", e.criterion, e.note);
  }

  if (allowed.has("fees") && view.feeBreakdown) {
    const fb = view.feeBreakdown;
    for (const pkg of fb.consultancy?.packages ?? []) {
      push(out, seen, "fees", pkg.label, `₹${pkg.amountInr.toLocaleString("en-IN")}`);
    }
    for (const item of fb.govt?.items ?? []) {
      if (item.applicable) push(out, seen, "fees", item.label, item.notes);
    }
  }

  if (allowed.has("testday") && view.testDayGuide) {
    for (const d of view.testDayGuide.dos) push(out, seen, "testday", d, "Test day — do");
    for (const d of view.testDayGuide.donts) push(out, seen, "testday", d, "Test day — don't");
    for (const c of view.testDayGuide.checklist) push(out, seen, "testday", c, "Test day checklist");
  }

  return out;
}
