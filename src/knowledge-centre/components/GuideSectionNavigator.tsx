import { Button } from "@/components/ui/button";
import type { GuideSectionManifest } from "@/knowledge-centre/types/kc";

export function GuideSectionNavigator({
  sections,
  activeId,
  onSelect,
}: {
  sections: GuideSectionManifest[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Guide sections">
      {sections.map((s) => (
        <Button
          key={s.id}
          size="sm"
          variant={activeId === s.id ? "default" : "outline"}
          onClick={() => onSelect(s.id)}
        >
          {s.order}. {s.title}
        </Button>
      ))}
    </nav>
  );
}
