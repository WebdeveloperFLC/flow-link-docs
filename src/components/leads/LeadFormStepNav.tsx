import { cn } from "@/lib/utils";

export const LEAD_FORM_SECTIONS = [
  { id: "lead-section-personal", label: "Personal", step: 1 },
  { id: "lead-section-geography", label: "Geography", step: 2, warmOnly: true },
  { id: "lead-section-background", label: "Background", step: 3, warmOnly: true },
  { id: "lead-section-funding", label: "Funding", step: 4, warmOnly: true },
  { id: "lead-section-services", label: "Services", step: 5, warmOnly: true },
  { id: "lead-section-assignment", label: "Assignment", step: 6, warmOnly: true },
  { id: "lead-section-followup", label: "Follow-up", step: 7, warmOnly: true },
  { id: "lead-section-notes", label: "Notes", step: 8, warmOnly: true },
] as const;

/** Maps validation field keys to section element ids for scroll-to-error. */
export const LEAD_FIELD_SECTION_ID: Record<string, string> = {
  first_name: "lead-section-personal",
  last_name: "lead-section-personal",
  email: "lead-section-personal",
  phone: "lead-section-personal",
  country_of_citizenship: "lead-section-geography",
  country_of_residence: "lead-section-geography",
  interested_countries: "lead-section-geography",
  last_education: "lead-section-background",
  sponsor: "lead-section-funding",
  start_timeline: "lead-section-funding",
  has_budget: "lead-section-funding",
  coaching_services: "lead-section-services",
  visa_services: "lead-section-services",
  branch: "lead-section-assignment",
  department: "lead-section-assignment",
  assigned_to: "lead-section-assignment",
  notes: "lead-section-notes",
};

type Props = {
  isCold: boolean;
  className?: string;
};

export function LeadFormStepNav({ isCold, className }: Props) {
  const steps = LEAD_FORM_SECTIONS.filter((s) => !s.warmOnly || !isCold);

  return (
    <nav
      aria-label="Lead form sections"
      className={cn("flex flex-wrap gap-1.5", className)}
    >
      {steps.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
        >
          <span className="tabular-nums text-[10px] opacity-70">{s.step}</span>
          {s.label}
        </a>
      ))}
    </nav>
  );
}

export function scrollToLeadSection(fieldKey: string) {
  const sectionId = LEAD_FIELD_SECTION_ID[fieldKey] ?? "lead-section-personal";
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
