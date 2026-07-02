/** User-facing dashboard KPI tooltips. */

export const DASHBOARD_MIGRATION_MESSAGE =
  "These metrics reflect your CRM workspace — leads, clients, tasks, and billing activity recorded here.";

export const KPI_TOOLTIPS = {
  totalClients: "All client profiles in your CRM workspace.",
  hotLeads: "Clients with hot lead temperature from telephony or import.",
  outstandingAr: "Sum of open invoice balances in the CRM. Amounts may span multiple currencies without FX conversion.",
  enrollments: "Clients marked enrolled or visa approved. Requires counselors to update status here.",
  newApps30d: "Client profiles created in the last 30 days.",
  studyPermits: "Clients with a study permit number on file.",
  leadConversion: "Conversion rate from the Leads module.",
  openLeads: "Open rows in the Leads module.",
  collected30d: "Invoice payments recorded in the last 30 days.",
  invoiced30d: "Invoices created in the last 30 days. Multi-currency amounts are summed without FX conversion.",
  collectionRate: "Paid amount divided by billed amount across all active invoices (not limited to 30 days).",
  offerRevenue: "Revenue attributed to offers via invoices and events.",
  commissionExpected: "Sum of expected commission from all UPI claim cycles, including drafts.",
  pendingHandoffs: "Handoffs assigned to you awaiting action.",
  countryIntake: "Top destination countries and intakes by client count. Full table on Reports.",
  odooHealth: "Legacy sync visibility for administrators.",
  arAgingChart: "Outstanding balances grouped by aging bucket from CRM invoices.",
  appsByStatus: "Distribution of client application statuses.",
  pipelineStages: "Clients per pipeline stage for CRM-managed applications.",
} as const;
