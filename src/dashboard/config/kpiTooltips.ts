/** CRM-only / migration caveats shown on dashboard KPI tooltips. */

export const DASHBOARD_MIGRATION_MESSAGE =
  "These metrics reflect CRM data only. Records managed in Odoo or outside this system are not included.";

export const KPI_TOOLTIPS = {
  totalClients: "All client profiles in the CRM. Does not include Odoo-only records.",
  hotLeads: "Clients with hot lead temperature from telephony/import. Separate from the formal Leads module.",
  outstandingAr: "Sum of open invoice balances in the CRM. Amounts may span multiple currencies without FX conversion.",
  enrollments: "Clients marked enrolled or visa approved in the CRM. Requires counselors to update status here.",
  newApps30d: "Client profiles created in the CRM in the last 30 days. Excludes Odoo-only applications.",
  studyPermits: "Clients with a study permit number entered in the CRM.",
  leadConversion: "Conversion rate from the formal Leads module only, not telephony client leads.",
  openLeads: "Open rows in the Leads module. Does not include client-table telephony leads.",
  collected30d: "CRM invoice payments recorded in the last 30 days. Odoo collections are not included.",
  invoiced30d: "CRM invoices created in the last 30 days. Multi-currency amounts are summed without FX conversion.",
  collectionRate: "Paid amount divided by billed amount across all active CRM invoices (not limited to 30 days).",
  offerRevenue: "Revenue attributed to offers via CRM invoices and events. Hidden if offers module is not in use.",
  commissionExpected: "Sum of expected commission from all UPI claim cycles, including drafts.",
  pendingHandoffs: "Handoffs assigned to you awaiting action in the CRM.",
  countryIntake: "Top destination countries and intakes by client count in the CRM. Full table on Reports.",
  odooHealth: "Odoo link and sync counts from client records. Odoo sync is inactive; for migration visibility only.",
  arAgingChart: "Outstanding balances grouped by aging bucket from CRM invoices.",
  appsByStatus: "Distribution of client application statuses in the CRM.",
  pipelineStages: "Clients per pipeline stage for CRM-managed applications only.",
} as const;
