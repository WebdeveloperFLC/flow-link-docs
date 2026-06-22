import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ServiceDocumentStructure } from "@/lib/service-library/documentStructure";

type Props = {
  structure: ServiceDocumentStructure | null;
};

export function ServiceDocumentStructureTab({ structure }: Props) {
  if (!structure?.sections.length) {
    return (
      <Card className="p-5 shadow-elev-sm">
        <p className="text-sm text-muted-foreground">
          No document structure configured yet. Administrators can define sections and default documents in{" "}
          <strong>Service Library Admin → Document Structure</strong>.
        </p>
      </Card>
    );
  }

  const sections = [...structure.sections]
    .filter((s) => s.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-4">
      <Card className="p-4 shadow-elev-sm bg-muted/20 border-dashed">
        <p className="text-sm text-muted-foreground">
          Default document requirements for this service. When a client enrolls, active documents below are seeded
          into the case Documents tab in this order. Counselors may still add case-specific documents manually.
        </p>
      </Card>

      {sections.map((section) => {
        const docs = [...section.documents]
          .filter((d) => d.is_active)
          .sort((a, b) => a.sort_order - b.sort_order);
        if (docs.length === 0) return null;

        return (
          <Card key={section.section_key} className="p-5 shadow-elev-sm">
            <h3 className="font-semibold mb-3">{section.label}</h3>
            <ul className="space-y-2">
              {docs.map((doc) => (
                <li
                  key={doc.item_key}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                >
                  <span>{doc.label ?? doc.master_item_code}</span>
                  <Badge variant={doc.mandatory ? "default" : "outline"} className="text-[10px] shrink-0">
                    {doc.mandatory ? "Required" : "Optional"}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
