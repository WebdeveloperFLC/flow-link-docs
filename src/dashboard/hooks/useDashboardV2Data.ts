import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  aggregateClientStatuses,
  computeArTotals,
  computeCallKpis,
  computeCollectionRatePct,
  computeLeadConversionPct,
  computeLeadTotals,
  sumAmounts,
  sumOfferInfluencedRevenue,
} from "../lib/aggregations";
import type {
  AgingRow,
  CallDaily,
  CounselorRow,
  DashboardV2Data,
  FunnelRow,
  OfferRoiRow,
  RecentClientRow,
  StageDist,
  TaskDueRow,
  TelecallerRow,
} from "../types";

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

function daysAgoTimestamp(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

function daysAheadIso(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

async function fetchDashboardV2Data(): Promise<DashboardV2Data> {
  const since30 = daysAgoIso(30);
  const since30Ts = daysAgoTimestamp(30);
  const today = new Date().toISOString().slice(0, 10);
  const weekEnd = daysAheadIso(7);
  const now = new Date().toISOString();

  const [
    clientsRes,
    callsRes,
    funnelRes,
    stageDistRes,
    agingRes,
    overdueTasksRes,
    tasksDueRes,
    bookingsRes,
    waQueueRes,
    recentRes,
    telecallersRes,
    institutionsRes,
    partnersRes,
    coursesRes,
    suggestionsRes,
    enrollmentsRes,
    newAppsRes,
    finalProgramsRes,
    formalLeadsTotalRes,
    formalLeadsConvertedRes,
    openFormalLeadsRes,
    studyPermitsRes,
    assessmentsCompletedRes,
    clientStatusesRes,
    counselorsRes,
    offerRoiRes,
    collectedRes,
    invoicedRes,
    invoiceTotalsRes,
    activeOffersRes,
    commissionExpectedRes,
  ] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }),
    (supabase as any).from("vw_call_stats_daily").select("*").gte("day", since30).order("day"),
    (supabase as any).from("vw_lead_funnel").select("*"),
    (supabase as any).from("vw_stage_distribution").select("*").order("pipeline_name").order("sort_order"),
    supabase.from("client_invoice_aging").select("invoice_id, balance_due, aging_bucket, currency").gt("balance_due", 0),
    supabase.from("client_tasks").select("*", { count: "exact", head: true }).neq("status", "done").lt("due_at", now),
    supabase
      .from("client_tasks")
      .select("id, title, due_at, priority, status, client_id, clients(full_name)")
      .neq("status", "done")
      .not("due_at", "is", null)
      .order("due_at", { ascending: true })
      .limit(8),
    (supabase as any)
      .from("calendar_events")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "scheduled"])
      .gte("event_date", today)
      .lte("event_date", weekEnd),
    (supabase as any)
      .from("whatsapp_conversations")
      .select("*", { count: "exact", head: true })
      .in("status", ["unmatched_ai_intake", "awaiting_assignment_confirm", "escalated_admin"]),
    supabase
      .from("clients")
      .select("id, full_name, application_id, country, application_type")
      .order("created_at", { ascending: false })
      .limit(5),
    (supabase as any).from("vw_telecaller_productivity").select("*").order("calls", { ascending: false }).limit(5),
    supabase.from("upi_institutions").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("upi_institutions").select("*", { count: "exact", head: true }).eq("is_partner", true),
    supabase.from("upi_courses_staging").select("*", { count: "exact", head: true }).eq("review_status", "pending_review"),
    supabase.from("upi_ai_suggestions").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("clients").select("*", { count: "exact", head: true }).in("status", ["enrolled", "visa_approved"]),
    supabase.from("clients").select("*", { count: "exact", head: true }).gte("created_at", since30Ts),
    supabase.from("cf_client_programs").select("*", { count: "exact", head: true }).eq("status", "final"),
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("*", { count: "exact", head: true }).not("converted_to_client_id", "is", null),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .not("status", "in", '("converted","lost","unqualified")'),
    supabase.from("clients").select("*", { count: "exact", head: true }).not("study_permit_number", "is", null),
    supabase.from("assessment_sessions").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("clients").select("status"),
    (supabase as any)
      .from("vw_counselor_productivity")
      .select("*")
      .order("enrollments", { ascending: false })
      .limit(8),
    supabase.rpc("offer_roi_stats", { _date_from: since30, _date_to: null }),
    supabase
      .from("client_invoice_payments")
      .select("amount, is_refund")
      .gte("paid_at", since30Ts)
      .or("is_refund.is.null,is_refund.eq.false"),
    supabase
      .from("client_invoices")
      .select("amount")
      .gte("created_at", since30Ts)
      .not("status", "eq", "draft"),
    supabase
      .from("client_invoices")
      .select("amount, amount_paid")
      .is("archived_at", null)
      .not("status", "in", '("draft","cancelled")'),
    supabase.from("offers").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("upi_claim_cycles").select("total_expected"),
  ]);

  const calls = (callsRes.data ?? []) as CallDaily[];
  const funnel = (funnelRes.data ?? []) as FunnelRow[];
  const aging = (agingRes.data ?? []) as AgingRow[];
  const { totalCalls, answerRate } = computeCallKpis(calls);
  const { hotLeads, totalLeads } = computeLeadTotals(funnel);
  const { outstandingAr, overdueInvoices } = computeArTotals(aging);

  const formalLeadsTotal = formalLeadsTotalRes.count ?? 0;
  const formalLeadsConverted = formalLeadsConvertedRes.count ?? 0;

  const offerRoiRows = ((offerRoiRes.data ?? []) as OfferRoiRow[]).slice(0, 5).map((row) => ({
    offer_id: row.offer_id,
    title: row.title,
    redemptions: Number(row.redemptions) || 0,
    influenced_revenue: Number(row.influenced_revenue) || 0,
  }));

  const commissionExpected = (commissionExpectedRes.data ?? []).reduce(
    (sum, row) => sum + (Number(row.total_expected) || 0),
    0,
  );

  return {
    clients: clientsRes.count ?? 0,
    hotLeads,
    totalLeads,
    totalCalls,
    answerRate,
    outstandingAr,
    overdueInvoices,
    overdueTasks: overdueTasksRes.count ?? 0,
    upcomingBookings: bookingsRes.count ?? 0,
    whatsappQueue: waQueueRes.count ?? 0,
    calls,
    funnel,
    stageDist: (stageDistRes.data ?? []) as StageDist[],
    aging,
    tasksDue: (tasksDueRes.data ?? []) as TaskDueRow[],
    recentClients: (recentRes.data ?? []) as RecentClientRow[],
    telecallers: (telecallersRes.data ?? []) as TelecallerRow[],
    upi: {
      institutions: institutionsRes.count ?? 0,
      partners: partnersRes.count ?? 0,
      coursesPending: coursesRes.count ?? 0,
      suggestionsPending: suggestionsRes.count ?? 0,
    },
    admissions: {
      enrollments: enrollmentsRes.count ?? 0,
      newApplications30d: newAppsRes.count ?? 0,
      finalPrograms: finalProgramsRes.count ?? 0,
      leadConversionPct: computeLeadConversionPct(formalLeadsTotal, formalLeadsConverted),
      openFormalLeads: openFormalLeadsRes.count ?? 0,
      studyPermits: studyPermitsRes.count ?? 0,
      assessmentsCompleted: assessmentsCompletedRes.count ?? 0,
    },
    revenue: {
      collected30d: sumAmounts(collectedRes.data ?? []),
      invoiced30d: sumAmounts(invoicedRes.data ?? []),
      collectionRatePct: computeCollectionRatePct(invoiceTotalsRes.data ?? []),
      offerInfluencedRevenue: sumOfferInfluencedRevenue(offerRoiRes.data ?? []),
      commissionExpected,
      activeOffers: activeOffersRes.count ?? 0,
    },
    applicationsByStatus: aggregateClientStatuses(clientStatusesRes.data ?? []),
    counselors: ((counselorsRes.data ?? []) as CounselorRow[]).map((row) => ({
      user_id: row.user_id,
      name: row.name,
      handoffs_accepted: Number(row.handoffs_accepted) || 0,
      tasks_done: Number(row.tasks_done) || 0,
      enrollments: Number(row.enrollments) || 0,
    })),
    offerRoiTop: offerRoiRows,
  };
}

export function useDashboardV2Data() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard-v2"],
    queryFn: fetchDashboardV2Data,
    enabled: !!user,
    staleTime: 60_000,
  });
}
