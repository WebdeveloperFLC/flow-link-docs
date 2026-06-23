import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { UpiPartnershipRoute } from "@/institutions/types/partnership";
import {
  fetchInstitutionFeeSchedule,
  fetchPartnershipRoutesForInstitution,
} from "@/institutions/lib/institutionFeeSchedule";
import {
  resolveInstitutionFees,
  type InstitutionFeeResolution,
  type InstitutionFeeScheduleRow,
} from "@/lib/feeMaster/institutionScheduleResolver";
import type { ProgramFeeSource } from "@/lib/feeMaster/institutionScheduleResolver";
import type { InstitutionFeeType } from "@/lib/feeMaster/institutionFeeTypes";

export type UseResolvedInstitutionFeesArgs = {
  institutionId: string | null | undefined;
  cfCourseId?: string | null;
  partnershipRouteId?: string | null;
  program?: ProgramFeeSource | null;
  feeTypes?: InstitutionFeeType[];
  enabled?: boolean;
};

export type UseResolvedInstitutionFeesResult = {
  loading: boolean;
  error: string | null;
  resolutions: InstitutionFeeResolution[];
  scheduleRows: InstitutionFeeScheduleRow[];
  routes: UpiPartnershipRoute[];
  selectedRoute: UpiPartnershipRoute | null;
  reload: () => void;
};

function mapScheduleRow(row: Awaited<ReturnType<typeof fetchInstitutionFeeSchedule>>[number]): InstitutionFeeScheduleRow {
  return { ...row };
}

/**
 * Load schedule + routes and run the institution fee resolver for counselor/admin preview.
 */
export function useResolvedInstitutionFees({
  institutionId,
  cfCourseId,
  partnershipRouteId,
  program,
  feeTypes,
  enabled = true,
}: UseResolvedInstitutionFeesArgs): UseResolvedInstitutionFeesResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleRows, setScheduleRows] = useState<InstitutionFeeScheduleRow[]>([]);
  const [routes, setRoutes] = useState<UpiPartnershipRoute[]>([]);
  const [programSource, setProgramSource] = useState<ProgramFeeSource | null>(program ?? null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setProgramSource(program ?? null);
  }, [program]);

  useEffect(() => {
    if (!enabled || !institutionId) {
      setScheduleRows([]);
      setRoutes([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [schedule, routeRows] = await Promise.all([
          fetchInstitutionFeeSchedule(institutionId),
          fetchPartnershipRoutesForInstitution(institutionId),
        ]);
        if (cancelled) return;

        let nextProgram = program ?? null;
        if (cfCourseId && !nextProgram) {
          const { data: course } = await supabase
            .from("cf_courses")
            .select("id, name, tuition_fee, application_fee, currency")
            .eq("id", cfCourseId)
            .maybeSingle();
          if (course) {
            nextProgram = {
              cf_course_id: course.id,
              tuition_fee: course.tuition_fee != null ? Number(course.tuition_fee) : null,
              application_fee: course.application_fee != null ? Number(course.application_fee) : null,
              currency: course.currency,
              label: course.name,
              fee_accuracy: "AI_DETECTED",
              verification_method: "AI_DETECTED",
            };
          }
        }

        if (cancelled) return;
        setScheduleRows(schedule.map(mapScheduleRow));
        setRoutes(routeRows as UpiPartnershipRoute[]);
        setProgramSource(nextProgram);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load institution fees");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, institutionId, cfCourseId, program, tick]);

  const selectedRoute = useMemo(() => {
    if (!routes.length) return null;
    if (partnershipRouteId) {
      return routes.find((r) => r.id === partnershipRouteId) ?? null;
    }
    return routes.find((r) => r.is_default_route) ?? routes[0] ?? null;
  }, [routes, partnershipRouteId]);

  const resolutions = useMemo(
    () =>
      institutionId
        ? resolveInstitutionFees(
            {
              route: selectedRoute,
              program: programSource,
              scheduleRows,
            },
            feeTypes,
          )
        : [],
    [institutionId, selectedRoute, programSource, scheduleRows, feeTypes],
  );

  return {
    loading,
    error,
    resolutions,
    scheduleRows,
    routes,
    selectedRoute,
    reload: () => setTick((t) => t + 1),
  };
}
