#!/usr/bin/env node
/**
 * Bootstrap Poland, Hungary, Latvia, Singapore + Finland family visa JSON.
 * Run: node scripts/bootstrap-cee-singapore-visa.mjs
 * Then: node scripts/expand-service-quizzes.mjs --only=poland,hungary,latvia,singapore,finland-spouse
 * Then: node scripts/generate-cee-singapore-artifacts.mjs
 */
import fs from "fs";
import path from "path";
import { CEE_SINGAPORE_SERVICES } from "./lib/cee-singapore-visa-registry.mjs";

const ROOT = path.join(process.cwd(), "content/service-library");
const DATE = "10 Jun 2026";

function load(file) {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
  delete data._instructions;
  return data;
}

function save(file, meta) {
  meta.quiz = (meta.quiz ?? []).slice(0, 8).map((q, i) => ({ ...q, level: (i % 3) + 1 }));
  fs.writeFileSync(path.join(ROOT, file), JSON.stringify(meta, null, 2) + "\n");
  console.log(`Created ${file}`);
}

function replaceAll(obj, pairs) {
  let s = JSON.stringify(obj);
  for (const [from, to] of pairs) s = s.split(from).join(to);
  return JSON.parse(s);
}

function euStudent(cfg) {
  const adj = cfg.country === "Poland" ? "Polish" : cfg.country === "Hungary" ? "Hungarian" : "Latvian";
  const funds =
    cfg.country === "Poland"
      ? "€800/month (verify UdSC amount)"
      : cfg.country === "Hungary"
        ? "HUF living funds per OIF guidelines"
        : "€620/month × 12 (verify PMLP amount)";
  const meta = replaceAll(load("lithuania-student-visa.json"), [
    ["Lithuania – Student Visa (National D Visa)", `${cfg.country} – ${cfg.subService}`],
    ["Lithuania – Student Visa", `${cfg.country} – ${cfg.subService}`],
    ["Lithuanian", adj],
    ["Lithuania", cfg.country],
    ["migracija.lt", new URL(cfg.portalUrl).hostname],
    ["Migration Department (Migracijos departamentas)", cfg.authority.split("·")[0].trim()],
    ["€576/month × 12", funds],
    ["€6,912", cfg.country === "Poland" ? "€9,600+" : cfg.country === "Hungary" ? "HUF benchmark" : "€7,440"],
    ["studyinlithuania.lt", cfg.portalUrl.replace(/^https?:\/\//, "")],
    ["6–12 weeks", cfg.country === "Hungary" ? "4–10 weeks" : "6–12 weeks"],
  ]);
  Object.assign(meta, {
    shortDescription: `${cfg.authority} · D visa · University acceptance · Proof of funds`,
    updatedLabel: `Updated ${DATE}`,
    policyAlert: {
      active: true,
      date: DATE,
      summary: `Confirm requirements on ${new URL(cfg.portalUrl).hostname} before quoting.`,
    },
    alert: {
      title: "Residence permit after arrival",
      body: `After entry, apply for temporary residence permit at ${cfg.authority.split("·")[0].trim()} within required deadline.`,
    },
    about: [
      {
        label: "Description",
        value: `National visa (Type D) for study at a recognised ${cfg.country} university. After entry, apply for temporary residence permit.`,
      },
      {
        label: "Eligible applicants",
        value: `University admission · Proof of funds · Health insurance · Motivation letter · Valid passport · Language proficiency as required`,
      },
      {
        label: "Proof of funds",
        value: `${funds}. Verify current amount on official portal before quoting.`,
        warning: true,
      },
      { label: "Key authority", value: cfg.authority },
      {
        label: "After approval",
        value: `Enter ${cfg.country}; register address; apply for residence permit within visa validity.`,
      },
    ],
    eligibility: [
      { criterion: `Admission from recognised ${cfg.country} institution`, met: true },
      { criterion: "Proof of funds for study period", met: false, note: "Verify current amount on official portal" },
      { criterion: "Health insurance (travel + statutory)", met: false },
      { criterion: "Motivation letter and CV", met: true },
      { criterion: "Language proficiency (as required)", met: true, note: "English or local language per program" },
      { criterion: "Valid passport", met: true },
    ],
    resources: [{ title: `${cfg.country} immigration portal`, url: cfg.portalUrl, description: "Official requirements" }],
    changelog: [{ version: "v1.0", date: DATE, author: "Service Library", summary: `Initial ${cfg.country} student visa content.` }],
  });
  return meta;
}

function euVisitor(cfg) {
  const adj = cfg.country === "Poland" ? "Polish" : cfg.country === "Hungary" ? "Hungarian" : "Latvian";
  const meta = replaceAll(load("lithuania-visitor-visa.json"), [
    ["Lithuania – Schengen Visitor Visa (Type C)", `${cfg.country} – ${cfg.subService}`],
    ["Lithuanian", adj],
    ["Lithuania", cfg.country],
    ["migracija.lt", new URL(cfg.portalUrl).hostname],
  ]);
  Object.assign(meta, {
    shortDescription: `${cfg.authority} · Tourism, family, business · 90/180 rule`,
    updatedLabel: `Updated ${DATE}`,
    about: [
      {
        label: "Description",
        value: `Schengen Type C short-stay visa for tourism, family visits, or business trips to ${cfg.country} up to 90 days per 180-day period.`,
      },
      {
        label: "Eligible applicants",
        value: "Temporary visit purpose · Travel insurance €30,000+ · Funds for trip · Strong ties to India · Clean Schengen history",
      },
      {
        label: "Main destination rule",
        value: `Apply at embassy of main Schengen destination. If ${cfg.country} is primary stay, apply via ${adj} mission/VFS.`,
        warning: true,
      },
      { label: "Key authority", value: cfg.authority },
      { label: "After approval", value: "Respect visa validity and 90/180 rule. Overstay affects future Schengen applications." },
    ],
    changelog: [{ version: "v1.0", date: DATE, author: "Service Library", summary: `Initial ${cfg.country} Schengen visitor content.` }],
  });
  return meta;
}

function euSpouse(cfg) {
  const meta = replaceAll(load("germany-spouse-visa.json"), [
    ["Germany – Spouse / Family Reunion Visa", `${cfg.country} – ${cfg.subService}`],
    ["German Embassy", `${cfg.country} Embassy`],
    ["German citizen", `${cfg.country} citizen or EU resident`],
    ["Germany", cfg.country],
    ["German", cfg.country === "Poland" ? "Polish" : cfg.country === "Hungary" ? "Hungarian" : cfg.country === "Latvia" ? "Latvian" : "Finnish"],
    ["auswaertiges-amt.de", new URL(cfg.portalUrl).hostname],
    ["Basic German A1", "Language/integration requirements as applicable"],
    ["German A1", "Local language or integration proof"],
  ]);
  Object.assign(meta, {
    shortDescription: `${cfg.authority} · Spouse of citizen/resident · Relationship & sponsor proof`,
    updatedLabel: `Updated ${DATE}`,
    policyAlert: {
      active: true,
      date: DATE,
      summary: `Confirm family reunification fees and requirements on ${new URL(cfg.portalUrl).hostname} before quoting.`,
    },
    alert: {
      title: "Sponsor status required",
      body: `Sponsor must hold qualifying legal residence or citizenship in ${cfg.country} with adequate housing and income.`,
    },
    about: [
      {
        label: "Description",
        value: `Residence permit route for spouse reunion with ${cfg.country} citizen or foreign national holding qualifying residence permit.`,
      },
      {
        label: "Eligible applicants",
        value: "Valid marriage registered · Genuine relationship · Sponsor income/housing · Health insurance · Clean immigration history",
      },
      {
        label: "Sponsor requirements",
        value: "Adequate accommodation, stable income, and legal status in destination country. Verify thresholds on official portal.",
        warning: true,
      },
      { label: "Key authority", value: cfg.authority },
      { label: "After approval", value: "Enter on national D visa if required; collect residence card; register address locally." },
    ],
    eligibility: [
      { criterion: "Valid marriage certificate (apostilled/translated)", met: true },
      { criterion: "Sponsor legal status in destination country", met: true },
      { criterion: "Proof of genuine relationship", met: true },
      { criterion: "Sponsor adequate income and housing", met: false, note: "Verify current thresholds" },
      { criterion: "Health insurance coverage", met: false },
      { criterion: "Language/integration requirements (if applicable)", met: false, note: "Country-specific exemptions may apply" },
    ],
    changelog: [{ version: "v1.0", date: DATE, author: "Service Library", summary: `Initial ${cfg.country} family reunification content.` }],
  });
  return meta;
}

function euWork(cfg) {
  const template = cfg.country === "Poland" ? "germany-blue-card.json" : "germany-skilled-worker.json";
  const display =
    cfg.country === "Poland"
      ? "Poland – EU Blue Card / Skilled Worker Residence"
      : "Hungary – Residence Permit for Employment";
  const meta = replaceAll(load(template), [
    ["Germany – EU Blue Card", display],
    ["Germany – Skilled Worker Visa", display],
    ["German Embassy", `${cfg.country} Embassy`],
    ["Germany", cfg.country],
    ["German", cfg.country === "Poland" ? "Polish" : "Hungarian"],
    ["make-it-in-germany.com", new URL(cfg.portalUrl).hostname],
    ["§18a/§18b", cfg.country === "Poland" ? "EU Blue Card / temporary residence for work" : "guest worker / employment permit"],
  ]);
  Object.assign(meta, {
    displayName: display,
    shortDescription: `${cfg.authority} · Employer contract · Qualifications recognition`,
    updatedLabel: `Updated ${DATE}`,
    policyAlert: {
      active: true,
      date: DATE,
      summary: `Confirm work permit and residence fees on ${new URL(cfg.portalUrl).hostname} before quoting.`,
    },
    changelog: [{ version: "v1.0", date: DATE, author: "Service Library", summary: `Initial ${cfg.country} work residence content.` }],
  });
  return meta;
}

function sgStudent(cfg) {
  const meta = replaceAll(load("uae-student-visa.json"), [
    ["United Arab Emirates", "Singapore"],
    ["UAE", "Singapore"],
    ["United Arab Emirates – Student Residence Visa", "Singapore – Student's Pass (STP)"],
    ["GDRFA", "ICA"],
    ["ICP UAE", "ICA"],
    ["u.ae/en/icp", "ica.gov.sg"],
    ["AED", "SGD"],
    ["emirate", "institution"],
    ["Dubai, Sharjah, Abu Dhabi", "Singapore"],
    ["KHDA", "EduTrust / licensed PEI"],
  ]);
  Object.assign(meta, {
    displayName: "Singapore – Student's Pass (STP)",
    shortDescription: "ICA · SOLAR · Licensed institution · Full-time study",
    updatedLabel: `Updated ${DATE}`,
    policyAlert: {
      active: true,
      date: DATE,
      summary: "Student's Pass requires licensed institution SOLAR application. Confirm ICA fees before quoting.",
    },
    alert: {
      title: "SOLAR application by institution",
      body: "Institution submits Student's Pass application via SOLAR. Student completes formalities after IPA (In-Principle Approval).",
    },
    about: [
      {
        label: "Description",
        value: "Student's Pass for full-time study at a Singapore-licensed school, college, or university. Institution applies via SOLAR; student completes IPA formalities.",
      },
      {
        label: "Eligible applicants",
        value: "Unconditional admission · Full-time programme · Financial proof · Medical insurance · Clean immigration history",
      },
      { label: "Key authority", value: "ICA Singapore (ica.gov.sg) · SOLAR system · Licensed institution" },
      { label: "After approval", value: "Complete IPA formalities; collect Student's Pass; register with institution. Part-time work restrictions apply." },
    ],
    eligibility: [
      { criterion: "Admission from ICA-recognised institution", met: true },
      { criterion: "SOLAR application submitted by institution", met: false },
      { criterion: "Financial proof per institution guidelines", met: false },
      { criterion: "Medical examination (if required)", met: false },
      { criterion: "Valid passport 6+ months", met: true },
    ],
    changelog: [{ version: "v1.0", date: DATE, author: "Service Library", summary: "Initial Singapore Student's Pass content." }],
  });
  return meta;
}

function sgVisitor(cfg) {
  const meta = replaceAll(load("uae-visitor-visa.json"), [
    ["United Arab Emirates", "Singapore"],
    ["UAE", "Singapore"],
    ["United Arab Emirates – Visitor Visa", "Singapore – Short-Term Visit / Visitor"],
    ["GDRFA", "ICA"],
    ["AED", "SGD"],
  ]);
  Object.assign(meta, {
    displayName: "Singapore – Short-Term Visit / Visitor",
    shortDescription: "ICA · Tourism, family, business · Short-term visit pass",
    updatedLabel: `Updated ${DATE}`,
    about: [
      {
        label: "Description",
        value: "Short-term visit to Singapore for tourism, family visits, or business meetings. Indian nationals typically require visa or approved entry scheme.",
      },
      { label: "Key authority", value: "ICA Singapore · Authorised visa agents in India" },
    ],
    changelog: [{ version: "v1.0", date: DATE, author: "Service Library", summary: "Initial Singapore visitor content." }],
  });
  return meta;
}

function sgSpouse(cfg) {
  const meta = replaceAll(load("uae-spouse-dependent-visa.json"), [
    ["United Arab Emirates", "Singapore"],
    ["UAE", "Singapore"],
    ["United Arab Emirates – Spouse / Dependent Visa", "Singapore – Dependant's Pass / LTVP (Spouse & Dependants)"],
    ["GDRFA", "ICA"],
    ["AED", "SGD"],
  ]);
  Object.assign(meta, {
    displayName: "Singapore – Dependant's Pass / LTVP (Spouse & Dependants)",
    shortDescription: "ICA · Spouse/child of EP, S Pass, or Student's Pass holder",
    updatedLabel: `Updated ${DATE}`,
    alert: {
      title: "Tied to principal pass holder",
      body: "Dependant's Pass or LTVP requires valid Employment Pass, S Pass, Student's Pass, or other qualifying sponsor pass.",
    },
    about: [
      {
        label: "Description",
        value: "Dependant's Pass or Long-Term Visit Pass for legally married spouse or children of qualifying pass holders in Singapore.",
      },
      {
        label: "Eligible applicants",
        value: "Spouse/child of EP, PEP, S Pass, or Student's Pass holder · Genuine relationship · Sponsor meets minimum salary criteria",
      },
      { label: "Key authority", value: "ICA Singapore (ica.gov.sg)" },
    ],
    eligibility: [
      { criterion: "Principal pass holder valid status", met: true },
      { criterion: "Marriage/birth certificates (legalised)", met: true },
      { criterion: "Sponsor meets minimum salary threshold", met: false, note: "Verify current ICA criteria" },
      { criterion: "Genuine family relationship", met: true },
    ],
    changelog: [{ version: "v1.0", date: DATE, author: "Service Library", summary: "Initial Singapore Dependant's Pass content." }],
  });
  return meta;
}

function sgWork(cfg) {
  const meta = replaceAll(load("uae-work-permit.json"), [
    ["United Arab Emirates", "Singapore"],
    ["UAE", "Singapore"],
    ["United Arab Emirates – Employment / Work Permit", "Singapore – Employment Pass / S Pass (Work Pass)"],
    ["MOHRE", "MOM"],
    ["GDRFA", "MOM / ICA"],
    ["AED", "SGD"],
  ]);
  Object.assign(meta, {
    displayName: "Singapore – Employment Pass / S Pass (Work Pass)",
    shortDescription: "MOM · Employer-sponsored · EP for professionals · S Pass for mid-skilled",
    updatedLabel: `Updated ${DATE}`,
    about: [
      {
        label: "Description",
        value: "Employment Pass (EP) for professionals, managers, executives; S Pass for mid-skilled workers. Employer applies via MOM.",
      },
      { label: "Key authority", value: "Ministry of Manpower (mom.gov.sg) · COMPASS scoring for EP" },
    ],
    changelog: [{ version: "v1.0", date: DATE, author: "Service Library", summary: "Initial Singapore Employment Pass content." }],
  });
  return meta;
}

for (const cfg of CEE_SINGAPORE_SERVICES) {
  let meta;
  switch (cfg.kind) {
    case "student":
      meta = cfg.country === "Singapore" ? sgStudent(cfg) : euStudent(cfg);
      break;
    case "visitor":
      meta = cfg.country === "Singapore" ? sgVisitor(cfg) : euVisitor(cfg);
      break;
    case "spouse":
      meta = euSpouse(cfg);
      break;
    case "work":
      meta = cfg.country === "Singapore" ? sgWork(cfg) : euWork(cfg);
      break;
    default:
      throw new Error(`Unknown kind ${cfg.kind}`);
  }
  save(cfg.file, meta);
}

console.log("Done. Run expand-service-quizzes + generate-cee-singapore-artifacts.mjs");
