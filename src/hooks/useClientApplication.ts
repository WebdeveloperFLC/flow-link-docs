import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  fetchStudentApplicationBundle,
  fetchStudentApplicationsForCase,
} from "@/lib/application/applicationApi";
import type {
  ApplicationMilestones,
  ApplicationOffer,
  ApplicationReference,
  ApplicationTimelineEvent,
  StudentApplicationRecord,
} from "@/lib/application/types";

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}

export function useClientApplication(
  clientId: string | undefined,
  caseId: string | undefined,
  refreshKey = 0,
  initialApplicationId?: string | null,
) {
  const [applications, setApplications] = useState<StudentApplicationRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [offer, setOffer] = useState<ApplicationOffer | null>(null);
  const [milestones, setMilestones] = useState<ApplicationMilestones | null>(null);
  const [events, setEvents] = useState<ApplicationTimelineEvent[]>([]);
  const [references, setReferences] = useState<ApplicationReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [listLoadFailed, setListLoadFailed] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    if (!clientId || !caseId) {
      setApplications([]);
      setListLoadFailed(false);
      setListError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setListLoadFailed(false);
    setListError(null);
    try {
      const rows = await fetchStudentApplicationsForCase(clientId, caseId);
      setApplications(rows);
      setSelectedId((prev) => {
        if (initialApplicationId && rows.some((r) => r.id === initialApplicationId)) {
          return initialApplicationId;
        }
        if (prev && rows.some((r) => r.id === prev)) return prev;
        return rows[0]?.id ?? null;
      });
    } catch (error) {
      const message = errorMessage(error, "Failed to load applications");
      console.error("[useClientApplication] loadList failed", error);
      toast.error(message);
      setListLoadFailed(true);
      setListError(message);
      setApplications([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  }, [clientId, caseId, initialApplicationId]);

  const loadDetail = useCallback(async (applicationId: string | null) => {
    if (!applicationId) {
      setOffer(null);
      setMilestones(null);
      setEvents([]);
      setReferences([]);
      return;
    }
    setDetailLoading(true);
    try {
      const bundle = await fetchStudentApplicationBundle(applicationId);
      if (!bundle) return;
      setOffer(bundle.offer);
      setMilestones(bundle.milestones);
      setEvents(bundle.events);
      setReferences(bundle.references);
      setApplications((prev) =>
        prev.map((a) => (a.id === bundle.application.id ? bundle.application : a)),
      );
    } catch (error) {
      const message = errorMessage(error, "Failed to load application details");
      console.error("[useClientApplication] loadDetail failed", error);
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

  const selected = applications.find((a) => a.id === selectedId) ?? null;

  const reload = useCallback(async () => {
    await loadList();
    if (selectedId) await loadDetail(selectedId);
  }, [loadList, loadDetail, selectedId]);

  return {
    applications,
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
