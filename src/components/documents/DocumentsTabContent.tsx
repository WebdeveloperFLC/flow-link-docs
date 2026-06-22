import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AddDocTypeDialog, type AddDocumentRequirementInput } from "@/components/clients/AddDocTypeDialog";
import { DocumentRequirementRow } from "@/components/documents/DocumentRequirementRow";
import { DocumentSectionAccordion } from "@/components/documents/DocumentSectionAccordion";
import { DocumentsProgressSummary } from "@/components/documents/DocumentsProgressSummary";
import { SuggestedDocumentsPanel } from "@/components/documents/SuggestedDocumentsPanel";
import {
  DocumentsToolbar,
  type DocumentsFilterMode,
  type DocumentsViewMode,
} from "@/components/documents/DocumentsToolbar";
import { MissingRequiredChips } from "@/components/documents/MissingRequiredChips";
import { useCaseDocumentWorkflow } from "@/hooks/documentWorkflow/useCaseDocumentWorkflow";
import {
  addCaseDocumentRequirement,
  MANUAL_ADD_SECTION_KEY,
} from "@/lib/documentWorkflow/addCaseDocumentRequirement";
import type { EnrichedRequirement } from "@/lib/documentWorkflow/buildEnrichedRequirements";
import { groupRequirementsByCounselorSection } from "@/lib/documentWorkflow/buildEnrichedRequirements";
import { resolveServiceDocumentProfile } from "@/lib/documentWorkflow/resolveServiceDocumentProfile";
import type { RequirementDisplayStatus } from "@/lib/documentWorkflow/resolveDisplayStatus";
import {
  buildSuggestedDocumentPlan,
  PROFILE_SUGGEST_NOTE,
  sectionForDocumentCode,
  type ClientProfileSignals,
} from "@/lib/documentWorkflow/visaDocumentProfiles";
import type { CaseSection } from "@/lib/sections";
import { logActivity } from "@/lib/activity";
import { toast } from "sonner";

interface Props {
  clientId: string;
  caseId: string | null;
  sections: CaseSection[];
  canUpload: boolean;
  templateName?: string | null;
  serviceCode?: string | null;
  clientSignals?: ClientProfileSignals;
  refreshKey: number | string;
  onChanged: () => void;
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
  templateName,
  serviceCode,
  clientSignals,
  refreshKey,
  onChanged,
  onMissingCountChange,
}: Props) {
  const documentProfile = useMemo(() => {
    if (!serviceCode) return null;
    const resolved = resolveServiceDocumentProfile(serviceCode);
    return {
      profileType: resolved.profileType,
      country: resolved.country,
    };
  }, [serviceCode]);

  const { loading, error, requirements, progress, missingMandatory, labelByCode, reload } =
    useCaseDocumentWorkflow(clientId, caseId, refreshKey);

  const [addDocOpen, setAddDocOpen] = useState(false);
  const [viewMode, setViewMode] = useState<DocumentsViewMode>("section");
  const [filterMode, setFilterMode] = useState<DocumentsFilterMode>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [highlightRequirementId, setHighlightRequirementId] = useState<string | null>(null);
  const [acceptingCode, setAcceptingCode] = useState<string | null>(null);

  const existingCodes = useMemo(
    () => new Set(requirements.map((r) => r.master_item_code)),
    [requirements],
  );

  const catalogueCodes = useMemo(() => new Set(labelByCode.keys()), [labelByCode]);

  const suggestedDocuments = useMemo(() => {
    if (!documentProfile) return [];
    return buildSuggestedDocumentPlan(
      documentProfile,
      clientSignals ?? {},
      catalogueCodes,
      existingCodes,
    );
  }, [documentProfile, clientSignals, catalogueCodes, existingCodes]);

  const filteredRequirements = useMemo(
    () =>
      requirements.filter(
        (r) => matchesFilter(r.displayStatus, filterMode) && matchesSearch(r, searchQuery),
      ),
    [requirements, filterMode, searchQuery],
  );

  const filteredSectionGroups = useMemo(
    () => groupRequirementsByCounselorSection(filteredRequirements),
    [filteredRequirements],
  );

  const checklistRequirements = useMemo(
    () =>
      requirements.map((r) => ({
        master_item_code: r.master_item_code,
        display_name: r.display_name,
      })),
    [requirements],
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

  const handleAddRequirement = useCallback(
    async (input: AddDocumentRequirementInput) => {
      if (!caseId) return;
      const result = await addCaseDocumentRequirement({
        caseId,
        masterItemCode: input.masterItemCode,
        mandatory: input.mandatory,
        notes: input.notes ?? null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      await logActivity("client.extra_item_added", "client", clientId, {
        type: input.label,
        master_item_code: input.masterItemCode,
        mandatory: input.mandatory,
        source: "adr_manual_add",
      });
      toast.success(`Added "${input.label}" to Other Documents`);
      setFilterMode("all");
      setSearchQuery("");
      setViewMode("section");
      setExpandedSections((prev) => {
        const keys = new Set([...prev, MANUAL_ADD_SECTION_KEY, "other_documents"]);
        return Array.from(keys);
      });
      await reload();
      onChanged();
      setHighlightRequirementId(result.requirementId);
      window.setTimeout(() => {
        document.getElementById(`req-${result.requirementId}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 200);
      window.setTimeout(() => setHighlightRequirementId(null), 2500);
    },
    [caseId, clientId, reload, onChanged],
  );

  const handleAcceptSuggestion = useCallback(
    async (code: string) => {
      if (!caseId) return;
      setAcceptingCode(code);
      const section = sectionForDocumentCode(code);
      const result = await addCaseDocumentRequirement({
        caseId,
        masterItemCode: code,
        mandatory: false,
        sectionKey: section.key,
        sectionLabel: section.label,
        notes: PROFILE_SUGGEST_NOTE,
      });
      setAcceptingCode(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const label = labelByCode.get(code) ?? code;
      toast.success(`Added suggested document "${label}"`);
      await reload();
      onChanged();
    },
    [caseId, labelByCode, reload, onChanged],
  );

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
          {canUpload ? (
            <Button size="sm" variant="outline" onClick={() => setAddDocOpen(true)}>
              <Plus className="size-3.5 mr-1" /> Add document
            </Button>
          ) : null}
        </div>
      </div>

      <AddDocTypeDialog
        open={addDocOpen}
        onOpenChange={setAddDocOpen}
        checklistRequirements={checklistRequirements}
        serviceCode={serviceCode}
        templateName={templateName}
        onAdd={handleAddRequirement}
      />

      <DocumentsProgressSummary progress={progress} templateName={templateName} />

      <MissingRequiredChips items={missingMandatory} onJump={handleJump} />

      <SuggestedDocumentsPanel
        suggestions={suggestedDocuments}
        labelByCode={labelByCode}
        canUpload={canUpload}
        busyCode={acceptingCode}
        onAccept={handleAcceptSuggestion}
      />

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
            <div className="p-6 text-center text-sm text-muted-foreground">
              {requirements.length === 0
                ? "No document requirements yet. Defaults are created when a service is activated."
                : "No documents match your filters."}
            </div>
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
