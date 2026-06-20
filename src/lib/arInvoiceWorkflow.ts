/**
 * AR Invoice hybrid workflow (CRM-driven + Accounts-initiated).
 *
 * Design decisions (final):
 * 1. Pass-through services: allow top-ups; warn on duplicate open invoices.
 * 2. ON_REQUEST pricing: Accounts may set fee on invoice (with permission).
 * 3. Scenario B: auto-enroll via completeClientServiceEnrollment + client_service_cases.
 * 4. Unmapped collection category: block send; draft allowed with warning.
 * 5. Corporate AR (accounting_ar_invoices): unchanged — out of scope.
 */

import { supabase } from "@/integrations/supabase/client";
import { fetchAllServiceCatalogue, type ServiceCatalogueItem } from "@/lib/leads";
import { collectClientServices } from "@/lib/clientActiveService";
import { findCatalogueItemForStoredCode } from "@/lib/service-library/resolveServiceLabel";
import { completeClientServiceEnrollment } from "@/lib/service-library/completeClientServiceEnrollment";
import { createServiceCase, fetchCasesForClient, type ClientServiceCase } from "@/lib/clientServiceCase";
import { listClientPrograms, type ClientProgramEnriched } from "@/lib/clientPrograms";
import { resolvePipelineForServiceCode } from "@/lib/clientActiveService";
import {
  findPendingDraftInvoice,
  invoiceLineMatchesServiceCode,
  type BillableClientService,
  type InvoiceLineLike,
} from "@/lib/clientInvoiceServices";
import { parseLibraryIdFromServiceCode } from "@/lib/service-library/serviceCodes";

export type ServiceCollectionStatus =
  | "NOT_INVOICED"
  | "DRAFT"
  | "OUTSTANDING"
  | "PARTIAL"
  | "COLLECTED"
  | "TRUST_HELD";

export interface InvoiceClientContext {
  clientId: string;
  clientName: string;
  institution: string | null;
  program: string | null;
  intake: string | null;
  country: string | null;
  counselorId: string | null;
  counselorName: string | null;
  visaStatus: string | null;
  readOnly: boolean;
}

export interface EligibleServiceRequest extends BillableClientService {
  serviceCode: string;
  caseId: string | null;
  caseAttempt: number | null;
  caseStatus: string | null;
  pipelineStage: string | null;
  collectionStatus: ServiceCollectionStatus;
  invoicedAmount: number;
  collectedAmount: number;
  outstandingAmount: number;
  categoryName: string | null;
  categoryUnmapped: boolean;
  pricingType: ServiceCatalogueItem["pricing_type"];
  onRequestFee?: number | null;
}

export interface DuplicateServiceCheck {
  kind: "none" | "enrolled" | "draft" | "outstanding";
  serviceCode: string;
  serviceName: string;
  draftInvoiceId?: string;
  draftInvoiceNumber?: string;
  caseId?: string;
  message: string;
}

const TERMINAL_INVOICE = new Set(["cancelled", "void"]);

function storedCodeForItem(item: ServiceCatalogueItem, enrolledCode: string): string {
  return item.service_code ?? enrolledCode;
}

function deriveCollectionStatus(params: {
  invoiced: number;
  collected: number;
  hasDraft: boolean;
  trustHeld: number;
}): ServiceCollectionStatus {
  if (params.invoiced <= 0 && !params.hasDraft) return "NOT_INVOICED";
  if (params.hasDraft && params.invoiced <= 0) return "DRAFT";
  if (params.collected <= 0 && params.invoiced > 0) return "OUTSTANDING";
  if (params.collected > 0 && params.collected < params.invoiced - 0.01) return "PARTIAL";
  if (params.trustHeld > 0.01) return "TRUST_HELD";
  if (params.collected >= params.invoiced - 0.01 && params.invoiced > 0) return "COLLECTED";
  return "OUTSTANDING";
}

export async function loadInvoiceClientContext(
  clientId: string,
  overrides?: Partial<Pick<InvoiceClientContext, "institution" | "program" | "intake" | "country" | "counselorName" | "visaStatus">>,
): Promise<InvoiceClientContext> {
  const [{ data: client }, programs, stageRow] = await Promise.all([
    supabase
      .from("clients")
      .select("id, full_name, intake, country, assigned_counselor_id, owner_id")
      .eq("id", clientId)
      .maybeSingle(),
    listClientPrograms(clientId).catch(() => [] as ClientProgramEnriched[]),
    supabase
      .from("vw_client_current_stage")
      .select("stage_label, stage_key")
      .eq("client_id", clientId)
      .maybeSingle(),
  ]);

  const primary =
    programs.find((p) => p.is_primary && p.status === "final") ??
    programs.find((p) => p.status === "final") ??
    programs[0];

  const counselorId = (client as { assigned_counselor_id?: string | null })?.assigned_counselor_id ?? null;
  let counselorName: string | null = null;
  if (counselorId) {
    const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", counselorId).maybeSingle();
    counselorName = (prof as { full_name?: string })?.full_name ?? null;
  }

  const institution = primary?.course?.university?.name ?? null;
  const program = primary?.course?.name ?? null;

  return {
    clientId,
    clientName: (client as { full_name?: string })?.full_name ?? "Client",
    institution: overrides?.institution ?? institution,
    program: overrides?.program ?? program,
    intake: overrides?.intake ?? (client as { intake?: string })?.intake ?? null,
    country: overrides?.country ?? (client as { country?: string })?.country ?? primary?.course?.country?.name ?? null,
    counselorId,
    counselorName: overrides?.counselorName ?? counselorName,
    visaStatus: overrides?.visaStatus ?? (stageRow as { stage_label?: string })?.stage_label ?? null,
    readOnly: !overrides,
  };
}

export async function loadEligibleServiceRequests(clientId: string): Promise<{
  requests: EligibleServiceRequest[];
  catalogue: ServiceCatalogueItem[];
  serviceCodes: string[];
}> {
  const { data: invoicesRaw } = await supabase
    .from("client_invoices")
    .select("id, invoice_number, status, line_items, amount, amount_paid")
    .eq("client_id", clientId);

  const invoices = (invoicesRaw ?? []).filter((i) => !TERMINAL_INVOICE.has(i.status));

  const [catalogue, clientRes, cases, categories] = await Promise.all([
    fetchAllServiceCatalogue().catch(() => [] as ServiceCatalogueItem[]),
    supabase
      .from("clients")
      .select("visa_services,coaching_services,admission_services,allied_services,travel_financial_services")
      .eq("id", clientId)
      .maybeSingle(),
    fetchCasesForClient(clientId),
    supabase.from("accounting_collection_categories" as never).select("id, name, code").eq("lifecycle_status", "ACTIVE"),
  ]);

  const catNameById = new Map(((categories as { data?: any[] }).data ?? []).map((c: any) => [c.id, c.name]));

  const clientRow = clientRes.data;
  const serviceCodes = collectClientServices(clientRow ?? {});
  const casesByCode = new Map<string, ClientServiceCase>();
  for (const c of cases) {
    const cur = casesByCode.get(c.serviceCode);
    if (!cur || c.attemptNumber >= cur.attemptNumber) casesByCode.set(c.serviceCode, c);
  }

  const { data: stage } = await supabase
    .from("vw_client_current_stage")
    .select("stage_label")
    .eq("client_id", clientId)
    .maybeSingle();

  const invoiceIds = invoices.map((i) => i.id);
  const { data: payAllocs } = invoiceIds.length
    ? await supabase
        .from("client_invoice_payment_allocations")
        .select("service_id, amount_allocated, invoice_id")
        .in("invoice_id", invoiceIds)
    : { data: [] };

  const collectedByService = new Map<string, number>();
  for (const a of payAllocs ?? []) {
    const sid = (a as { service_id?: string }).service_id;
    if (!sid) continue;
    collectedByService.set(sid, (collectedByService.get(sid) ?? 0) + Number((a as { amount_allocated?: number }).amount_allocated ?? 0));
  }

  const seen = new Set<string>();
  const requests: EligibleServiceRequest[] = [];

  for (const code of serviceCodes) {
    const item = findCatalogueItemForStoredCode(code, catalogue);
    if (!item || !item.is_active) continue;
    if (item.pricing_type === "FREE") continue;

    const canonicalId = item.id;
    if (seen.has(canonicalId)) continue;
    seen.add(canonicalId);

    const storedCode = storedCodeForItem(item, code);
    const svcCase = casesByCode.get(storedCode) ?? casesByCode.get(code);

    let invoiced = 0;
    let hasDraft = false;
    for (const inv of invoices) {
      const lines = Array.isArray(inv.line_items) ? (inv.line_items as InvoiceLineLike[]) : [];
      for (const li of lines) {
        if (!invoiceLineMatchesServiceCode(li, storedCode, catalogue) && !invoiceLineMatchesServiceCode(li, code, catalogue)) continue;
        invoiced += Number(li.total ?? 0);
      }
      if (inv.status === "draft" && lines.some((li) => invoiceLineMatchesServiceCode(li, storedCode, catalogue) || invoiceLineMatchesServiceCode(li, code, catalogue))) {
        hasDraft = true;
      }
    }

    const collected = collectedByService.get(canonicalId) ?? collectedByService.get(storedCode) ?? 0;
    const catId = item.collection_category_id ?? null;

    requests.push({
      id: canonicalId,
      service_code: storedCode,
      service_name: item.service_name,
      fee_inr: item.fee_inr ?? null,
      fee_cad: item.fee_cad ?? null,
      collection_category_id: catId,
      serviceCode: storedCode,
      caseId: svcCase?.id ?? null,
      caseAttempt: svcCase?.attemptNumber ?? null,
      caseStatus: svcCase?.status ?? null,
      pipelineStage: (stage as { stage_label?: string })?.stage_label ?? null,
      collectionStatus: deriveCollectionStatus({ invoiced, collected, hasDraft, trustHeld: 0 }),
      invoicedAmount: invoiced,
      collectedAmount: collected,
      outstandingAmount: Math.max(0, invoiced - collected),
      categoryName: catId ? catNameById.get(catId) ?? null : null,
      categoryUnmapped: !catId,
      pricingType: item.pricing_type,
    });
  }

  requests.sort((a, b) => a.service_name.localeCompare(b.service_name));
  return { requests, catalogue, serviceCodes };
}

export async function checkServiceDuplicate(
  clientId: string,
  serviceCode: string,
  catalogue: ServiceCatalogueItem[],
  excludeInvoiceId?: string,
): Promise<DuplicateServiceCheck> {
  const item = findCatalogueItemForStoredCode(serviceCode, catalogue);
  const name = item?.service_name ?? serviceCode;

  const { data: client } = await supabase
    .from("clients")
    .select("visa_services,coaching_services,admission_services,allied_services,travel_financial_services")
    .eq("id", clientId)
    .maybeSingle();

  const enrolled = collectClientServices(client ?? {});
  const alreadyEnrolled = enrolled.some(
    (c) => c === serviceCode || invoiceLineMatchesServiceCode({ service_code: c }, serviceCode, catalogue),
  );

  const { data: invoices } = await supabase
    .from("client_invoices")
    .select("id, invoice_number, status, line_items, amount, amount_paid")
    .eq("client_id", clientId);

  const list = (invoices ?? []).filter((i) => i.id !== excludeInvoiceId && !TERMINAL_INVOICE.has(i.status));
  const drafts = list.filter((i) => i.status === "draft");
  const draft = findPendingDraftInvoice(drafts, [serviceCode], catalogue, serviceCode);
  if (draft) {
    return {
      kind: "draft",
      serviceCode,
      serviceName: name,
      draftInvoiceId: draft.id,
      draftInvoiceNumber: (draft as { invoice_number?: string }).invoice_number,
      message: `Draft invoice ${(draft as { invoice_number?: string }).invoice_number} already includes this service.`,
    };
  }

  for (const inv of list.filter((i) => i.status !== "draft")) {
    const lines = Array.isArray(inv.line_items) ? inv.line_items : [];
    const match = lines.some((li) => invoiceLineMatchesServiceCode(li as InvoiceLineLike, serviceCode, catalogue));
    if (!match) continue;
    const outstanding = Math.max(0, Number(inv.amount ?? 0) - Number(inv.amount_paid ?? 0));
    if (outstanding > 0.01) {
      return {
        kind: "outstanding",
        serviceCode,
        serviceName: name,
        message: `Outstanding invoice ${inv.invoice_number} includes this service (₹${outstanding.toFixed(2)} due). Top-up or collect first.`,
      };
    }
  }

  if (alreadyEnrolled) {
    const cases = await fetchCasesForClient(clientId);
    const c = cases.find((x) => x.serviceCode === serviceCode);
    return {
      kind: "enrolled",
      serviceCode,
      serviceName: name,
      caseId: c?.id,
      message: `"${name}" is already on this student. Use the existing service request.`,
    };
  }

  return { kind: "none", serviceCode, serviceName: name, message: "" };
}

/** Scenario B — add service from library (enrollment + service case). */
export async function addServiceFromLibrary(params: {
  clientId: string;
  catalogueItem: ServiceCatalogueItem;
  country?: string | null;
}): Promise<{ serviceCode: string; caseId: string | null }> {
  const libraryId = params.catalogueItem.library_id ?? parseLibraryIdFromServiceCode(params.catalogueItem.service_code ?? params.catalogueItem.id);
  const enrollment = await completeClientServiceEnrollment({
    clientId: params.clientId,
    libraryId,
    country: params.country ?? params.catalogueItem.country_tag ?? null,
    serviceCategory: params.catalogueItem.master_key,
    appendService: true,
  });

  const serviceCode = enrollment.serviceCode ?? params.catalogueItem.service_code ?? params.catalogueItem.id;
  let caseId: string | null = null;

  const pipeline = await resolvePipelineForServiceCode(
    serviceCode,
    [params.catalogueItem],
    params.country ?? null,
  );

  try {
    const svcCase = await createServiceCase({
      clientId: params.clientId,
      serviceCode,
      pipelineId: pipeline?.pipelineId ?? null,
      attemptNumber: 1,
    });
    caseId = svcCase.id;
  } catch {
    // Case may already exist — non-fatal
  }

  return { serviceCode, caseId };
}

export interface InvoiceValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  blockSend: boolean;
}

import { CHECKOUT_DISCOUNT_META_ID } from "@/lib/invoiceLinePricing";

export function validateInvoiceDraft(params: {
  lineItems: InvoiceLineLike[];
  pickedServiceIds: string[];
  services: BillableClientService[];
  mode: "draft" | "send";
}): InvoiceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const billableLines = params.lineItems.filter(
    (li) => li.service_id && li.service_id !== CHECKOUT_DISCOUNT_META_ID,
  );
  if (billableLines.length === 0) {
    errors.push("Select at least one service from the library.");
  }

  const idsOnInvoice = new Set<string>();
  for (const li of billableLines) {
    if (!li.service_id) {
      errors.push("Every line must reference a Service Library item.");
      continue;
    }
    if (idsOnInvoice.has(li.service_id)) {
      errors.push("Duplicate service on the same invoice is not allowed.");
    }
    idsOnInvoice.add(li.service_id);
    if (!li.service_name?.trim()) {
      errors.push("Free-text service names are not allowed.");
    }
    if (!li.collection_category_id) {
      warnings.push(`"${li.service_name}" has no collection category mapped.`);
    }
  }

  const blockSend = params.mode === "send" && warnings.some((w) => w.includes("collection category"));
  if (blockSend) {
    errors.push("Cannot send invoice until all services have a collection category (map in Collection Categories admin).");
  }

  return { ok: errors.length === 0, errors, warnings, blockSend };
}

export function eligibleToBillable(requests: EligibleServiceRequest[]): BillableClientService[] {
  return requests.map(({ serviceCode, caseId, caseAttempt, ...rest }) => rest);
}
