import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { DocumentRequirementRow } from "@/components/documents/DocumentRequirementRow";
import type { DocumentSectionGroup, EnrichedRequirement } from "@/lib/documentWorkflow/buildEnrichedRequirements";
import type { CaseSection } from "@/lib/sections";

interface Props {
  groups: DocumentSectionGroup[];
  clientId: string;
  caseId: string | null;
  sections: CaseSection[];
  canUpload: boolean;
  expandedSections: string[];
  onExpandedChange: (keys: string[]) => void;
  highlightRequirementId: string | null;
  onChanged: () => void;
}

export function DocumentSectionAccordion({
  groups,
  clientId,
  caseId,
  sections,
  canUpload,
  expandedSections,
  onExpandedChange,
  highlightRequirementId,
  onChanged,
}: Props) {
  if (groups.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        No document requirements yet. Defaults are created when a service is activated.
      </Card>
    );
  }

  return (
    <Accordion
      type="multiple"
      value={expandedSections}
      onValueChange={onExpandedChange}
      className="space-y-2"
    >
      {groups.map((group) => {
        const missingCount = group.requirements.filter((r) => r.displayStatus === "missing" && r.mandatory).length;
        return (
          <AccordionItem key={group.sectionKey} value={group.sectionKey} className="border rounded-lg shadow-elev-sm bg-card">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-2 text-left">
                <span className="font-semibold text-sm">{group.sectionLabel}</span>
                <span className="text-xs text-muted-foreground">
                  {group.requirements.length} item{group.requirements.length === 1 ? "" : "s"}
                  {missingCount > 0 ? ` · ${missingCount} missing` : ""}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-0">
              {group.requirements.map((req: EnrichedRequirement) => (
                <DocumentRequirementRow
                  key={req.id}
                  requirement={req}
                  clientId={clientId}
                  caseId={caseId}
                  sections={sections}
                  canUpload={canUpload}
                  highlight={highlightRequirementId === req.id}
                  onChanged={onChanged}
                />
              ))}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
