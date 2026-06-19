import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProfileCompletionSection, ProfileTabId } from "@/lib/profile/types";

export interface ProfileTabDef {
  id: ProfileTabId;
  label: string;
  shortLabel?: string;
}

export const PROFILE_TABS: ProfileTabDef[] = [
  { id: "identity", label: "Identity", shortLabel: "Identity" },
  { id: "contact", label: "Contact", shortLabel: "Contact" },
  { id: "tests", label: "Tests", shortLabel: "Tests" },
  { id: "education", label: "Education", shortLabel: "Education" },
  { id: "experience", label: "Experience", shortLabel: "Experience" },
  { id: "client360", label: "Client 360", shortLabel: "Client 360" },
];

export function sectionTitle(section: ProfileTabId): string {
  if (section === "client360") return "Client 360";
  return section.charAt(0).toUpperCase() + section.slice(1);
}

interface Props {
  activeSection: ProfileTabId;
  sections?: ProfileCompletionSection[];
  onChange: (section: ProfileTabId) => void;
  className?: string;
}

export function ProfileTabNav({ activeSection, sections, onChange, className }: Props) {
  const badgeFor = (id: ProfileTabId) =>
    id === "client360" ? undefined : sections?.find((s) => s.section === id);

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)} data-testid="profile-tab-nav">
      {PROFILE_TABS.map((tab) => {
        const badge = badgeFor(tab.id);
        const active = activeSection === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            data-testid={`profile-tab-${tab.id}`}
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
