import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  fetchQualificationBundle,
  fetchQualificationsForCase,
} from "@/lib/qualification/qualificationApi";
import type {
  ApplicationMilestones,
  ApplicationOffer,
  ApplicationReference,
  QualificationEvent,
  QualificationRecord,
} from "@/lib/qualification/types";

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}

export function useClientQualification(
  clientId: string | undefined,
  caseId: string | undefined,
  refreshKey = 0,
  initialApplicationId?: string | null,
) {
  const [qualifications, setQualifications] = useState<QualificationRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [offer, setOffer] = useState<ApplicationOffer | null>(null);
  const [milestones, setMilestones] = useState<ApplicationMilestones | null>(null);
  const [events, setEvents] = useState<QualificationEvent[]>([]);
  const [references, setReferences] = useState<ApplicationReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [listLoadFailed, setListLoadFailed] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    if (!clientId || !caseId) {
      setQualifications([]);
      setListLoadFailed(false);
      setListError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setListLoadFailed(false);
    setListError(null);
    try {
      const rows = await fetchQualificationsForCase(clientId, caseId);
      setQualifications(rows);
      setSelectedId((prev) => {
        if (initialApplicationId && rows.some((r) => r.id === initialApplicationId)) {
          return initialApplicationId;
        }
        if (prev && rows.some((r) => r.id === prev)) return prev;
        return rows[0]?.id ?? null;
      });
    } catch (error) {
      const message = errorMessage(error, "Failed to load applications");
      console.error("[useClientQualification] loadList failed", error);
      toast.error(message);
      setListLoadFailed(true);
      setListError(message);
      setQualifications([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  }, [clientId, caseId, initialApplicationId]);

  const loadDetail = useCallback(async (qualificationId: string | null) => {
    if (!qualificationId) {
      setOffer(null);
      setMilestones(null);
      setEvents([]);
      setReferences([]);
      return;
    }
    setDetailLoading(true);
    try {
      const bundle = await fetchQualificationBundle(qualificationId);
      if (!bundle) return;
      setOffer(bundle.offer);
      setMilestones(bundle.milestones);
      setEvents(bundle.events);
      setReferences(bundle.references);
      setQualifications((prev) =>
        prev.map((q) => (q.id === bundle.qualification.id ? bundle.qualification : q)),
      );
    } catch (error) {
      const message = errorMessage(error, "Failed to load application details");
      console.error("[useClientQualification] loadDetail failed", error);
      toast.error(message);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList, refreshKey]);

  useEffect(() => {
    void loadDetail(selectedId);
  }, [selectedId, loadDetail, refreshKey]);

  const selected = qualifications.find((q) => q.id === selectedId) ?? null;

  const reload = useCallback(async () => {
    await loadList();
    if (selectedId) await loadDetail(selectedId);
  }, [loadList, loadDetail, selectedId]);

  return {
    qualifications,
    selected,
    selectedId,
    setSelectedId,
    offer,
    milestones,
    events,
    references,
    loading,
    detailLoading,
    listLoadFailed,
    listError,
    reload,
  };
}
