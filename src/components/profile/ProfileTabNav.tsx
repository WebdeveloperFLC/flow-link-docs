import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProfileCompletionSection, ProfileSectionId } from "@/lib/profile/types";

export interface ProfileTabDef {
  id: ProfileSectionId;
  label: string;
  shortLabel?: string;
}

export const PROFILE_TABS: ProfileTabDef[] = [
  { id: "identity", label: "Identity", shortLabel: "Identity" },
  { id: "contact", label: "Contact", shortLabel: "Contact" },
  { id: "tests", label: "Tests", shortLabel: "Tests" },
  { id: "education", label: "Education", shortLabel: "Education" },
  { id: "experience", label: "Experience", shortLabel: "Experience" },
];

interface Props {
  activeSection: ProfileSectionId;
  sections?: ProfileCompletionSection[];
  onChange: (section: ProfileSectionId) => void;
  className?: string;
}

export function ProfileTabNav({ activeSection, sections, onChange, className }: Props) {
  const badgeFor = (id: ProfileSectionId) => sections?.find((s) => s.section === id);

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {PROFILE_TABS.map((tab) => {
        const badge = badgeFor(tab.id);
        const active = activeSection === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-accent",
            )}
          >
            {tab.shortLabel ?? tab.label}
            {badge && badge.total > 0 && (
              <Badge
                variant={active ? "secondary" : "outline"}
                className="h-4 px-1 text-[10px] font-normal tabular-nums"
              >
                {badge.filled}/{badge.total}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
