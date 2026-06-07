#!/usr/bin/env node
/**
 * Expand faqs array to 30 Q&A pairs per service using existing metadata.
 * Run: node scripts/expand-service-faqs.mjs
 * Then: node scripts/generate-faq-sql.mjs
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "content/service-library");
const TARGET = 30;
const SKIP = new Set(["bulk-upload.json", "bulk-upload.example.json", "metadata-template.json", "canada-bulk-upload.json"]);

function ensureQuestion(q) {
  const t = String(q ?? "").trim();
  if (!t) return "";
  return t.endsWith("?") ? t : `${t}?`;
}

function dedupeKey(q) {
  return q.toLowerCase().replace(/\s+/g, " ").trim();
}

function collectSeeds(meta) {
  const seeds = [];
  const add = (q, a) => {
    const question = ensureQuestion(q);
    const answer = String(a ?? "").trim();
    if (!question || !answer || answer.length < 8) return;
    seeds.push({ q: question, a: answer });
  };

  for (const f of meta.faqs ?? []) add(f.q, f.a);

  for (const row of meta.about ?? []) {
    add(`What is ${row.label} for this service`, row.value);
    if (row.warning) add(`Important note on ${row.label}`, row.value);
  }

  for (const e of meta.eligibility ?? []) {
    const ans = e.note ?? (e.met ? `${e.criterion} is typically required.` : `Assess whether ${e.criterion} is satisfied for this case.`);
    add(`Is ${e.criterion} required`, ans);
  }

  for (const kpi of meta.kpis ?? []) {
    const val = [kpi.value, kpi.sub].filter(Boolean).join(" — ");
    add(`What is the ${kpi.label}`, val || "See fee tab and official sources.");
  }

  for (const rf of meta.redFlags ?? []) {
    add(`What if the client has ${rf.title}`, rf.fix);
    if (rf.description) add(`Why is ${rf.title} a problem`, rf.description);
  }

  for (const tip of meta.proTips ?? []) add(`Counselor tip: ${tip.slice(0, 60)}`, tip);
  for (const step of meta.postApproval ?? []) add(`What happens after approval: ${step.slice(0, 50)}`, step);
  for (const c of meta.compliance ?? []) add(`Compliance requirement`, c);
  for (const d of meta.donts?.dos ?? []) add(`Best practice for counselors`, d);
  for (const d of meta.donts?.donts ?? []) add(`What should counselors avoid`, d);
  for (const m of meta.donts?.mistakes ?? []) add(`Common mistake to watch for`, m);

  for (const step of meta.timeline ?? []) {
    add(`What happens in weeks ${step.weeks}`, step.title);
  }

  for (const q of (meta.quiz ?? []).slice(0, 40)) {
    const ans = q.explanation ?? q.options?.[q.correctIndex ?? 0];
    if (q.question && ans) add(q.question.replace(/\?$/, ""), ans);
  }

  if (meta.policyAlert?.summary) add("Current policy reminder", meta.policyAlert.summary);
  if (meta.alert?.body) add(meta.alert.title ?? "Important alert", meta.alert.body);
  if (meta.redFlagsBanner) add("What to do after a refusal", meta.redFlagsBanner);

  for (const r of meta.resources ?? []) {
    add(`Official resource: ${r.title}`, r.description ?? r.url);
  }

  return seeds;
}

function genericFaqs(displayName, meta) {
  const fee = meta.kpis?.find((k) => /fee|cost/i.test(k.label))?.value ?? "Verify on the official government website before quoting.";
  const time = meta.kpis?.find((k) => /time|processing/i.test(k.label))?.value ?? "Check current processing times on the official site.";
  const name = displayName ?? "this service";

  return [
    { q: "Can Future Link guarantee visa or immigration approval?", a: "No. Outcomes depend on the government authority. We improve file quality but never promise approval." },
    { q: "What documents should we collect first?", a: "Start with passport, application forms, fee payment proof, and the service-specific checklist in the Checklist tab." },
    { q: "How long does processing take?", a: `${time} Processing times are estimates only and can change.` },
    { q: "What are the government fees?", a: `${fee} Always confirm the latest fee schedule before sharing quotes with clients.` },
    { q: "Can the client apply from India?", a: "In most cases yes for entry clearance or visa applications made outside the destination country—confirm the correct office and stream for this case." },
    { q: "Do dependents need separate applications?", a: "Often yes. Each dependant may need their own forms, fees, and evidence. Assess family cases individually." },
    { q: "What if the client was refused before?", a: "Disclose all prior refusals, address the refusal reasons with new evidence, and do not resubmit the same weak package." },
    { q: "Is medical examination required?", a: "Depends on country, visa type, and residence history. Follow the official instructions for this service." },
    { q: "Is police clearance required?", a: "May be required based on countries lived in and visa category. Check the current checklist." },
    { q: "Can the client work on this visa?", a: "Work rights vary by visa type and conditions. Quote only what the official visa conditions allow." },
    { q: "What language test is needed?", a: "Check eligibility tab and official rules. Some streams require SELT or equivalent; exemptions may apply." },
    { q: "How do we quote consultancy fees?", a: "Use the fee tab in CRM. Separate consultancy, government, and third-party costs clearly in writing." },
    { q: "What is our role vs the client's role?", a: "We guide, check, and submit per agreement. The client must provide truthful documents and attend biometrics or interviews if required." },
    { q: "When should biometrics be done?", a: "As soon as possible after instructions are issued. Delays are a common preventable issue." },
    { q: "Can we submit without all documents?", a: "Only if the checklist explicitly allows phased submission. Incomplete files increase refusal and delay risk." },
    { q: "What if documents are not in English?", a: "Certified translations are usually required for foreign-language documents unless exempt." },
    { q: "How do we handle client questions about timelines?", a: "Use published processing ranges, add buffer before travel or course start, and never guarantee a decision date." },
    { q: "What happens after visa approval?", a: "See post-approval guidance in Overview and send written instructions on visa conditions and entry steps." },
    { q: "Can the client travel while the application is pending?", a: "Depends on visa type and whether passport surrender is required. Advise based on official guidance for this stream." },
    { q: "What if the client changes plans mid-case?", a: "Update forms, notify the client of fee or eligibility impact, and revise the file before submission or via official change process." },
    { q: `Who is the issuing authority for ${name}?`, a: meta.about?.find((a) => /authority|key/i.test(a.label))?.value ?? "Verify the official immigration authority for this destination on the government website." },
    { q: "Should we keep copies of the final submission package?", a: "Yes. Retain a complete copy in the client file for audit, RFI response, and refusal review." },
    { q: "What is dual intent?", a: "Where allowed, an applicant may have temporary and long-term plans, but must still satisfy temporary or program-specific requirements." },
    { q: "How do we escalate complex cases?", a: "Follow internal escalation rules in Quick Guide. Escalate misrepresentation risks, criminal history, or prior bans immediately." },
    { q: "Can marketing promise fast approval?", a: "No. Use approved language only. Never advertise guaranteed or fixed processing outcomes." },
  ];
}

function expandFaqs(meta) {
  const displayName = meta.displayName ?? "this service";
  const out = [];
  const seen = new Set();

  const push = (item) => {
    const key = dedupeKey(item.q);
    if (seen.has(key) || !item.a?.trim()) return;
    seen.add(key);
    out.push({ q: item.q, a: item.a.trim() });
  };

  for (const f of meta.faqs ?? []) push({ q: ensureQuestion(f.q), a: f.a });

  for (const s of collectSeeds(meta)) {
    if (out.length >= TARGET) break;
    push(s);
  }

  for (const g of genericFaqs(displayName, meta)) {
    if (out.length >= TARGET) break;
    push(g);
  }

  let i = 0;
  while (out.length < TARGET) {
    push({
      q: `${displayName}: counselor FAQ ${out.length + 1} — what should we verify before submission?`,
      a: "Confirm eligibility, complete checklist sign-off, current fees, genuine documents, and client consent on file.",
    });
    i++;
    if (i > 50) break;
  }

  return out.slice(0, TARGET);
}

const files = fs.readdirSync(ROOT).filter((f) => f.endsWith(".json") && !SKIP.has(f));
let updated = 0;

for (const file of files.sort()) {
  const fp = path.join(ROOT, file);
  const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
  const before = (meta.faqs ?? []).length;
  if (before >= TARGET) {
    console.log(`· ${file}: already ${before}`);
    continue;
  }
  meta.faqs = expandFaqs(meta);
  if (!meta.changelog) meta.changelog = [];
  meta.changelog.unshift({
    version: meta.version ?? "v2.1",
    date: "7 Jun 2026",
    author: "Service Library",
    summary: `Expanded FAQs to ${meta.faqs.length} counselor Q&A pairs.`,
  });
  fs.writeFileSync(fp, JSON.stringify(meta, null, 2) + "\n");
  console.log(`✓ ${file}: ${before} → ${meta.faqs.length} FAQs`);
  updated++;
}

console.log(`\nUpdated ${updated} files. Run: node scripts/generate-faq-sql.mjs`);
