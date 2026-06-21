import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DocumentRequirementRow } from "@/components/documents/DocumentRequirementRow";
import { DocumentSectionAccordion } from "@/components/documents/DocumentSectionAccordion";
import { DocumentsProgressSummary } from "@/components/documents/DocumentsProgressSummary";
import {
  DocumentsToolbar,
  type DocumentsFilterMode,
  type DocumentsViewMode,
} from "@/components/documents/DocumentsToolbar";
import { MissingRequiredChips } from "@/components/documents/MissingRequiredChips";
import { useCaseDocumentWorkflow } from "@/hooks/documentWorkflow/useCaseDocumentWorkflow";
import type { EnrichedRequirement } from "@/lib/documentWorkflow/buildEnrichedRequirements";
import { groupRequirementsBySection } from "@/lib/documentWorkflow/buildEnrichedRequirements";
import type { RequirementDisplayStatus } from "@/lib/documentWorkflow/resolveDisplayStatus";
import type { CaseSection } from "@/lib/sections";

interface Props {
  clientId: string;
  caseId: string | null;
  sections: CaseSection[];
  canUpload: boolean;
  isAdmin: boolean;
  templateName?: string | null;
  refreshKey: number | string;
  onChanged: () => void;
  onAddDocument?: () => void;
  onMissingCountChange?: (count: number) => void;
}

function matchesFilter(status: RequirementDisplayStatus, filter: DocumentsFilterMode): boolean {
  if (filter === "all") return true;
  if (filter === "missing") return status === "missing";
  if (filter === "uploaded") return status === "uploaded" || status === "under_review";
  if (filter === "approved") return status === "approved";
  if (filter === "need_replacement") return status === "need_replacement" || status === "rejected";
  return true;
}

function matchesSearch(req: EnrichedRequirement, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  return (
    req.display_name.toLowerCase().includes(q) ||
    req.master_item_code.toLowerCase().includes(q) ||
    (req.matchedDocument?.file_name.toLowerCase().includes(q) ?? false)
  );
}

export function DocumentsTabContent({
  clientId,
  caseId,
  sections,
  canUpload,
  isAdmin,
  templateName,
  refreshKey,
  onChanged,
  onAddDocument,
  onMissingCountChange,
}: Props) {
  const { loading, error, requirements, sectionGroups, progress, missingMandatory, reload } =
    useCaseDocumentWorkflow(clientId, caseId, refreshKey);

  const [viewMode, setViewMode] = useState<DocumentsViewMode>("section");
  const [filterMode, setFilterMode] = useState<DocumentsFilterMode>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [highlightRequirementId, setHighlightRequirementId] = useState<string | null>(null);

  const filteredRequirements = useMemo(
    () =>
      requirements.filter(
        (r) => matchesFilter(r.displayStatus, filterMode) && matchesSearch(r, searchQuery),
      ),
    [requirements, filterMode, searchQuery],
  );

  const filteredSectionGroups = useMemo(
    () => groupRequirementsBySection(filteredRequirements),
    [filteredRequirements],
  );

  const activeExpanded =
    expandedSections.length > 0
      ? expandedSections
      : filteredSectionGroups.map((g) => g.sectionKey);

  useEffect(() => {
    onMissingCountChange?.(missingMandatory.length);
  }, [missingMandatory.length, onMissingCountChange]);

  const handleJump = useCallback(
    (requirementId: string, sectionKey: string) => {
      setViewMode("section");
      setExpandedSections((prev) =>
        prev.includes(sectionKey) ? prev : [...prev, sectionKey],
      );
      setHighlightRequirementId(requirementId);
      window.setTimeout(() => {
        document.getElementById(`req-${requirementId}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 150);
      window.setTimeout(() => setHighlightRequirementId(null), 2500);
    },
    [],
  );

  const handleChanged = useCallback(async () => {
    await reload();
    onChanged();
  }, [reload, onChanged]);

  if (!caseId) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        Select an active service case to view document requirements.
      </Card>
    );
  }

  if (loading && requirements.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" />
        Loading document checklist…
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center text-sm text-destructive">
        {error}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="font-semibold text-sm">Case documents</div>
        <div className="flex items-center gap-2">
          {canUpload && onAddDocument ? (
            <Button size="sm" variant="outline" onClick={onAddDocument}>
              <Plus className="size-3.5 mr-1" /> Add document
            </Button>
          ) : null}
        </div>
      </div>

      <DocumentsProgressSummary progress={progress} templateName={templateName} />

      <MissingRequiredChips items={missingMandatory} onJump={handleJump} />

      <DocumentsToolbar
        viewMode={viewMode}
        filterMode={filterMode}
        searchQuery={searchQuery}
        onViewModeChange={setViewMode}
        onFilterModeChange={setFilterMode}
        onSearchChange={setSearchQuery}
      />

      {viewMode === "party" ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Party view is planned for Phase 2B. Use Section or Flat view for now.
        </Card>
      ) : viewMode === "flat" ? (
        <Card className="overflow-hidden shadow-elev-sm">
          {filteredRequirements.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No documents match your filters.</div>
          ) : (
            filteredRequirements.map((req) => (
              <DocumentRequirementRow
                key={req.id}
                requirement={req}
                clientId={clientId}
                caseId={caseId}
                sections={sections}
                canUpload={canUpload}
                highlight={highlightRequirementId === req.id}
                onChanged={handleChanged}
              />
            ))
          )}
        </Card>
      ) : (
        <DocumentSectionAccordion
          groups={filteredSectionGroups}
          clientId={clientId}
          caseId={caseId}
          sections={sections}
          canUpload={canUpload}
          expandedSections={activeExpanded}
          onExpandedChange={setExpandedSections}
          highlightRequirementId={highlightRequirementId}
          onChanged={handleChanged}
        />
      )}
    </div>
  );
}
