import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchList } from "@/lib/masters";
import {
  buildEnrichedRequirements,
  computeCaseDocumentProgress,
  getMissingMandatory,
  groupRequirementsByCounselorSection,
  type DocumentSectionGroup,
  type EnrichedRequirement,
} from "@/lib/documentWorkflow/buildEnrichedRequirements";
import { ensureProfileDocumentRequirements } from "@/lib/documentWorkflow/ensureProfileDocumentRequirements";
import type { ApplicationDocumentRequirement, CaseDocumentProgress } from "@/lib/documentWorkflow/types";
import { filterUploadableDocumentRequirements } from "@/lib/documentWorkflow/uploadableRequirements";
import type {
  ClientProfileSignals,
  VisaProfileContext,
} from "@/lib/documentWorkflow/visaDocumentProfiles";
import type { WorkflowDocument } from "@/lib/documentWorkflow/workflowDocument";

export function useCaseDocumentWorkflow(
  clientId: string | undefined,
  caseId: string | null | undefined,
  refreshKey: number | string = 0,
  profileContext?: VisaProfileContext | null,
  clientSignals?: ClientProfileSignals | null,
) {
  const [requirements, setRequirements] = useState<ApplicationDocumentRequirement[]>([]);
  const [documents, setDocuments] = useState<WorkflowDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [labelByCode, setLabelByCode] = useState<Map<string, string>>(new Map());
  const ensureKeyRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!clientId) {
      setRequirements([]);
      setDocuments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const masterItems = await fetchList("document_types");
      const labels = new Map(masterItems.map((m) => [m.code, m.label]));
      const catalogueCodes = new Set(masterItems.filter((m) => m.is_active).map((m) => m.code));
      setLabelByCode(labels);

      const docQuery = supabase
        .from("client_documents")
        .select(
          "id, client_id, case_id, document_type, custom_type, master_item_code, file_name, storage_path, mime_type, size_bytes, status, version, is_active_version, is_shared, section_id, uploaded_at, deleted_at, person_id",
        )
        .eq("client_id", clientId)
        .is("deleted_at", null)
        .order("uploaded_at", { ascending: false });

      if (!caseId) {
        const { data: docs } = await docQuery;
        setDocuments((docs ?? []) as unknown as WorkflowDocument[]);
        setRequirements([]);
        setLoading(false);
        return;
      }

      const { data: docRes, error: docErr } = await docQuery;
      if (docErr) throw docErr;

      const fetchReqs = async () => {
        const { data, error: reqErr } = await supabase
          .from("application_document_requirements" as never)
          .select("*")
          .eq("client_service_case_id", caseId)
          .eq("is_suppressed", false)
          .eq("requirement_kind", "document")
          .order("sort_order");
        if (reqErr) throw reqErr;
        return (data ?? []) as unknown as ApplicationDocumentRequirement[];
      };

      let reqs = filterUploadableDocumentRequirements(await fetchReqs(), catalogueCodes);

      const ensureKey = `${caseId}:${refreshKey}:${profileContext?.serviceCode ?? ""}`;
      const shouldEnsure =
        profileContext &&
        ensureKeyRef.current !== ensureKey;

      if (shouldEnsure) {
        ensureKeyRef.current = ensureKey;
        const { added } = await ensureProfileDocumentRequirements({
          caseId,
          ctx: profileContext,
          signals: clientSignals ?? {},
          catalogueCodes,
          existing: reqs,
        });
        if (added > 0) {
          reqs = filterUploadableDocumentRequirements(await fetchReqs(), catalogueCodes);
        }
      }

      setRequirements(reqs);
      setDocuments((docRes ?? []) as unknown as WorkflowDocument[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load document workflow");
    } finally {
      setLoading(false);
    }
  }, [clientId, caseId, refreshKey, profileContext, clientSignals]);

  useEffect(() => {
    void load();
  }, [load]);

  const enriched = useMemo(
    () => buildEnrichedRequirements(requirements, documents, labelByCode),
    [requirements, documents, labelByCode],
  );

  const progress = useMemo(() => computeCaseDocumentProgress(enriched), [enriched]);
  const missingMandatory = useMemo(() => getMissingMandatory(enriched), [enriched]);
  const sectionGroups = useMemo(() => groupRequirementsByCounselorSection(enriched), [enriched]);

  return {
    loading,
    error,
    requirements: enriched,
    sectionGroups,
    progress,
    missingMandatory,
    reload: load,
  };
}

export type { DocumentSectionGroup, EnrichedRequirement, CaseDocumentProgress };
