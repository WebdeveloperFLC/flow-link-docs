import { Link } from "react-router-dom";
import { ExternalLink, FolderTree } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ServiceDocumentStructure } from "@/lib/service-library/documentStructure";
import { serviceLibraryDocumentStructureAdminUrl } from "@/lib/service-library/serviceLibraryAdminLinks";

type Props = {
  structure: ServiceDocumentStructure | null;
  libraryId?: string;
  country?: string | null;
  canManage?: boolean;
};

export function ServiceDocumentStructureTab({
  structure,
  libraryId,
  country,
  canManage,
}: Props) {
  const adminUrl =
    libraryId ? serviceLibraryDocumentStructureAdminUrl(libraryId, country) : null;

  if (!structure?.sections.length) {
    return (
      <Card className="p-5 shadow-elev-sm space-y-4">
        <p className="text-sm text-muted-foreground">
          No document structure configured yet for this service. Default client document requirements are
          managed here — sections, document types, required/optional flags, and order.
        </p>
        {canManage && adminUrl ? (
          <Button asChild className="gradient-brand text-primary-foreground">
            <Link to={adminUrl}>
              <FolderTree className="size-4 mr-1.5" />
              Configure document structure
            </Link>
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Ask an administrator to configure sections and default documents in{" "}
            <strong>Service Library Admin → Document structure</strong>.
          </p>
        )}
      </Card>
    );
  }

  const sections = [...structure.sections]
    .filter((s) => s.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  const hasActiveDocs = sections.some((s) => s.documents.some((d) => d.is_active));

  return (
    <div className="space-y-4">
      <Card className="p-4 shadow-elev-sm bg-muted/20 border-dashed">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-sm text-muted-foreground flex-1 min-w-[200px]">
            Default document requirements for this service. When a client enrolls, active documents below are
            seeded into the case Documents tab in this order. Counselors may still add case-specific documents
            manually.
          </p>
          {canManage && adminUrl ? (
            <Button variant="outline" size="sm" asChild className="shrink-0">
              <Link to={adminUrl}>
                <ExternalLink className="size-3.5 mr-1.5" />
                Edit in admin
              </Link>
            </Button>
          ) : null}
        </div>
      </Card>

      {!hasActiveDocs ? (
        <Card className="p-5 shadow-elev-sm">
          <p className="text-sm text-muted-foreground mb-3">
            Sections exist but no active documents are configured yet.
          </p>
          {canManage && adminUrl ? (
            <Button asChild size="sm">
              <Link to={adminUrl}>Add documents</Link>
            </Button>
          ) : null}
        </Card>
      ) : null}

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
