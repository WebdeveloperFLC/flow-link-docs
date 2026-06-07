/**
 * Future Link Consultants — scripted WhatsApp lead capture (menu + service branches).
 * AI counseling runs after submit when WHATSAPP_COUNSELING_BEFORE_ASSIGN is enabled.
 */

export const FL_MENU_FLOW = "fl_menu_v1";

export type LeadCaptureStep =
  | "welcome"
  | "service_menu"
  | "full_name"
  | "student_country"
  | "student_qualification"
  | "student_intake"
  | "student_branch"
  | "visitor_country"
  | "visitor_purpose"
  | "visitor_branch"
  | "spouse_country"
  | "spouse_status"
  | "spouse_branch"
  | "pr_country"
  | "pr_qualification"
  | "pr_branch"
  | "super_sponsor"
  | "super_branch"
  | "pgwp_submenu"
  | "pgwp_in_canada"
  | "pgwp_branch"
  | "coaching_course"
  | "coaching_mode"
  | "coaching_branch"
  | "other_inquiry"
  | "confirm"
  | "edit_pick"
  | "edit_value"
  | "done";

export interface LeadCaptureData {
  flow?: typeof FL_MENU_FLOW;
  step?: LeadCaptureStep;
  service?: string;
  service_label?: string;
  full_name?: string;
  country?: string;
  branch_preference?: string;
  branch_id?: string;
  /** Counseling / service-library hint */
  level?: string;
  highest_qualification?: string;
  preferred_intake?: string;
  purpose_of_travel?: string;
  spouse_status?: string;
  super_visa_sponsor_status?: string;
  pgwp_sub_type?: string;
  in_canada?: string;
  coaching_course?: string;
  coaching_mode?: string;
  other_inquiry?: string;
  edit_field?: "full_name" | "service" | "country" | "branch";
}

export interface LeadCaptureResult {
  intake: LeadCaptureData;
  replies: string[];
  confirmed: boolean;
}

const DIVIDER = "━━━━━━━━━━━━━━";

const SERVICES = [
  { n: 1, key: "student_visa", label: "Student Visa" },
  { n: 2, key: "visitor_visa", label: "Visitor / Tourist Visa" },
  { n: 3, key: "spouse_visa", label: "Spouse / Dependent Visa" },
  { n: 4, key: "pr", label: "Permanent Residency (PR)" },
  { n: 5, key: "super_visa", label: "Canada Super Visa" },
  { n: 6, key: "pgwp_extension", label: "PGWP / Canada Status Extension" },
  { n: 7, key: "coaching", label: "Coaching" },
  { n: 8, key: "other", label: "Other" },
] as const;

const PGWP_OPTIONS = [
  { n: 1, label: "PGWP Application" },
  { n: 2, label: "PGWP Refusal" },
  { n: 3, label: "Visitor Record Extension" },
  { n: 4, label: "Study Permit Extension" },
  { n: 5, label: "Restoration of Status" },
  { n: 6, label: "Other Canada Immigration Matter" },
] as const;

const COACHING_COURSES = [
  { n: 1, label: "IELTS" },
  { n: 2, label: "PTE" },
  { n: 3, label: "TOEFL" },
  { n: 4, label: "CELPIP" },
  { n: 5, label: "Duolingo" },
  { n: 6, label: "Spoken English" },
  { n: 7, label: "German" },
  { n: 8, label: "French" },
  { n: 9, label: "GRE" },
  { n: 10, label: "GMAT" },
  { n: 11, label: "SAT" },
] as const;

export function isFlMenuFlow(data: LeadCaptureData | null | undefined): boolean {
  return data?.flow === FL_MENU_FLOW;
}

export function initialFlMenuIntake(): LeadCaptureData {
  return { flow: FL_MENU_FLOW, step: "welcome" };
}

export function normalizeLeadCaptureFields(data: LeadCaptureData): LeadCaptureData {
  const out: LeadCaptureData = { ...data, flow: FL_MENU_FLOW };
  if (out.full_name) out.full_name = out.full_name.trim().replace(/\s+/g, " ");
  if (out.country) out.country = out.country.trim();
  if (out.branch_preference) out.branch_preference = out.branch_preference.trim();
  return out;
}

function firstName(intake: LeadCaptureData): string {
  return intake.full_name?.split(/\s+/)[0] || "there";
}

function parseMenuChoice(text: string, max: number): number | null {
  const t = text.trim();
  const numMatch = t.match(/^(\d+)\.?\s*(.*)$/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    if (n >= 1 && n <= max) return n;
  }
  const lower = t.toLowerCase();
  if (/^(yes|confirm|submit)$/i.test(lower)) return 1;
  if (/^edit$/i.test(lower)) return 2;
  if (/^restart$/i.test(lower)) return 3;
  return null;
}

function findServiceByText(text: string): typeof SERVICES[number] | null {
  const choice = parseMenuChoice(text, 8);
  if (choice) return SERVICES[choice - 1];
  const lower = text.toLowerCase();
  for (const s of SERVICES) {
    if (lower.includes(s.label.toLowerCase()) || lower.includes(s.key.replace(/_/g, " "))) {
      return s;
    }
  }
  return null;
}

function serviceMenuText(): string {
  const lines = SERVICES.map((s) => `${s.n}.\t${s.label}`);
  return [
    "Please select a service:",
    ...lines,
    "",
    "Please reply with the option number.",
  ].join("\n");
}

function welcomeMessage(intake: LeadCaptureData): string {
  return [
    `Hi ${firstName(intake)},`,
    "Thank you for contacting Future Link Consultants.",
    "25+ Years of Excellence in Global Education & Immigration",
    "RCIC & AIRC-Certified Organization",
    "Offices: India | Canada | USA",
    "",
    "How may we assist you today?",
    ...SERVICES.map((s) => `${s.n}.\t${s.label}`),
    "",
    "Please reply with the option number.",
    DIVIDER,
  ].join("\n");
}

function afterServiceNamePrompt(): string {
  return [
    "Thank you.",
    "Please share your Full Name (First Name & Last Name).",
    DIVIDER,
  ].join("\n");
}

function routeAfterName(service: string): { step: LeadCaptureStep; reply: string } {
  switch (service) {
    case "student_visa":
      return { step: "student_country", reply: "Which country are you interested in studying in?" };
    case "visitor_visa":
      return { step: "visitor_country", reply: "Which country would you like to visit?" };
    case "spouse_visa":
      return { step: "spouse_country", reply: "Which country is your spouse currently in?" };
    case "pr":
      return { step: "pr_country", reply: "Which country are you interested in for Permanent Residency?" };
    case "super_visa":
      return {
        step: "super_sponsor",
        reply: "Child / Grandchild Status (Canadian Citizen or Permanent Resident)?",
      };
    case "pgwp_extension":
      return {
        step: "pgwp_submenu",
        reply: [
          "Please select:",
          ...PGWP_OPTIONS.map((o) => `${o.n}.\t${o.label}`),
          DIVIDER,
        ].join("\n"),
      };
    case "coaching":
      return {
        step: "coaching_course",
        reply: [
          "Which course are you interested in?",
          ...COACHING_COURSES.map((c) => `${c.n}.\t${c.label}`),
          DIVIDER,
        ].join("\n"),
      };
    case "other":
      return {
        step: "other_inquiry",
        reply: "Please briefly describe your inquiry.",
      };
    default:
      return { step: "service_menu", reply: serviceMenuText() };
  }
}

function migrateLegacyStep(step: string): LeadCaptureStep {
  const legacy: Record<string, LeadCaptureStep> = {
    student_details: "student_qualification",
    visitor_details: "visitor_purpose",
    spouse_details: "spouse_status",
    pr_details: "pr_qualification",
    super_details: "super_sponsor",
    pgwp_details: "pgwp_in_canada",
    coaching_details: "coaching_mode",
  };
  return (legacy[step] ?? step) as LeadCaptureStep;
}

function looksLikeName(text: string): boolean {
  const t = text.trim();
  if (t.length < 3 || t.length > 80) return false;
  if (/^(hi|hello|hey|yes|no|ok|thanks?)$/i.test(t)) return false;
  if (/^\d+$/.test(t)) return false;
  return /[a-zA-Z]{2,}/.test(t) && t.split(/\s+/).length >= 1;
}

function buildConfirmSummary(intake: LeadCaptureData): string {
  const lines = [
    "Please confirm your details:",
    `• Full Name: ${intake.full_name || "—"}`,
    `• Service: ${intake.service_label || "—"}`,
  ];
  const optional: [string, string | undefined][] = [
    ["Country", intake.country],
    ["Qualification", intake.highest_qualification],
    ["Preferred Intake", intake.preferred_intake],
    ["Purpose", intake.purpose_of_travel],
    ["Spouse Status", intake.spouse_status],
    ["Sponsor Status", intake.super_visa_sponsor_status],
    ["PGWP / Status", intake.pgwp_sub_type],
    ["In Canada", intake.in_canada],
    ["Course", intake.coaching_course],
    ["Mode", intake.coaching_mode],
    ["Inquiry", intake.other_inquiry],
    ["Branch/City", intake.branch_preference],
  ];
  for (const [label, value] of optional) {
    if (value?.trim()) lines.push(`• ${label}: ${value.trim()}`);
  }
  lines.push(
    "",
    "Reply with one of the following:",
    "1.\tYES – Confirm & Submit Inquiry",
    "2.\tEDIT – Update Details",
    "3.\tRESTART – Start Over",
    DIVIDER,
  );
  return lines.join("\n");
}

function readyToConfirm(intake: LeadCaptureData): boolean {
  return !!intake.full_name && !!intake.service_label;
}

function goConfirm(intake: LeadCaptureData): LeadCaptureResult {
  const next = normalizeLeadCaptureFields({
    ...intake,
    step: "confirm",
    level: intake.service_label || intake.level,
  });
  return { intake: next, replies: [buildConfirmSummary(next)], confirmed: false };
}

function parseEditCombined(text: string): { field: LeadCaptureData["edit_field"]; value: string } | null {
  const m = text.trim().match(/^(\d+)\s*[-–—.:]\s*(.+)$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const value = m[2].trim();
  if (n === 1 && value) return { field: "full_name", value };
  if (n === 2 && value) return { field: "service", value };
  if (n === 3 && value) return { field: "country", value };
  if (n === 4 && value) return { field: "branch", value };
  return null;
}

function applyEdit(intake: LeadCaptureData, field: LeadCaptureData["edit_field"], value: string): LeadCaptureData {
  const next = { ...intake };
  switch (field) {
    case "full_name":
      next.full_name = value.trim();
      break;
    case "country":
      next.country = value.trim();
      break;
    case "branch":
      next.branch_preference = value.trim();
      break;
    case "service": {
      const svc = findServiceByText(value) || SERVICES.find((s) => s.label.toLowerCase() === value.toLowerCase());
      if (svc) {
        next.service = svc.key;
        next.service_label = svc.label;
        next.level = svc.label;
      }
      break;
    }
    default:
      break;
  }
  return next;
}

function editPickPrompt(): string {
  return [
    "Which detail would you like to update?",
    "1.\tFull Name",
    "2.\tService",
    "3.\tCountry",
    "4.\tBranch/City",
    "",
    "Please reply with the option number and the correct information.",
    "Example:",
    "3 - Canada",
    DIVIDER,
  ].join("\n");
}

export function leadCaptureSuccessMessage(intake: LeadCaptureData): string {
  const name = intake.full_name || "there";
  return [
    `Thank you, ${name}.`,
    "Your inquiry has been submitted successfully and assigned to our team.",
    "One of our experts will contact you shortly on this number.",
    "Thank you for choosing Future Link Consultants.",
  ].join("\n");
}

export function buildLeadCaptureNotes(intake: LeadCaptureData): string {
  const parts = [
    `WhatsApp FL menu intake — ${intake.service_label || intake.service || "n/a"}`,
  ];
  if (intake.country) parts.push(`country: ${intake.country}`);
  if (intake.branch_preference) parts.push(`branch: ${intake.branch_preference}`);
  if (intake.highest_qualification) parts.push(`qualification: ${intake.highest_qualification}`);
  if (intake.preferred_intake) parts.push(`intake: ${intake.preferred_intake}`);
  if (intake.purpose_of_travel) parts.push(`purpose: ${intake.purpose_of_travel}`);
  if (intake.spouse_status) parts.push(`spouse status: ${intake.spouse_status}`);
  if (intake.super_visa_sponsor_status) parts.push(`sponsor: ${intake.super_visa_sponsor_status}`);
  if (intake.pgwp_sub_type) parts.push(`PGWP/status: ${intake.pgwp_sub_type}`);
  if (intake.in_canada) parts.push(`in Canada: ${intake.in_canada}`);
  if (intake.coaching_course) parts.push(`course: ${intake.coaching_course}`);
  if (intake.coaching_mode) parts.push(`mode: ${intake.coaching_mode}`);
  if (intake.other_inquiry) parts.push(`inquiry: ${intake.other_inquiry}`);
  return parts.join("; ");
}

export function shouldForceLeadCaptureConfirm(intake: LeadCaptureData, text: string): boolean {
  if (intake.step !== "confirm") return false;
  const choice = parseMenuChoice(text, 3);
  return choice === 1 || /^yes\b/i.test(text.trim());
}

export function leadCaptureRestart(_intake?: LeadCaptureData): LeadCaptureResult {
  return {
    intake: { flow: FL_MENU_FLOW, step: "service_menu" },
    replies: [
      "No problem.",
      "Let's start again.",
      serviceMenuText(),
      DIVIDER,
    ],
    confirmed: false,
  };
}

export function nextLeadCaptureReply(
  rawIntake: LeadCaptureData,
  text: string,
): LeadCaptureResult {
  const intake = normalizeLeadCaptureFields(rawIntake);
  const trimmed = text.trim();
  const step = migrateLegacyStep(intake.step || "welcome");

  if (/^restart$/i.test(trimmed) && step !== "welcome") {
    return leadCaptureRestart(intake);
  }

  switch (step) {
    case "welcome": {
      const replies: string[] = [welcomeMessage(intake)];
      const svc = findServiceByText(trimmed);
      if (svc) {
        const next: LeadCaptureData = {
          ...intake,
          step: "full_name",
          service: svc.key,
          service_label: svc.label,
          level: svc.label,
        };
        replies.push(afterServiceNamePrompt());
        return { intake: next, replies, confirmed: false };
      }
      return {
        intake: { ...intake, step: "service_menu" },
        replies,
        confirmed: false,
      };
    }

    case "service_menu": {
      const svc = findServiceByText(trimmed);
      if (!svc) {
        return {
          intake,
          replies: ["Please reply with a number from 1 to 8.", serviceMenuText()],
          confirmed: false,
        };
      }
      return {
        intake: {
          ...intake,
          step: "full_name",
          service: svc.key,
          service_label: svc.label,
          level: svc.label,
        },
        replies: [afterServiceNamePrompt()],
        confirmed: false,
      };
    }

    case "full_name": {
      if (!looksLikeName(trimmed)) {
        return {
          intake,
          replies: ["Please share your Full Name (First Name & Last Name)."],
          confirmed: false,
        };
      }
      const withName = { ...intake, full_name: trimmed };
      const route = routeAfterName(intake.service || "");
      return {
        intake: { ...withName, step: route.step },
        replies: [route.reply],
        confirmed: false,
      };
    }

    case "student_country":
      if (!trimmed) {
        return { intake, replies: ["Which country are you interested in studying in?"], confirmed: false };
      }
      return {
        intake: { ...intake, country: trimmed, step: "student_qualification" },
        replies: ["What is your highest qualification?"],
        confirmed: false,
      };

    case "student_qualification":
      if (!trimmed) {
        return { intake, replies: ["What is your highest qualification?"], confirmed: false };
      }
      return {
        intake: { ...intake, highest_qualification: trimmed, step: "student_intake" },
        replies: ["What is your preferred intake? (e.g. Jan 2027, Sep 2026)"],
        confirmed: false,
      };

    case "student_intake":
      if (!trimmed) {
        return { intake, replies: ["What is your preferred intake? (e.g. Jan 2027, Sep 2026)"], confirmed: false };
      }
      return {
        intake: { ...intake, preferred_intake: trimmed, step: "student_branch" },
        replies: ["Preferred Branch/City?"],
        confirmed: false,
      };

    case "student_branch":
      if (!trimmed) {
        return { intake, replies: ["Preferred Branch/City?"], confirmed: false };
      }
      return goConfirm({ ...intake, branch_preference: trimmed });

    case "visitor_country":
      if (!trimmed) {
        return { intake, replies: ["Which country would you like to visit?"], confirmed: false };
      }
      return {
        intake: { ...intake, country: trimmed, step: "visitor_purpose" },
        replies: ["What is the purpose of your travel?"],
        confirmed: false,
      };

    case "visitor_purpose":
      if (!trimmed) {
        return { intake, replies: ["What is the purpose of your travel?"], confirmed: false };
      }
      return {
        intake: { ...intake, purpose_of_travel: trimmed, step: "visitor_branch" },
        replies: ["Preferred Branch/City?"],
        confirmed: false,
      };

    case "visitor_branch":
      if (!trimmed) {
        return { intake, replies: ["Preferred Branch/City?"], confirmed: false };
      }
      return goConfirm({ ...intake, branch_preference: trimmed });

    case "spouse_country":
      if (!trimmed) {
        return { intake, replies: ["Which country is your spouse currently in?"], confirmed: false };
      }
      return {
        intake: { ...intake, country: trimmed, step: "spouse_status" },
        replies: ["Spouse Status? (Student / Worker / PR Holder / Citizen)"],
        confirmed: false,
      };

    case "spouse_status":
      if (!trimmed) {
        return {
          intake,
          replies: ["Spouse Status? (Student / Worker / PR Holder / Citizen)"],
          confirmed: false,
        };
      }
      return {
        intake: { ...intake, spouse_status: trimmed, step: "spouse_branch" },
        replies: ["Preferred Branch/City?"],
        confirmed: false,
      };

    case "spouse_branch":
      if (!trimmed) {
        return { intake, replies: ["Preferred Branch/City?"], confirmed: false };
      }
      return goConfirm({ ...intake, branch_preference: trimmed });

    case "pr_country":
      if (!trimmed) {
        return {
          intake,
          replies: ["Which country are you interested in for Permanent Residency?"],
          confirmed: false,
        };
      }
      return {
        intake: { ...intake, country: trimmed, step: "pr_qualification" },
        replies: ["What is your highest qualification?"],
        confirmed: false,
      };

    case "pr_qualification":
      if (!trimmed) {
        return { intake, replies: ["What is your highest qualification?"], confirmed: false };
      }
      return {
        intake: { ...intake, highest_qualification: trimmed, step: "pr_branch" },
        replies: ["Preferred Branch/City?"],
        confirmed: false,
      };

    case "pr_branch":
      if (!trimmed) {
        return { intake, replies: ["Preferred Branch/City?"], confirmed: false };
      }
      return goConfirm({ ...intake, branch_preference: trimmed });

    case "super_sponsor":
      if (!trimmed) {
        return {
          intake,
          replies: ["Child / Grandchild Status (Canadian Citizen or Permanent Resident)?"],
          confirmed: false,
        };
      }
      return {
        intake: { ...intake, super_visa_sponsor_status: trimmed, step: "super_branch" },
        replies: ["Preferred Branch/City?"],
        confirmed: false,
      };

    case "super_branch":
      if (!trimmed) {
        return { intake, replies: ["Preferred Branch/City?"], confirmed: false };
      }
      return goConfirm({ ...intake, branch_preference: trimmed });

    case "pgwp_submenu": {
      const choice = parseMenuChoice(trimmed, 6);
      if (!choice) {
        return {
          intake,
          replies: [
            "Please select 1–6:",
            ...PGWP_OPTIONS.map((o) => `${o.n}.\t${o.label}`),
          ],
          confirmed: false,
        };
      }
      return {
        intake: {
          ...intake,
          pgwp_sub_type: PGWP_OPTIONS[choice - 1].label,
          country: "Canada",
          step: "pgwp_in_canada",
        },
        replies: ["Are you currently in Canada? (Yes/No)"],
        confirmed: false,
      };
    }

    case "pgwp_in_canada":
      if (!trimmed) {
        return { intake, replies: ["Are you currently in Canada? (Yes/No)"], confirmed: false };
      }
      return {
        intake: { ...intake, in_canada: trimmed, step: "pgwp_branch" },
        replies: ["Preferred Branch/City?"],
        confirmed: false,
      };

    case "pgwp_branch":
      if (!trimmed) {
        return { intake, replies: ["Preferred Branch/City?"], confirmed: false };
      }
      return goConfirm({ ...intake, branch_preference: trimmed });

    case "coaching_course": {
      const choice = parseMenuChoice(trimmed, 11);
      if (!choice) {
        return {
          intake,
          replies: [
            "Please select a course (1–11):",
            ...COACHING_COURSES.map((c) => `${c.n}.\t${c.label}`),
          ],
          confirmed: false,
        };
      }
      return {
        intake: {
          ...intake,
          coaching_course: COACHING_COURSES[choice - 1].label,
          step: "coaching_mode",
        },
        replies: ["Online or Classroom?"],
        confirmed: false,
      };
    }

    case "coaching_mode":
      if (!trimmed) {
        return { intake, replies: ["Online or Classroom?"], confirmed: false };
      }
      return {
        intake: { ...intake, coaching_mode: trimmed, step: "coaching_branch" },
        replies: ["Preferred Branch?"],
        confirmed: false,
      };

    case "coaching_branch":
      if (!trimmed) {
        return { intake, replies: ["Preferred Branch?"], confirmed: false };
      }
      return goConfirm({ ...intake, branch_preference: trimmed });

    case "other_inquiry":
      if (!trimmed || trimmed.length < 5) {
        return { intake, replies: ["Please briefly describe your inquiry."], confirmed: false };
      }
      return goConfirm({
        ...intake,
        other_inquiry: trimmed,
        step: "other_inquiry",
      });

    case "confirm": {
      const choice = parseMenuChoice(trimmed, 3);
      if (choice === 1 || /^yes\b/i.test(trimmed)) {
        if (!readyToConfirm(intake)) {
          return {
            intake: { ...intake, step: "service_menu" },
            replies: ["Some details are missing. Let's start again.", serviceMenuText()],
            confirmed: false,
          };
        }
        return {
          intake: { ...intake, step: "done", level: intake.service_label },
          replies: [leadCaptureSuccessMessage(intake)],
          confirmed: true,
        };
      }
      if (choice === 2 || /^edit\b/i.test(trimmed)) {
        return {
          intake: { ...intake, step: "edit_pick" },
          replies: [editPickPrompt()],
          confirmed: false,
        };
      }
      if (choice === 3) {
        return leadCaptureRestart(intake);
      }
      return {
        intake,
        replies: [
          "Reply with 1 (YES), 2 (EDIT), or 3 (RESTART).",
          buildConfirmSummary(intake),
        ],
        confirmed: false,
      };
    }

    case "edit_pick": {
      const combined = parseEditCombined(trimmed);
      if (combined) {
        const updated = applyEdit(intake, combined.field, combined.value);
        return goConfirm({ ...updated, edit_field: undefined });
      }
      const n = parseMenuChoice(trimmed, 4);
      if (!n) {
        return { intake, replies: [editPickPrompt()], confirmed: false };
      }
      const fields: LeadCaptureData["edit_field"][] = ["full_name", "service", "country", "branch"];
      const field = fields[n - 1];
      const prompts = [
        "Please share your Full Name (First Name & Last Name).",
        serviceMenuText(),
        "Which country?",
        "Preferred Branch/City?",
      ];
      return {
        intake: { ...intake, step: "edit_value", edit_field: field },
        replies: [prompts[n - 1]],
        confirmed: false,
      };
    }

    case "edit_value": {
      if (!trimmed) {
        return { intake, replies: ["Please send the updated information."], confirmed: false };
      }
      const field = intake.edit_field;
      if (!field) {
        return {
          intake: { ...intake, step: "edit_pick" },
          replies: [editPickPrompt()],
          confirmed: false,
        };
      }
      if (field === "service") {
        const svc = findServiceByText(trimmed);
        if (!svc) {
          return { intake, replies: ["Please reply with a service number (1–8).", serviceMenuText()], confirmed: false };
        }
        const updated = applyEdit(intake, "service", String(svc.n));
        return goConfirm({ ...updated, edit_field: undefined });
      }
      const updated = applyEdit(intake, field, trimmed);
      return goConfirm({ ...updated, edit_field: undefined });
    }

    case "done":
      return {
        intake,
        replies: ["Your inquiry is already submitted. Reply COUNSELOR to reach our team, or RESTART to begin again."],
        confirmed: false,
      };

    default:
      return {
        intake: initialFlMenuIntake(),
        replies: [welcomeMessage(intake)],
        confirmed: false,
      };
  }
}
