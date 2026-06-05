export type CallDaily = {
  day: string;
  agent_id?: string | null;
  answered: number;
  unanswered: number;
  total_calls: number;
  avg_duration: number;
};

export type FunnelRow = {
  temperature: string | null;
  stage: string | null;
  leads: number;
};

export type StageDist = {
  pipeline_id: string;
  pipeline_name: string;
  country: string;
  service_category: string;
  stage_id: string;
  stage_key: string;
  stage_label: string;
  sort_order: number;
  client_count: number;
};

export type AgingRow = {
  invoice_id: string;
  balance_due: number | null;
  aging_bucket: string | null;
  currency: string | null;
};

export type TelecallerRow = {
  user_id: string;
  name: string | null;
  calls: number;
  talk_seconds: number;
  answered: number;
  callbacks_pending: number;
};

export type TaskDueRow = {
  id: string;
  title: string;
  due_at: string | null;
  priority: string;
  status: string;
  client_id: string;
  clients: { full_name: string | null } | null;
};

export type RecentClientRow = {
  id: string;
  full_name: string | null;
  application_id: string | null;
  country: string | null;
  application_type: string | null;
};

export type CounselorRow = {
  user_id: string;
  name: string | null;
  handoffs_accepted: number;
  tasks_done: number;
  enrollments: number;
};

export type OfferRoiRow = {
  offer_id: string;
  title: string;
  redemptions: number;
  influenced_revenue: number;
};

export type StatusCount = {
  status: string;
  count: number;
};

export type DashboardV2Data = {
  clients: number;
  hotLeads: number;
  totalLeads: number;
  totalCalls: number;
  answerRate: number;
  outstandingAr: number;
  overdueInvoices: number;
  overdueTasks: number;
  upcomingBookings: number;
  whatsappQueue: number;
  calls: CallDaily[];
  funnel: FunnelRow[];
  stageDist: StageDist[];
  aging: AgingRow[];
  tasksDue: TaskDueRow[];
  recentClients: RecentClientRow[];
  telecallers: TelecallerRow[];
  upi: {
    institutions: number;
    partners: number;
    coursesPending: number;
    suggestionsPending: number;
  };
  admissions: {
    enrollments: number;
    newApplications30d: number;
    finalPrograms: number;
    leadConversionPct: number;
    openFormalLeads: number;
    studyPermits: number;
    assessmentsCompleted: number;
  };
  revenue: {
    collected30d: number;
    invoiced30d: number;
    collectionRatePct: number;
    offerInfluencedRevenue: number;
    commissionExpected: number;
    activeOffers: number;
  };
  applicationsByStatus: StatusCount[];
  counselors: CounselorRow[];
  offerRoiTop: OfferRoiRow[];
};
