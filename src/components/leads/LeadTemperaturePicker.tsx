import { ChevronDown, Flame, Snowflake, Thermometer } from "lucide-react";
import { LeadTemperatureBadge } from "@/components/leads/LeadBadges";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { LeadTemperature } from "@/lib/leads";
import { cn } from "@/lib/utils";

const OPTIONS: { value: LeadTemperature; label: string; icon: typeof Flame }[] = [
  { value: "hot", label: "Hot", icon: Flame },
  { value: "warm", label: "Warm", icon: Thermometer },
  { value: "cold", label: "Cold", icon: Snowflake },
];

type Props = {
  value: string | null | undefined;
  disabled?: boolean;
  onChange: (value: LeadTemperature) => void;
};

export function LeadTemperaturePicker({ value, disabled, onChange }: Props) {
  const current = (value || "cold") as LeadTemperature;

  if (disabled) {
    return <LeadTemperatureBadge value={current} />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          title="Change lead importance"
        >
          <LeadTemperatureBadge value={current} />
          <ChevronDown className="size-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {OPTIONS.map(({ value: v, label, icon: Icon }) => (
          <DropdownMenuItem
            key={v}
            disabled={v === current}
            onClick={() => onChange(v)}
          >
            <Icon className="size-4 mr-2" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
