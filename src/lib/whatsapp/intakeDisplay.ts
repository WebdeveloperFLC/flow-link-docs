/** Format whatsapp_conversations.intake_data for CRM thread header. */

export interface IntakeDisplayLine {
  label: string;
  value: string;
}

function str(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  return v.trim();
}

export function isFlMenuIntake(data: Record<string, unknown> | null | undefined): boolean {
  return data?.flow === "fl_menu_v1";
}

export function formatIntakeSummary(data: Record<string, unknown> | null | undefined): IntakeDisplayLine[] {
  if (!data || typeof data !== "object") return [];

  const lines: IntakeDisplayLine[] = [];
  const push = (label: string, key: string) => {
    const val = str(data[key]);
    if (val) lines.push({ label, value: val });
  };

  if (isFlMenuIntake(data)) {
    push("Name", "full_name");
    push("Service", "service_label");
    push("Country", "country");
    push("Branch", "branch_preference");
    push("Qualification", "highest_qualification");
    push("Intake", "preferred_intake");
    push("Purpose", "purpose_of_travel");
    push("Spouse status", "spouse_status");
    push("Sponsor status", "super_visa_sponsor_status");
    push("PGWP / status", "pgwp_sub_type");
    push("In Canada", "in_canada");
    push("Course", "coaching_course");
    push("Mode", "coaching_mode");
    push("Inquiry", "other_inquiry");
    return lines;
  }

  push("Country", "country");
  push("Level", "level");
  push("Branch", "branch_preference");
  push("Name", "full_name");
  return lines;
}
