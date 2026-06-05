import { supabase } from "@/integrations/supabase/client";
import {
  aggregateClientStatuses,
  computeArTotals,
  computeCollectionRatePct,
  computeLeadTotals,
  sumAmounts,
  sumOfferInfluencedRevenue,
} from "./aggregations";
import {
  DASHBOARD_ASSESSMENTS_KPI,
  DASHBOARD_OFFERS_WIDGETS,
  DASHBOARD_WHATSAPP_KPI,
} from "../config/featureFlags";
import type { ExecutiveMode, OperationsMode } from "../config/dashboardVisibility";
import type {
  AgingRow,
  CountryIntakeRow,
  DashboardExecutiveData,
  DashboardModuleData,
  DashboardOperationsData,
  FunnelRow,
  OdooHealth,
  OfferRoiRow,
  RecentClientRow,
  StageDist,
  TaskDueRow,
  TelecallerRow,
} from "../types";

const emptyCount = Promise.resolve({ count: 0, data: null, error: null });
const emptyRows = Promise.resolve({ data: [] as unknown[], error: null });

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

function daysAgoTimestamp(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

function daysAheadIso(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

export async function fetchDashboardExecutiveData(mode: ExecutiveMode): Promise<DashboardExecutiveData> {
  const since30 = daysAgoIso(30);
  const since30Ts = daysAgoTimestamp(30);

  const needAdmissions = mode === "full" || mode === "summary";
  const needRevenue = mode === "full" || mode === "revenue";
  const needCharts = mode === "full";
  const needPlanning = mode === "full";
  const since7Ts = daysAgoTimestamp(7);

  const [
    clientsRes,
    funnelRes,
    stageDistRes,
    agingRes,
    enrollmentsRes,
    newAppsRes,
    studyPermitsRes,
    clientStatusesRes,
    collectedRes,
    invoicedRes,
    invoiceTotalsRes,
    countryIntakeRes,
    odooCrmOnlyRes,
    odooLinkedRes,
    odooSynced7dRes,
  ] = await Promise.all([
    needAdmissions && mode === "summary"
      ? supabase.from("clients").select("*", { count: "exact", head: true })
      : emptyCount,
    needAdmissions ? (supabase as any).from("vw_lead_funnel").select("*") : emptyRows,
    needCharts
      ? (supabase as any).from("vw_stage_distribution").select("*").order("pipeline_name").order("sort_order")
      : emptyRows,
    needRevenue
      ? supabase.from("client_invoice_aging").select("invoice_id, balance_due, aging_bucket, currency").gt("balance_due", 0)
      : emptyRows,
    needAdmissions
      ? supabase.from("clients").select("*", { count: "exact", head: true }).in("status", ["enrolled", "visa_approved"])
      : emptyCount,
    needAdmissions
      ? supabase.from("clients").select("*", { count: "exact", head: true }).gte("created_at", since30Ts)
      : emptyCount,
    needAdmissions && mode === "full"
      ? supabase.from("clients").select("*", { count: "exact", head: true }).not("study_permit_number", "is", null)
      : emptyCount,
    needCharts ? supabase.from("clients").select("status") : emptyRows,
    needRevenue
      ? supabase
          .from("client_invoice_payments")
          .select("amount, is_refund")
          .gte("paid_at", since30Ts)
          .or("is_refund.is.null,is_refund.eq.false")
      : emptyRows,
    needRevenue
      ? supabase.from("client_invoices").select("amount").gte("created_at", since30Ts).not("status", "eq", "draft")
      : emptyRows,
    needRevenue
      ? supabase
          .from("client_invoices")
          .select("amount, amount_paid")
          .is("archived_at", null)
          .not("status", "in", '("draft","cancelled")')
      : emptyRows,
    needPlanning
      ? (supabase as any).from("vw_country_intake_trends").select("country, intake, leads").order("leads", { ascending: false }).limit(5)
      : emptyRows,
    needPlanning ? supabase.from("clients").select("*", { count: "exact", head: true }).is("odoo_lead_id", null) : emptyCount,
    needPlanning ? supabase.from("clients").select("*", { count: "exact", head: true }).not("odoo_lead_id", "is", null) : emptyCount,
    needPlanning
      ? supabase.from("clients").select("*", { count: "exact", head: true }).gte("odoo_synced_at", since7Ts)
      : emptyCount,
  ]);

  const funnel = (funnelRes.data ?? []) as FunnelRow[];
  const aging = (agingRes.data ?? []) as AgingRow[];
  const { hotLeads, totalLeads } = computeLeadTotals(funnel);
  const { outstandingAr, overdueInvoices } = computeArTotals(aging);

  const odooHealth: OdooHealth | null = needPlanning
    ? {
        crmOnly: odooCrmOnlyRes.count ?? 0,
        odooLinked: odooLinkedRes.count ?? 0,
        syncedLast7d: odooSynced7dRes.count ?? 0,
      }
    : null;

  return {
    clients: clientsRes.count ?? 0,
    hotLeads,
    totalLeads,
    outstandingAr,
    overdueInvoices,
    stageDist: (stageDistRes.data ?? []) as StageDist[],
    aging,
    admissions: {
      enrollments: enrollmentsRes.count ?? 0,
      newApplications30d: newAppsRes.count ?? 0,
      studyPermits: studyPermitsRes.count ?? 0,
    },
    revenue: {
      collected30d: sumAmounts(collectedRes.data ?? []),
      invoiced30d: sumAmounts(invoicedRes.data ?? []),
      collectionRatePct: computeCollectionRatePct(invoiceTotalsRes.data ?? []),
    },
    applicationsByStatus: aggregateClientStatuses(clientStatusesRes.data ?? []),
    countryIntakeTop: (countryIntakeRes.data ?? []) as CountryIntakeRow[],
    odooHealth,
  };
}

export async function fetchDashboardOperationsData(mode: OperationsMode): Promise<DashboardOperationsData> {
  if (mode === "none") {
    return {
      overdueTasks: 0,
      upcomingBookings: 0,
      pendingCallbacks: 0,
      pendingHandoffs: 0,
      tasksDue: [],
      recentClients: [],
      admissions: { finalPrograms: 0, openFormalLeads: 0, assessmentsCompleted: 0 },
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const weekEnd = daysAheadIso(7);
  const now = new Date().toISOString();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;

  const needFull = mode === "full";
  const needCounselor = mode === "counselor" || needFull;
  const needTelecaller = mode === "telecaller" || needFull;
  const needHandoffs = needCounselor || needTelecaller;

  const [
    overdueTasksRes,
    tasksDueRes,
    bookingsRes,
    recentRes,
    telecallersRes,
    finalProgramsRes,
    openFormalLeadsRes,
    assessmentsCompletedRes,
    pendingHandoffsRes,
  ] = await Promise.all([
    supabase.from("client_tasks").select("*", { count: "exact", head: true }).neq("status", "done").lt("due_at", now),
    supabase
      .from("client_tasks")
      .select("id, title, due_at, priority, status, client_id, clients(full_name)")
      .neq("status", "done")
      .not("due_at", "is", null)
      .order("due_at", { ascending: true })
      .limit(8),
    needCounselor
      ? (supabase as any)
          .from("calendar_events")
          .select("*", { count: "exact", head: true })
          .in("status", ["pending", "scheduled"])
          .gte("event_date", today)
          .lte("event_date", weekEnd)
      : emptyCount,
    needCounselor
      ? supabase
          .from("clients")
          .select("id, full_name, application_id, country, application_type")
          .order("created_at", { ascending: false })
          .limit(5)
      : emptyRows,
    needTelecaller || needFull
      ? (supabase as any).from("vw_telecaller_productivity").select("user_id, callbacks_pending")
      : emptyRows,
    needFull ? supabase.from("cf_client_programs").select("*", { count: "exact", head: true }).eq("status", "final") : emptyCount,
    needFull
      ? supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .not("status", "in", '("converted","lost","unqualified")')
      : emptyCount,
    needFull && DASHBOARD_ASSESSMENTS_KPI
      ? supabase.from("assessment_sessions").select("*", { count: "exact", head: true }).eq("status", "completed")
      : emptyCount,
    needHandoffs && userId
      ? supabase
          .from("lead_handoffs")
          .select("*", { count: "exact", head: true })
          .eq("to_user", userId)
          .eq("status", "pending")
      : emptyCount,
  ]);

  return {
    overdueTasks: overdueTasksRes.count ?? 0,
    upcomingBookings: bookingsRes.count ?? 0,
    pendingCallbacks: ((telecallersRes.data ?? []) as TelecallerRow[]).reduce(
      (sum, row) => sum + (Number(row.callbacks_pending) || 0),
      0,
    ),
    pendingHandoffs: pendingHandoffsRes.count ?? 0,
    tasksDue: (tasksDueRes.data ?? []) as TaskDueRow[],
    recentClients: (recentRes.data ?? []) as RecentClientRow[],
    admissions: {
      finalPrograms: finalProgramsRes.count ?? 0,
      openFormalLeads: openFormalLeadsRes.count ?? 0,
      assessmentsCompleted: assessmentsCompletedRes.count ?? 0,
    },
  };
}

export async function fetchDashboardModuleData(): Promise<DashboardModuleData> {
  const since30 = daysAgoIso(30);

  const [
    institutionsRes,
    partnersRes,
    coursesRes,
    suggestionsRes,
    commissionExpectedRes,
    offerRoiRes,
    activeOffersRes,
    waQueueRes,
  ] = await Promise.all([
    supabase.from("upi_institutions").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("upi_institutions").select("*", { count: "exact", head: true }).eq("is_partner", true),
    supabase.from("upi_courses_staging").select("*", { count: "exact", head: true }).eq("review_status", "pending_review"),
    supabase.from("upi_ai_suggestions").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("upi_claim_cycles").select("total_expected"),
    DASHBOARD_OFFERS_WIDGETS
      ? supabase.rpc("offer_roi_stats", { _date_from: since30, _date_to: null })
      : emptyRows,
    DASHBOARD_OFFERS_WIDGETS
      ? supabase.from("offers").select("*", { count: "exact", head: true }).eq("is_active", true)
      : emptyCount,
    DASHBOARD_WHATSAPP_KPI
      ? (supabase as any)
          .from("whatsapp_conversations")
          .select("*", { count: "exact", head: true })
          .in("status", ["unmatched_ai_intake", "awaiting_assignment_confirm", "escalated_admin"])
      : emptyCount,
  ]);

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
    whatsappQueue: waQueueRes.count ?? 0,
    upi: {
      institutions: institutionsRes.count ?? 0,
      partners: partnersRes.count ?? 0,
      coursesPending: coursesRes.count ?? 0,
      suggestionsPending: suggestionsRes.count ?? 0,
    },
    revenue: {
      commissionExpected,
      offerInfluencedRevenue: sumOfferInfluencedRevenue(offerRoiRes.data ?? []),
      activeOffers: activeOffersRes.count ?? 0,
    },
    offerRoiTop: offerRoiRows,
  };
}
