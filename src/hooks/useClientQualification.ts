import { useCallback, useEffect, useState } from "react";
import {
  fetchQualificationBundle,
  fetchQualificationsForCase,
} from "@/lib/qualification/qualificationApi";
import type {
  QualificationDepositTrack,
  QualificationEvent,
  QualificationRecord,
  QualificationTuitionTrack,
} from "@/lib/qualification/types";

export function useClientQualification(
  clientId: string | undefined,
  caseId: string | undefined,
  refreshKey = 0,
) {
  const [qualifications, setQualifications] = useState<QualificationRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [depositTrack, setDepositTrack] = useState<QualificationDepositTrack | null>(null);
  const [tuitionTrack, setTuitionTrack] = useState<QualificationTuitionTrack | null>(null);
  const [events, setEvents] = useState<QualificationEvent[]>([]);
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
      setDepositTrack(null);
      setTuitionTrack(null);
      setEvents([]);
      return;
    }
    setDetailLoading(true);
    try {
      const bundle = await fetchQualificationBundle(qualificationId);
      if (!bundle) return;
      setDepositTrack(bundle.depositTrack);
      setTuitionTrack(bundle.tuitionTrack);
      setEvents(bundle.events);
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
    depositTrack,
    tuitionTrack,
    events,
    loading,
    detailLoading,
    reload,
  };
}
