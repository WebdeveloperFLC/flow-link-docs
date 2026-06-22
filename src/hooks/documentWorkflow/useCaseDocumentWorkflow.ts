import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { ApplicationDocumentRequirement, CaseDocumentProgress } from "@/lib/documentWorkflow/types";
import type { WorkflowDocument } from "@/lib/documentWorkflow/workflowDocument";
import { filterUploadableDocumentRequirements } from "@/lib/documentWorkflow/uploadableRequirements";

export function useCaseDocumentWorkflow(
  clientId: string | undefined,
  caseId: string | null | undefined,
  refreshKey: number | string = 0,
) {
  const [requirements, setRequirements] = useState<ApplicationDocumentRequirement[]>([]);
  const [documents, setDocuments] = useState<WorkflowDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [labelByCode, setLabelByCode] = useState<Map<string, string>>(new Map());

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

      const [reqRes, docRes] = await Promise.all([
        supabase
          .from("application_document_requirements" as never)
          .select("*")
          .eq("client_service_case_id", caseId)
          .eq("is_suppressed", false)
          .eq("requirement_kind", "document")
          .order("sort_order"),
        docQuery,
      ]);

      if (reqRes.error) throw reqRes.error;
      if (docRes.error) throw docRes.error;

      let reqs = (reqRes.data ?? []) as unknown as ApplicationDocumentRequirement[];

      if (reqs.length === 0) {
        const { data: assigned, error: assignErr } = await supabase.rpc(
          "fn_assign_case_workflow_template",
          {
            p_case_id: caseId,
            p_template_id: null,
            p_rematerialize: true,
          },
        );
        if (!assignErr && assigned && (assigned as { ok?: boolean }).ok) {
          const { data: retry } = await supabase
            .from("application_document_requirements" as never)
            .select("*")
            .eq("client_service_case_id", caseId)
            .eq("is_suppressed", false)
            .eq("requirement_kind", "document")
            .order("sort_order");
          reqs = (retry ?? []) as unknown as ApplicationDocumentRequirement[];
        }
      }

      setRequirements(filterUploadableDocumentRequirements(reqs, catalogueCodes));
      setDocuments((docRes.data ?? []) as unknown as WorkflowDocument[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load document workflow");
    } finally {
      setLoading(false);
    }
  }, [clientId, caseId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

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
