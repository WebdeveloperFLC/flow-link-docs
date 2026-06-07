#!/usr/bin/env node
/**
 * Expand quiz arrays to 75 questions (25 per level) using service-library JSON metadata.
 * Run: node scripts/expand-service-quizzes.mjs
 * Then: node scripts/generate-visa-metadata-sql.mjs
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "content/service-library");
const TARGET_PER_LEVEL = 25;

const DISTRACTORS = {
  1: [
    "It is optional and officers rarely review it.",
    "It automatically guarantees approval once submitted.",
    "It applies only after permanent residence is granted.",
  ],
  2: [
    "Upload it only after the visa is already approved.",
    "Skip it if the client has paid consultancy fees.",
    "It can be replaced by a verbal promise to the embassy.",
  ],
  3: [
    "It is harmless because polite applicants are always approved.",
    "Fix it informally after refusal without updating the file.",
    "It matters only at the airport, not during document review.",
  ],
};

const QUESTION_FRAMES = {
  1: [
    (name, topic) => `For ${name}, which statement about ${topic} is correct?`,
    (name, topic) => `${name}: what is true regarding ${topic}?`,
    (name, topic) => `A counselor explaining ${name} should state correctly about ${topic}:`,
  ],
  2: [
    (name, topic) => `In the ${name} process, what is the correct approach to ${topic}?`,
    (name, topic) => `For ${name}, what should happen during ${topic}?`,
    (name, topic) => `${name} workflow — best practice for ${topic}:`,
  ],
  3: [
    (name, topic) => `${name}: what is the compliance risk with ${topic}?`,
    (name, topic) => `Officer or QA perspective on ${name} — key issue with ${topic}:`,
    (name, topic) => `For ${name}, counselors must avoid this mistake related to ${topic}:`,
  ],
};

function truncate(s, n = 140) {
  const t = String(s ?? "").trim();
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}

function pickDistractors(level, pool, correct) {
  const base = DISTRACTORS[level];
  const fromPool = pool.filter((x) => x && x !== correct).slice(0, 6);
  const merged = [...new Set([...fromPool, ...base])].filter((x) => x !== correct);
  while (merged.length < 3) merged.push(`${base[merged.length % base.length]} (${level})`);
  return merged.slice(0, 3);
}

function makeQuestion(displayName, level, topic, correct, explanation, distractorPool, frameIndex) {
  const frames = QUESTION_FRAMES[level];
  const question = frames[frameIndex % frames.length](displayName, topic);
  const options = [truncate(correct, 160), ...pickDistractors(level, distractorPool, correct).map((d) => truncate(d, 160))];
  return {
    level,
    question,
    options,
    correctIndex: 0,
    explanation: truncate(explanation || correct, 220),
  };
}

function collectSeeds(meta) {
  const seeds = { 1: [], 2: [], 3: [] };
  const push = (level, topic, correct, explanation) => {
    if (!topic || !correct) return;
    seeds[level].push({ topic: truncate(topic, 80), correct: truncate(correct, 160), explanation: truncate(explanation || correct, 220) });
  };

  for (const row of meta.about ?? []) {
    push(1, row.label, row.value, row.warning ? `${row.value} — verify current rules.` : row.value);
  }
  for (const row of meta.eligibility ?? []) {
    const note = row.note ? ` Note: ${row.note}` : "";
    push(1, row.criterion, `${row.criterion} is ${row.met ? "a core requirement" : "often required or assessed"} for this service.${note}`, row.note ?? row.criterion);
  }
  for (const kpi of meta.kpis ?? []) {
    const val = [kpi.value, kpi.sub].filter(Boolean).join(" — ");
    push(1, kpi.label, `${kpi.label}: ${val}`, kpi.sub ?? kpi.label);
  }
  if (meta.shortDescription) push(1, "service summary", meta.shortDescription, meta.shortDescription);
  if (meta.alert?.body) push(1, meta.alert.title ?? "important alert", meta.alert.body, meta.alert.body);
  if (meta.policyAlert?.summary) push(1, "policy update", meta.policyAlert.summary, meta.policyAlert.summary);

  for (const faq of meta.faqs ?? []) {
    push(1, faq.q.replace(/\?$/, ""), faq.a, faq.a);
    push(2, `client question: ${faq.q.replace(/\?$/, "")}`, faq.a, faq.a);
  }

  for (const q of meta.quiz ?? []) {
    const level = q.level ?? 1;
    if (q.question && q.options?.[q.correctIndex ?? 0]) {
      push(level, q.question.replace(/\?$/, ""), q.options[q.correctIndex ?? 0], q.explanation ?? q.options[q.correctIndex ?? 0]);
    }
  }

  for (const step of meta.timeline ?? []) {
    push(2, `timeline (${step.weeks})`, step.title, `${step.weeks}: ${step.title}`);
  }
  for (const tip of meta.proTips ?? []) push(2, "counselor tip", tip, tip);
  for (const step of meta.postApproval ?? []) push(2, "post-approval step", step, step);
  for (const doc of meta.sampleDocs ?? []) {
    push(2, doc.title, doc.description ?? `Prepare ${doc.title} per checklist.`, doc.description ?? doc.title);
  }
  for (const d of meta.donts?.dos ?? []) push(2, "recommended practice", d, d);
  for (const r of meta.resources ?? []) push(2, r.title, r.description ?? r.url, r.description ?? r.url);

  for (const rf of meta.redFlags ?? []) {
    push(3, rf.title, rf.fix, rf.description ?? rf.fix);
    if (rf.description) push(3, `${rf.title} (detail)`, rf.description, rf.fix);
  }
  for (const d of meta.donts?.donts ?? []) push(3, "counselor don't", d, d);
  for (const m of meta.donts?.mistakes ?? []) push(3, "common mistake", m, `Avoid: ${m}`);
  for (const c of meta.compliance ?? []) push(3, "compliance rule", c, c);
  if (meta.redFlagsBanner) push(3, "refusal handling", meta.redFlagsBanner, meta.redFlagsBanner);

  for (const f of meta.approvalFactors ?? []) {
    push(3, f.label, `Our target: ${f.ours}% vs benchmark ${f.benchmark}%`, f.label);
  }

  return seeds;
}

function expandLevel(displayName, level, seeds, existingForLevel) {
  const questions = [];
  const seen = new Set();

  const add = (q) => {
    const key = q.question.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    questions.push(q);
    return true;
  };

  for (const q of existingForLevel) {
    add({ ...q, level: q.level ?? level });
  }

  const pool = [
    ...(seeds[1] ?? []).map((s) => s.correct),
    ...(seeds[2] ?? []).map((s) => s.correct),
    ...(seeds[3] ?? []).map((s) => s.correct),
  ];

  let frame = 0;
  const levelSeeds = seeds[level] ?? [];
  let idx = 0;
  while (questions.length < TARGET_PER_LEVEL && levelSeeds.length > 0) {
    const s = levelSeeds[idx % levelSeeds.length];
    add(makeQuestion(displayName, level, s.topic, s.correct, s.explanation, pool, frame));
    frame++;
    idx++;
    if (idx > levelSeeds.length * 12) break;
  }

  // Borrow from adjacent levels with reframed topics
  const borrow = level === 1 ? seeds[2] : level === 3 ? seeds[2] : seeds[1];
  idx = 0;
  while (questions.length < TARGET_PER_LEVEL && (borrow?.length ?? 0) > 0) {
    const s = borrow[idx % borrow.length];
    add(makeQuestion(displayName, level, `${s.topic} (review)`, s.correct, s.explanation, pool, frame));
    frame++;
    idx++;
    if (idx > borrow.length * 8) break;
  }

  // Generic service-level padding
  const generic = {
    1: [
      ["service purpose", `${displayName} requires counselors to verify eligibility against current official rules before quoting fees.`, "Always confirm official requirements before client commitment."],
      ["fee quotes", "Government and third-party fees must be verified on official websites before sharing with clients.", "Fees change — never rely on outdated handouts."],
      ["client consent", "Signed service agreement and informed consent should be on file before submission.", "Documentation protects both client and agency."],
    ],
    2: [
      ["document QA", "Run a checklist sign-off before embassy or online submission.", "Incomplete files cause delays and refusals."],
      ["submission timing", "Apply with enough processing buffer before travel or program start dates.", "Late applications increase refusal and deferral risk."],
      ["client briefing", "Brief the client on biometrics, interviews, and document originals if required.", "Surprises at the visa centre damage trust."],
    ],
    3: [
      ["approval guarantees", "Counselors must never guarantee visa or immigration approval.", "Misleading guarantees are a compliance violation."],
      ["misrepresentation", "False documents or hidden refusals can cause refusal and long-term bans.", "Accuracy is the applicant's responsibility."],
      ["weak resubmission", "Reapplying without addressing prior refusal reasons usually fails again.", "Fix the stated refusal grounds first."],
    ],
  };

  idx = 0;
  while (questions.length < TARGET_PER_LEVEL) {
    const g = generic[level][idx % generic[level].length];
    add(makeQuestion(displayName, level, g[0], g[1], g[2], pool, frame));
    frame++;
    idx++;
    if (idx > 40) break;
  }

  return questions.slice(0, TARGET_PER_LEVEL);
}

function expandQuiz(meta) {
  const displayName = meta.displayName ?? "this service";
  const seeds = collectSeeds(meta);
  const existing = meta.quiz ?? [];

  const byLevel = { 1: [], 2: [], 3: [] };
  for (const q of existing) {
    const lv = q.level ?? 1;
    if (lv >= 1 && lv <= 3) byLevel[lv].push(q);
  }

  const quiz = [1, 2, 3].flatMap((level) => expandLevel(displayName, level, seeds, byLevel[level]));
  return quiz;
}

const SKIP = new Set(["bulk-upload.json", "bulk-upload.example.json", "metadata-template.json", "canada-bulk-upload.json"]);

const files = fs.readdirSync(ROOT).filter((f) => f.endsWith(".json") && !SKIP.has(f));

let updated = 0;
for (const file of files.sort()) {
  const fp = path.join(ROOT, file);
  const meta = JSON.parse(fs.readFileSync(fp, "utf8"));
  const before = (meta.quiz ?? []).length;
  if (before >= 75) {
    console.log(`· ${file}: already ${before} — skip`);
    continue;
  }
  meta.quiz = expandQuiz(meta);
  if (!meta.changelog) meta.changelog = [];
  meta.changelog.unshift({
    version: meta.version?.startsWith("v2") ? meta.version : "v2.0",
    date: "7 Jun 2026",
    author: "Service Library",
    summary: `Expanded quiz to ${meta.quiz.length} levelled questions (25 per level).`,
  });
  if (!meta.version?.startsWith("v2")) meta.version = "v2.0";
  fs.writeFileSync(fp, JSON.stringify(meta, null, 2) + "\n");
  const counts = { 1: 0, 2: 0, 3: 0 };
  for (const q of meta.quiz) counts[q.level ?? 1]++;
  console.log(`✓ ${file}: ${before} → ${meta.quiz.length} (L1=${counts[1]} L2=${counts[2]} L3=${counts[3]})`);
  updated++;
}

console.log(`\nUpdated ${updated} files.`);
