import { useCallback, useEffect, useState } from "react";
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

export function useClientQualification(
  clientId: string | undefined,
  caseId: string | undefined,
  refreshKey = 0,
) {
  const [qualifications, setQualifications] = useState<QualificationRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [offer, setOffer] = useState<ApplicationOffer | null>(null);
  const [milestones, setMilestones] = useState<ApplicationMilestones | null>(null);
  const [events, setEvents] = useState<QualificationEvent[]>([]);
  const [references, setReferences] = useState<ApplicationReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadList = useCallback(async () => {
    if (!clientId || !caseId) {
      setQualifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchQualificationsForCase(clientId, caseId);
      setQualifications(rows);
      setSelectedId((prev) => {
        if (prev && rows.some((r) => r.id === prev)) return prev;
        return rows[0]?.id ?? null;
      });
    } finally {
      setLoading(false);
    }
  }, [clientId, caseId]);

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
    reload,
  };
}
