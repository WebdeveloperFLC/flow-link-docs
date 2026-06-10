import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MbbsInstitutionOption } from "@/lib/service-library/mbbs/types";

type Props = {
  options: MbbsInstitutionOption[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function MbbsInstitutionSwitcher({ options, selectedId, onSelect }: Props) {
  if (options.length <= 1) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground shrink-0">Institution</span>
      <Select value={selectedId} onValueChange={onSelect}>
        <SelectTrigger className="w-full sm:w-[min(420px,100%)] h-9 border-rose-500/30 bg-rose-500/5">
          <SelectValue placeholder="Select institution" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.label}
              {o.isDefault ? " (default)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
