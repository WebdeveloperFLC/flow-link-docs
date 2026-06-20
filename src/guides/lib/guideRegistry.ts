import type { StaffGuideDef } from "./guideTypes";

/**
 * Register staff guides here. Add a markdown file under `docs/guides/` and a
 * matching entry in this list — the sidebar and index page update automatically.
 *
 * **Governance separation:** Administrative and infrastructure governance docs live
 * under `docs/governance/` and must never appear in STAFF_GUIDES or the CRM Guides
 * module. Staff guides are SOPs, training, workflows, and process documentation only.
 *
 * Index: docs/guides/README.md | Governance: docs/governance/GOVERNANCE_INDEX.md
 *
 * **UAT policy:** Every module UAT script under `docs/guides/*UAT*.md` must be
 * registered here (category `UAT / …`) so Finance and ops can run checklists in-app
 * at `/guides/<slug>` — do not leave UAT as GitHub-only links.
 */

/** Filenames that must never be registered or loaded via the Guides UI. */
export const GOVERNANCE_CONTENT_DENYLIST = [
  "GOVERNANCE_INDEX.md",
  "EXIT_STRATEGY.md",
  "OPERATIONS_RUNBOOK.md",
  "ACCESS_REGISTER.md",
  "OWNERSHIP_MATRIX.md",
  "MONTHLY_AUDIT.md",
] as const;
export const STAFF_GUIDES: StaffGuideDef[] = [
  // —— SOP ——
  {
    slug: "counselor-sop",
    title: "Counselor SOP",
    navLabel: "Counselor SOP",
    description: "Daily counselor workflow, client access, key modules, and escalation.",
    category: "SOP",
    contentFile: "counselor-sop.md",
    relatedModule: "clients",
  },
  {
    slug: "student-application-sop",
    title: "Student Application SOP",
    navLabel: "Student Application SOP",
    description: "Application stages from intake through submission readiness in the CRM.",
    category: "SOP",
    contentFile: "student-application-sop.md",
    relatedModule: "clients",
  },
  {
    slug: "visa-filing-sop",
    title: "Visa Filing SOP",
    navLabel: "Visa Filing SOP",
    description: "Visa filing steps, CRM status tracking, and approval outcomes.",
    category: "SOP",
    contentFile: "visa-filing-sop.md",
    relatedModule: "clients",
  },
  {
    slug: "lead-assignment-sop",
    title: "Lead Assignment SOP",
    navLabel: "Lead Assignment SOP",
    description: "Lead sources, assignment, telecaller queue, and conversion to clients.",
    category: "SOP",
    contentFile: "lead-assignment-sop.md",
    relatedModule: "clients",
  },
  // —— Integrations ——
  {
    slug: "odoo-usage-guide",
    title: "Odoo Usage Guide",
    navLabel: "Odoo Usage",
    description: "CRM ↔ Odoo sync overview, staff expectations, and troubleshooting.",
    category: "Integrations",
    contentFile: "odoo-usage-guide.md",
  },
  {
    slug: "whatsapp-helpline",
    title: "WhatsApp Usage Guide",
    navLabel: "WhatsApp Usage",
    description:
      "Helpline inbox, AI intake, leads, counselor privacy, mock testing (Phase 0), and Meta Cloud API (Phase 1).",
    category: "Integrations",
    contentFile: "whatsapp-helpline.md",
  },
  {
    slug: "telecmi-usage-guide",
    title: "TeleCMI Usage Guide",
    navLabel: "TeleCMI Usage",
    description: "Click-to-call, browser phone, telecaller queue, and telephony settings.",
    category: "Integrations",
    contentFile: "telecmi-usage-guide.md",
  },
  {
    slug: "lms-usage-guide",
    title: "LMS Usage Guide",
    navLabel: "LMS Usage",
    description: "Learning management system access and relationship to CRM (draft).",
    category: "Integrations",
    contentFile: "lms-usage-guide.md",
  },
  {
    slug: "whatsapp-meta-team-setup",
    title: "Helpline on Meta — Team setup",
    navLabel: "WhatsApp Meta setup",
    description:
      "Step-by-step: Meta Developer, sandbox, webhook, Supabase secrets, and go-live checklist.",
    category: "Integrations",
    contentFile: "whatsapp-meta-team-setup.md",
  },
  // —— Module guides ——
  {
    slug: "institutions-module",
    title: "Institutions Module — Staff Operational Guide",
    navLabel: "Institutions Module",
    description:
      "Partner schools, website sources, document uploads, Course Review, publishing to Course Finder, and commission-confidential access.",
    category: "Institutions",
    contentFile: "institutions-module.md",
    relatedModule: "institutions",
  },
  {
    slug: "incentive-platform-spec",
    title: "Incentive Platform Specification (v1.1)",
    navLabel: "Incentive Platform Spec",
    description:
      "Technical reference — FX, rules, qualifying events, runs, payouts, competition. Phases 0–4 as-built.",
    category: "Product / Finance",
    contentFile: "incentive-platform-spec-v1.md",
    relatedModule: "incentives",
  },
  {
    slug: "incentives-module",
    title: "Incentives Module — Staff Operational Guide",
    navLabel: "Incentives Module",
    description:
      "Cash incentives: My Incentives, plans, rules, slabs, targets, FX, competitions, simulator, runs, payouts. Phases 0–4.",
    category: "Product / Finance",
    contentFile: "incentives-module-guide.md",
    relatedModule: "incentives",
  },
  {
    slug: "offers-discounts-wallet-scope",
    title: "Offers, Discounts & Wallet — Product Scope (v2.1)",
    navLabel: "Offers & Wallet Scope",
    description:
      "Canonical product spec: offer library, wallet engine, AI roadmap, incentive integration, advanced features backlog.",
    category: "Product / MarCom",
    contentFile: "offers-discounts-wallet-ai-scope-v2.md",
    relatedModule: "offers",
  },
  {
    slug: "offers-wallet-staff",
    title: "Offers & Wallet — Staff Operational Guide",
    navLabel: "Offers & Wallet Guide",
    description:
      "Offers admin, Give Discount, wallet top-ups, period close, analytics, and connection to cash incentives.",
    category: "Product / MarCom",
    contentFile: "offers-wallet-staff-guide.md",
    relatedModule: "offers",
  },
  {
    slug: "performance-hub-gaps",
    title: "Performance Hub — Gaps & Prototype Brief",
    navLabel: "Performance Hub Gaps",
    description:
      "Unified UX target state: what's built vs missing across incentives, wallet, and offers. For product, design, and Phase 5 roadmap.",
    category: "Product / Design",
    contentFile: "performance-hub-prototype-gaps.md",
    relatedModule: "incentives",
  },
  {
    slug: "performance-hub-uat",
    title: "Performance Hub — Full UAT & Testing Guide",
    navLabel: "Performance Hub UAT",
    description:
      "Complete UAT handoff: migrations, 7 demo users, demo seed, smoke gate, 51 test cases, defect tracker, and sign-off.",
    category: "UAT / Performance Hub",
    contentFile: "performance-hub-uat-guide.md",
    relatedModule: "incentives",
  },
  {
    slug: "hr-payroll-uat",
    title: "HR Payroll — Full UAT & Testing Guide",
    navLabel: "HR Payroll UAT",
    description:
      "Complete UAT handoff: migrations 00–22, demo seed, TV02 anchor, verify SQL, smoke gate, 61 test cases, progress tracker, and sign-off.",
    category: "UAT / HR Payroll",
    contentFile: "hr-payroll-uat-guide.md",
    relatedModule: "hr_payroll",
  },
  // —— UAT / Commissions ——
  {
    slug: "commission-uat-readiness",
    title: "Commission Phase 1 — UAT Readiness Pack",
    navLabel: "Commission UAT Readiness",
    description:
      "Pre-flight architecture map, migration list, test data index, and sign-off gates before Commission Phase 1 scenarios.",
    category: "UAT / Commissions",
    contentFile: "PHASE1_COMMISSION_UAT_READINESS.md",
    relatedModule: "commissions",
  },
  {
    slug: "commission-phase1-uat",
    title: "Commission Phase 1 — Official UAT Script",
    navLabel: "Commission Phase 1 UAT",
    description:
      "Six end-to-end commission scenarios: billing profiles, eligibility, holds, claims, transfers, and counselor views.",
    category: "UAT / Commissions",
    contentFile: "PHASE1_COMMISSION_UAT.md",
    relatedModule: "commissions",
  },
  {
    slug: "commission-phase2a-uat",
    title: "Commission Phase 2A — Receipt & Allocation UAT",
    navLabel: "Commission Phase 2A UAT",
    description:
      "Receipt lifecycle, invoice/student allocation, short-pay, FX review, attachments, and posted immutability.",
    category: "UAT / Commissions",
    contentFile: "PHASE2A_COMMISSION_UAT.md",
    relatedModule: "commissions",
  },
  {
    slug: "commission-phase2b-uat",
    title: "Commission Phase 2B — Aggregator Billing UAT",
    navLabel: "Commission Phase 2B UAT",
    description:
      "Aggregator workbench, remittance batches, statements, partial wires, disputes, and held KPI reconciliation.",
    category: "UAT / Commissions",
    contentFile: "PHASE2B_COMMISSION_UAT.md",
    relatedModule: "commissions",
  },
  // —— UAT / Accounting ——
  {
    slug: "accounting-phase1-uat",
    title: "Accounting Phase 1 — UAT Checklist",
    navLabel: "Accounting Phase 1 UAT",
    description:
      "Full Phase 1 accounting UAT: AR/AP bridge, trust, payroll, journals, entity-scoped reports, and posting immutability.",
    category: "UAT / Accounting",
    contentFile: "PHASE1_ACCOUNTING_UAT.md",
    relatedModule: "accounting",
  },
  {
    slug: "accounting-r1-collection-categories-uat",
    title: "Accounting R1 — Collection Category Master UAT",
    navLabel: "Accounting R1 UAT",
    description:
      "Collection category master, payment allocation, trust subledger, disbursements, and payment-purpose reporting.",
    category: "UAT / Accounting",
    contentFile: "PHASE1_R1_COLLECTION_CATEGORIES_UAT.md",
    relatedModule: "accounting",
  },
  {
    slug: "accounting-ar-invoice-workflow-uat",
    title: "AR Invoice Hybrid Workflow UAT",
    navLabel: "AR Invoice Workflow UAT",
    description:
      "CRM-driven and corporate AR invoice workflows, service enrollment, collection categories, and ledger sync.",
    category: "UAT / Accounting",
    contentFile: "PHASE1_AR_INVOICE_WORKFLOW_UAT.md",
    relatedModule: "accounting",
  },
  {
    slug: "accounting-installment-billing-uat",
    title: "Installment & Deposit Billing UAT",
    navLabel: "Installment Billing UAT",
    description:
      "Deposit, installment, and balance billing controls, over-invoicing guards, and service-case billing profiles.",
    category: "UAT / Accounting",
    contentFile: "PHASE1_1_INSTALLMENT_BILLING_UAT.md",
    relatedModule: "accounting",
  },
  // —— UAT / CRM Profile ——
  {
    slug: "profile-phase-e-uat",
    title: "Profile Phase E — Tests Module UAT",
    navLabel: "Profile Phase E UAT",
    description:
      "Multi-attempt Tests module: dual-write migration, attempt UI, active attempt, status rules, and Client 360 summary.",
    category: "UAT / CRM Profile",
    contentFile: "PHASE_E_UAT.md",
    relatedModule: "clients",
  },
  {
    slug: "profile-phase-d-uat",
    title: "Profile Phase D — Lead Profile Parity UAT",
    navLabel: "Profile Phase D UAT",
    description:
      "Lead background profile parity with client Profile tab, follow-up log, register-as-client, and document placeholders.",
    category: "UAT / CRM Profile",
    contentFile: "PHASE_D_UAT.md",
    relatedModule: "clients",
  },
];

/** Staff guides only — intentionally excludes `docs/governance/`. */
const contentModules = import.meta.glob("../../../docs/guides/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function assertStaffGuidesPolicy(): void {
  const denylist = GOVERNANCE_CONTENT_DENYLIST as readonly string[];
  for (const guide of STAFF_GUIDES) {
    if (denylist.includes(guide.contentFile)) {
      throw new Error(
        `[Guides] "${guide.slug}" references governance file "${guide.contentFile}". ` +
          "Governance docs belong in docs/governance/ and must not be exposed in CRM Guides.",
      );
    }
    if (guide.contentFile.includes("/") || guide.contentFile.includes("..")) {
      throw new Error(
        `[Guides] "${guide.slug}" contentFile must be a bare filename under docs/guides/.`,
      );
    }
  }
}

assertStaffGuidesPolicy();

function contentPathFor(file: string): string | undefined {
  return Object.keys(contentModules).find((k) => k.endsWith(`/${file}`));
}

export function getGuideBySlug(slug: string): StaffGuideDef | undefined {
  return STAFF_GUIDES.find((g) => g.slug === slug);
}

export function getGuideContent(slug: string): string | null {
  const guide = getGuideBySlug(slug);
  if (!guide) return null;
  const path = contentPathFor(guide.contentFile);
  return path ? contentModules[path] : null;
}
