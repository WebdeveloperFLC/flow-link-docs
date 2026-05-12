// Family Reunification / Dependent Pathway — Canada PR & citizen sponsors.
// Pure evaluation: no DB, no network. Used by both the UI flow and the PDF.

export type FamilyBranch = "spouse" | "child" | "parent" | "other";
export type SponsorStatus = "citizen" | "pr_holder";

export interface FamilyAnswers {
  sponsor_status?: SponsorStatus | "" | null;
  branch?: FamilyBranch | "" | null;
  // Spouse / partner branch
  partner_type?: "spouse" | "common_law" | "conjugal";
  partner_location?: "inside_canada" | "outside_canada" | "unsure";
  legally_married?: boolean;
  cohabited_12_months?: boolean;
  conjugal_barrier?: boolean;
  has_children_together?: boolean;
  // Child branch
  child_type?: "biological" | "adopted" | "stepchild" | "other";
  child_location?: "inside_canada" | "outside_canada";
  child_dependent?: boolean;
  child_married?: boolean;
  has_custody?: boolean;
  // Parent / grandparent branch
  parent_type?: "parent" | "grandparent";
  parent_location?: "inside_canada" | "outside_canada" | "unsure";
  pathway_preference?: "super_visa" | "pgp" | "unsure";
  host_relationship?: "child" | "grandchild" | "other" | "unsure";
  can_show_income?: boolean;
  can_prove_relationship?: boolean;
  has_medical_insurance?: boolean;
  // Other branch
  other_relative_type?: "sibling" | "aunt_uncle" | "cousin" | "niece_nephew" | "other";
  other_in_canada?: boolean;
  exceptional_case?: boolean;
  // Income / LICO
  family_size?: number;
  // Documents readiness — keyed by doc id
  documents?: Record<string, boolean>;
}

export const FAMILY_BRANCH_LABELS: Record<FamilyBranch, string> = {
  spouse: "Spouse / Common-law / Conjugal partner",
  child: "Dependent child",
  parent: "Parent / Grandparent",
  other: "Other family member",
};

export interface FamilyVerdict {
  label: string;
  status: "likely" | "review" | "not_eligible";
  reasons: string[];
}

export interface FamilyEvaluation {
  branch: FamilyBranch | null;
  verdicts: FamilyVerdict[];
  checklist: { id: string; label: string; required: boolean; have: boolean }[];
  nextActions: string[];
}

function checklistFor(branch: FamilyBranch, a: FamilyAnswers): FamilyEvaluation["checklist"] {
  const docs = a.documents ?? {};
  const items: { id: string; label: string; required: boolean }[] = [];
  const common = [
    { id: "passport", label: "Sponsor passport / PR card / citizenship proof", required: true },
    { id: "relationship_proof", label: "Relationship proof (certificate, photos, communication)", required: true },
    { id: "financial_proof", label: "Sponsor financial proof / income (Notice of Assessment)", required: true },
  ];
  items.push(...common);
  if (branch === "spouse") {
    items.push(
      { id: "marriage_certificate", label: "Marriage certificate (if married)", required: !!a.legally_married },
      { id: "cohabitation_proof", label: "12 months cohabitation proof (lease, joint accounts)", required: a.partner_type === "common_law" },
      { id: "children_birth_certs", label: "Children's birth certificates (if any)", required: !!a.has_children_together },
    );
  }
  if (branch === "child") {
    items.push(
      { id: "child_birth", label: "Child's birth certificate", required: true },
      { id: "adoption_papers", label: "Adoption papers", required: a.child_type === "adopted" },
      { id: "custody_order", label: "Custody / guardianship order", required: true },
    );
  }
  if (branch === "parent") {
    items.push(
      { id: "invitation_letter", label: "Invitation letter from sponsor", required: true },
      { id: "income_proof", label: "Minimum Necessary Income proof (3 years NOA)", required: a.pathway_preference !== "super_visa" },
      { id: "medical_insurance", label: "Medical insurance (1 year, Super Visa)", required: a.pathway_preference === "super_visa" },
    );
  }
  if (branch === "other") {
    items.push({ id: "humanitarian_grounds", label: "Humanitarian / exceptional case file", required: !!a.exceptional_case });
  }
  return items.map((it) => ({ ...it, have: !!docs[it.id] }));
}

export function evaluateFamily(a: FamilyAnswers): FamilyEvaluation {
  const branch = (a.branch || null) as FamilyBranch | null;
  const verdicts: FamilyVerdict[] = [];
  const nextActions: string[] = [];

  if (!a.sponsor_status) {
    return { branch, verdicts: [{ label: "Sponsor status required", status: "review", reasons: ["Confirm Canadian citizenship or PR status to proceed."] }], checklist: [], nextActions: ["Confirm sponsor status."] };
  }

  if (!branch) {
    return { branch: null, verdicts: [{ label: "Select a family relationship", status: "review", reasons: [] }], checklist: [], nextActions: [] };
  }

  if (branch === "spouse") {
    const partnerType = a.partner_type ?? "spouse";
    if (partnerType === "spouse" && !a.legally_married) {
      verdicts.push({ label: "Marriage proof required", status: "review", reasons: ["Selected 'spouse' but legal marriage not confirmed."] });
    }
    if (partnerType === "common_law" && !a.cohabited_12_months) {
      verdicts.push({ label: "Common-law cohabitation gap", status: "review", reasons: ["At least 12 months of continuous cohabitation is required."] });
    }
    if (partnerType === "conjugal" && !a.conjugal_barrier) {
      verdicts.push({ label: "Conjugal eligibility unclear", status: "review", reasons: ["Conjugal partner class requires demonstrable barrier to marriage or cohabitation."] });
    }
    if (a.partner_location === "inside_canada") {
      verdicts.push({ label: "Spouse / Common-law Partner in Canada Class", status: "likely", reasons: ["Partner is in Canada — in-Canada sponsorship class is available."] });
    } else {
      verdicts.push({ label: "Family Class sponsorship (outland)", status: "likely", reasons: ["Partner outside Canada — Family Class outland sponsorship typical."] });
    }
    nextActions.push("Compile relationship history timeline (dates, photos, communications).");
    nextActions.push("Confirm sponsor has not previously sponsored a partner within bar period.");
  }

  if (branch === "child") {
    if (a.child_married) {
      verdicts.push({ label: "Child no longer a dependent", status: "not_eligible", reasons: ["Married or common-law children are not eligible as dependents."] });
    } else if (!a.child_dependent) {
      verdicts.push({ label: "Dependency check required", status: "review", reasons: ["Confirm child meets IRCC dependent-child age & dependency rules."] });
    } else {
      verdicts.push({ label: "Dependent child sponsorship — likely", status: "likely", reasons: ["Child appears eligible under dependent-child definition."] });
    }
    if (!a.has_custody) {
      nextActions.push("Obtain custody / guardianship order and consent from other parent if applicable.");
    }
  }

  if (branch === "parent") {
    if (a.pathway_preference === "super_visa") {
      verdicts.push({
        label: "Super Visa",
        status: a.has_medical_insurance && a.can_show_income ? "likely" : "review",
        reasons: [
          a.has_medical_insurance ? "Medical insurance arranged." : "1-year medical insurance ($100K coverage) required.",
          a.can_show_income ? "Sponsor income meets LICO." : "Sponsor income proof against LICO required.",
        ],
      });
    } else {
      verdicts.push({
        label: "Parents & Grandparents Sponsorship (PGP)",
        status: a.can_show_income ? "review" : "review",
        reasons: [
          "PGP is invitation-based — submit interest-to-sponsor when the next intake opens.",
          "Requires 3 years of Minimum Necessary Income (MNI).",
        ],
      });
      nextActions.push("Register interest-to-sponsor when IRCC opens the next PGP intake window.");
    }
    if (!a.can_prove_relationship) {
      nextActions.push("Gather birth certificates / family documents linking sponsor to parent or grandparent.");
    }
  }

  if (branch === "other") {
    verdicts.push({
      label: "Counselor review only",
      status: "review",
      reasons: [
        "Siblings, aunts/uncles, cousins are not generally eligible under Family Class.",
        a.exceptional_case ? "Humanitarian & compassionate grounds may apply — counselor review required." : "Consider alternative pathways (study/work permit, then PR).",
      ],
    });
    nextActions.push("Book counselor consultation to assess humanitarian or alternative routes.");
  }

  const checklist = checklistFor(branch, a);
  const missing = checklist.filter((c) => c.required && !c.have).map((c) => c.label);
  if (missing.length) nextActions.push(`Collect missing documents: ${missing.slice(0, 3).join("; ")}${missing.length > 3 ? "…" : ""}.`);

  return { branch, verdicts, checklist, nextActions };
}