import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Lock,
  Copy,
  UserCircle,
  GraduationCap,
  Users,
  Briefcase,
  Building2,
  StickyNote,
  Globe,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";

import { CountrySelect } from "@/components/leads/CountrySelect";
import { InterestedCountriesPicker } from "@/components/leads/InterestedCountriesPicker";
import { ServiceTabs, type ServiceSelection } from "@/components/leads/ServiceTabs";
import { FamilyMembersSection } from "@/components/clients/registration/FamilyMembersSection";
import { InvoicePreviewSection } from "@/components/clients/registration/InvoicePreviewSection";
import { EducationExperienceFields } from "@/components/clients/registration/EducationExperienceFields";
import { RegistrationWorkspace, type RegistrationSection } from "@/components/crm/RegistrationWorkspace";

import {
  upsertClientRegistration,
  fetchClient,
  createDraftInvoice,
  type ClientDraft,
  type ClientRow,
  type FamilyMember,
  type InvoiceLineDraft,
} from "@/lib/clientRegistration";
import {
  fetchBranches,
  fetchDepartments,
  fetchAllServiceCatalogue,
  type Branch,
  type Department,
  type ServiceCatalogueItem,
} from "@/lib/leads";
import { GENDERS } from "@/lib/leadSchemas";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ensureFreshSession, AuthExpiredError, PermissionDeniedError } from "@/lib/supabaseSafeInsert";
import { autoAssignPipelineForClient } from "@/lib/stagePipelines";
import { completeClientServiceEnrollment } from "@/lib/service-library/completeClientServiceEnrollment";
import { notifyUsers, resolveCounselorNotificationUserIds } from "@/lib/appNotifications";
import { buildClientDetailUrlFromServiceLibrary } from "@/lib/service-library/serviceCodes";

function hydrateClient(c: ClientRow): ClientRow {
  const hasHistory = Array.isArray(c.education_history) && c.education_history.length > 0;
  if (!hasHistory && (c.last_education || c.institution_name || c.year_of_passing || c.percentage_cgpa)) {
    return {
      ...c,
      education_history: [
        {
          level: c.last_education ?? undefined,
          institution: c.institution_name ?? undefined,
          year: c.year_of_passing ?? null,
          percentage_cgpa: c.percentage_cgpa ?? undefined,
        },
      ],
    };
  }
  return c;
}

const CLIENT_TYPES = ["Student", "Corporate", "Partner", "Referral", "B2B"];
const PORTAL_ACCESS_LEVELS = [
  { value: "standard", label: "Standard — profile, docs, payments, messages" },
  { value: "limited", label: "Limited — payments & messages only" },
];

const CLIENT_SECTIONS: RegistrationSection[] = [
  { id: "profile", label: "Profile & IDs", shortLabel: "Profile", icon: UserCircle, hint: "DOB, passport, PAN" },
  { id: "education", label: "Education & Tests", shortLabel: "Education", icon: GraduationCap, hint: "Scores & experience" },
  { id: "family", label: "Family Members", shortLabel: "Family", icon: Users, hint: "Spouse, dependents" },
  { id: "services", label: "Services", shortLabel: "Services", icon: Briefcase, hint: "Confirm & fees" },
  { id: "intake", label: "Intake & Branch", shortLabel: "Intake", icon: Building2, hint: "Branch, countries" },
  { id: "notes", label: "Counselor Notes", shortLabel: "Notes", icon: StickyNote, hint: "Internal notes" },
  { id: "portal", label: "Client Portal", shortLabel: "Portal", icon: Globe, hint: "Login access" },
  { id: "billing", label: "Accounting", shortLabel: "Billing", icon: Receipt, hint: "Tax ID, client type" },
];

export type LeadFieldSnapshot = {
  first_name?: string;
  middle_name?: string | null;
  last_name?: string;
  email?: string | null;
  phone?: string | null;
  phone_country_code?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  country_of_citizenship?: string | null;
  country_of_residence?: string | null;
  last_education?: string | null;
  last_education_other?: string | null;
  branch?: string | null;
  department?: string | null;
  coaching_services: string[];
  visa_services: string[];
  admission_services: string[];
  allied_services: string[];
  travel_services: string[];
  interested_countries: string[];
};

type Props = {
  leadId: string;
  leadNumber: string;
  leadNotes: string;
  isColdLead: boolean;
  getLeadFields: () => LeadFieldSnapshot;
  initialClientDraft?: ClientDraft;
  existingClientId?: string | null;
  slCountry?: string | null;
  slVisaService?: string | null;
  slServiceLabel?: string | null;
  slLibraryId?: string | null;
  slSubService?: string | null;
  onClientIdChange?: (id: string) => void;
  onSavingChange?: (saving: boolean) => void;
};

export function ClientRegistrationPanel({
  leadId,
  leadNumber,
  leadNotes,
  isColdLead,
  getLeadFields,
  initialClientDraft,
  existingClientId,
  slCountry,
  slVisaService,
  slServiceLabel,
  slLibraryId,
  slSubService,
  onClientIdChange,
  onSavingChange,
}: Props) {
  const nav = useNavigate();
  const { hasRole, isAdmin } = useAuth();
  const isCounselor = isAdmin || hasRole(["counselor", "admin"]);

  const [clientId, setClientId] = useState<string | null>(existingClientId ?? null);
  const [regNumber, setRegNumber] = useState<string | null>(null);
  const [f, setF] = useState<ClientDraft>(initialClientDraft ?? { source_lead_id: leadId });
  const [services, setServices] = useState<ServiceSelection>({
    coaching_services: initialClientDraft?.coaching_services ?? [],
    visa_services: initialClientDraft?.visa_services ?? [],
    admission_services: initialClientDraft?.admission_services ?? [],
    allied_services: initialClientDraft?.allied_services ?? [],
    travel_services: initialClientDraft?.travel_financial_services ?? [],
  });
  const [interestedCountries, setInterestedCountries] = useState<string[]>(
    initialClientDraft?.interested_countries ?? [],
  );
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [otherTests, setOtherTests] = useState<Array<{ type: string; score?: string; date?: string }>>(
    initialClientDraft?.other_tests ?? [],
  );
  const [paymentTerms, setPaymentTerms] = useState<string>(initialClientDraft?.payment_terms ?? "DUE_ON_RECEIPT");
  const [billingEntity, setBillingEntity] = useState<string>(initialClientDraft?.billing_entity ?? "");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [portalEnabled, setPortalEnabled] = useState(false);
  const [portalAccessLevel, setPortalAccessLevel] = useState<string>("standard");
  const [notesUnlockReason, setNotesUnlockReason] = useState<string>("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [catalogue, setCatalogue] = useState<ServiceCatalogueItem[]>([]);
  const [activeSection, setActiveSection] = useState(CLIENT_SECTIONS[0].id);

  useEffect(() => {
    fetchBranches().then(setBranches);
    fetchDepartments().then(setDepartments);
    fetchAllServiceCatalogue()
      .then(setCatalogue)
      .catch(() => setCatalogue([]));
  }, []);

  useEffect(() => {
    if (!existingClientId) return;
    fetchClient(existingClientId).then((c) => {
      if (!c) return;
      const hydrated = hydrateClient(c);
      setClientId(hydrated.id);
      setRegNumber(hydrated.registration_number ?? null);
      setF(hydrated);
      setInterestedCountries(hydrated.interested_countries ?? []);
      setOtherTests(hydrated.other_tests ?? []);
      setServices({
        coaching_services: hydrated.coaching_services ?? [],
        visa_services: hydrated.visa_services ?? [],
        admission_services: hydrated.admission_services ?? [],
        allied_services: hydrated.allied_services ?? [],
        travel_services: hydrated.travel_financial_services ?? [],
      });
      setPaymentTerms(hydrated.payment_terms ?? "DUE_ON_RECEIPT");
      setBillingEntity(hydrated.billing_entity ?? "");
    });
  }, [existingClientId]);

  useEffect(() => {
    if (!initialClientDraft || existingClientId) return;
    setF((p) => ({ ...p, ...initialClientDraft, source_lead_id: leadId }));
    if (initialClientDraft.interested_countries?.length) {
      setInterestedCountries(initialClientDraft.interested_countries);
    }
    setServices({
      coaching_services: initialClientDraft.coaching_services ?? [],
      visa_services: initialClientDraft.visa_services ?? [],
      admission_services: initialClientDraft.admission_services ?? [],
      allied_services: initialClientDraft.allied_services ?? [],
      travel_services: initialClientDraft.travel_financial_services ?? [],
    });
  }, [initialClientDraft, leadId, existingClientId]);

  const setField = <K extends keyof ClientDraft>(k: K, v: ClientDraft[K]) => setF((p) => ({ ...p, [k]: v }));

  const buildDraft = (): ClientDraft => {
    const lead = getLeadFields();
    const fn = (lead.first_name ?? "").trim();
    const mn = (lead.middle_name ?? "").trim();
    const ln = (lead.last_name ?? "").trim();
    return {
      ...f,
      source_lead_id: leadId,
      first_name: fn || f.first_name,
      middle_name: mn || f.middle_name,
      last_name: ln || f.last_name,
      full_name: [fn, mn, ln].filter(Boolean).join(" ") || f.full_name,
      email: lead.email ?? f.email,
      phone: lead.phone ?? f.phone,
      phone_country_code: lead.phone_country_code ?? f.phone_country_code,
      gender: lead.gender ?? f.gender,
      marital_status: lead.marital_status ?? f.marital_status,
      country_of_citizenship: lead.country_of_citizenship ?? f.country_of_citizenship,
      country_of_residence: lead.country_of_residence ?? f.country_of_residence,
      country: lead.country_of_residence ?? f.country ?? "India",
      last_education: lead.last_education ?? f.last_education,
      last_education_other: lead.last_education_other ?? f.last_education_other,
      branch: lead.branch ?? f.branch,
      department: lead.department ?? f.department,
      interested_countries: interestedCountries.length ? interestedCountries : lead.interested_countries,
      coaching_services: services.coaching_services.length ? services.coaching_services : lead.coaching_services,
      visa_services: services.visa_services.length ? services.visa_services : lead.visa_services,
      admission_services: services.admission_services.length
        ? services.admission_services
        : lead.admission_services,
      allied_services: services.allied_services.length ? services.allied_services : lead.allied_services,
      travel_financial_services: services.travel_services.length
        ? services.travel_services
        : lead.travel_services,
      other_tests: otherTests,
      english_sections: f.english_sections ?? {},
      education_history: f.education_history ?? [],
      work_experience: f.work_experience ?? [],
      payment_terms: paymentTerms,
      billing_entity: billingEntity || null,
    };
  };

  const sendPortalInviteIfEnabled = async (savedClientId: string) => {
    if (!portalEnabled) return;
    const email = getLeadFields().email ?? f.email;
    if (!email?.trim()) return;
    try {
      await supabase.functions.invoke("client-portal-invite-create", {
        body: { clientId: savedClientId, email: email.trim() },
      });
      toast.success(`Portal invite sent to ${email.trim()}`);
    } catch {
      toast.warning("Client saved but portal invite could not be sent");
    }
  };

  const runServiceEnrollment = async (savedClientId: string) => {
    const primaryCountry = interestedCountries?.[0] ?? slCountry ?? null;
    if (slLibraryId && (slServiceLabel || slSubService)) {
      return completeClientServiceEnrollment({
        clientId: savedClientId,
        libraryId: slLibraryId,
        country: slCountry ?? primaryCountry,
        serviceTitle: slServiceLabel ?? undefined,
        subService: slSubService ?? undefined,
        serviceCode: slVisaService ?? undefined,
        counselorNote: slServiceLabel ? `Service Library application: ${slServiceLabel}` : null,
      });
    }

    const firstVisa = services.visa_services?.[0] ?? null;
    if (firstVisa?.includes("::")) {
      return completeClientServiceEnrollment({
        clientId: savedClientId,
        serviceCode: firstVisa,
        country: primaryCountry,
      });
    }

    if (slServiceLabel && slSubService) {
      await autoAssignPipelineForClient({
        clientId: savedClientId,
        country: primaryCountry,
        interestedCountries,
        serviceTitle: slServiceLabel,
        subService: slSubService,
      });
      return { gaps: [] as string[], pipelineAssigned: false, templateAssigned: false, serviceCode: firstVisa, applicationTypeLabel: null, destinationCountry: primaryCountry };
    }

    await autoAssignPipelineForClient({
      clientId: savedClientId,
      country: primaryCountry,
      interestedCountries,
      serviceCategory: firstVisa,
    });
    return { gaps: [] as string[], pipelineAssigned: false, templateAssigned: false, serviceCode: firstVisa, applicationTypeLabel: null, destinationCountry: primaryCountry };
  };

  const autosave = async () => {
    const lead = getLeadFields();
    const fn = (lead.first_name ?? "").trim();
    const ln = (lead.last_name ?? "").trim();
    if (!clientId && (!fn || !ln)) return;
    if (saving) return;
    setSaving(true);
    onSavingChange?.(true);
    try {
      const ok = await ensureFreshSession();
      if (!ok) {
        toast.error("Your session expired. Please sign in again.");
        return;
      }
      const saved = await upsertClientRegistration(clientId, buildDraft());
      const isFirstSave = !clientId;
      if (isFirstSave) {
        setClientId(saved.id);
        onClientIdChange?.(saved.id);
        setRegNumber(saved.registration_number ?? null);
        toast.success(`Client registered: ${saved.registration_number ?? saved.application_id ?? saved.id}`);
        try {
          const { data: cli } = await supabase
            .from("clients")
            .select("assigned_counselor_id, owner_id, full_name")
            .eq("id", saved.id)
            .maybeSingle();
          const userIds = resolveCounselorNotificationUserIds(cli, { context: "lead_converted" });
          const name = [lead.first_name, lead.middle_name, lead.last_name].filter(Boolean).join(" ");
          if (userIds.length) {
            notifyUsers({
              userIds,
              category: "lead_converted",
              title: `Lead converted: ${cli?.full_name ?? name}`,
              link: `/clients/${saved.id}`,
              dedupeKey: `lead:${leadId}:converted`,
            });
          }
        } catch {
          /* best-effort */
        }

        const enrollment = await runServiceEnrollment(saved.id);
        if (enrollment.gaps.includes("pipeline")) {
          toast.message("Client registered — assign an application pipeline on the client page if needed");
        }
        if (enrollment.gaps.includes("binder_template")) {
          toast.message("No document checklist template linked for this service yet");
        }

        await sendPortalInviteIfEnabled(saved.id);

        if (slLibraryId) {
          nav(
            buildClientDetailUrlFromServiceLibrary({
              clientId: saved.id,
              libraryId: slLibraryId,
              country: slCountry,
              serviceCode: slVisaService ?? enrollment.serviceCode ?? undefined,
            }),
          );
        }
      }
    } catch (e: unknown) {
      console.error("[client autosave]", e);
      if (e instanceof AuthExpiredError) {
        toast.error(e.message);
      } else if (e instanceof PermissionDeniedError) {
        toast.error(`Save failed: ${e.message}${e.details ? ` — ${e.details}` : ""}`);
      } else {
        toast.error(`Save failed: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    } finally {
      setSaving(false);
      onSavingChange?.(false);
    }
  };

  const primaryName = useMemo(() => {
    const lead = getLeadFields();
    return [lead.first_name, lead.middle_name, lead.last_name].filter(Boolean).join(" ") || "Primary applicant";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.first_name, f.middle_name, f.last_name]);

  const serviceFees = (f.service_fees ?? {}) as Record<string, { amount: number; complimentary?: boolean }>;
  const updateServiceFee = (code: string, patch: Partial<{ amount: number; complimentary: boolean }>) => {
    const next = { ...(f.service_fees ?? {}) };
    next[code] = { ...(next[code] ?? { amount: 0 }), ...patch };
    setField("service_fees", next as never);
  };

  const handleCreateInvoice = async (lines: InvoiceLineDraft[]) => {
    if (!clientId) {
      toast.error("Click Register Client first to save the client record");
      return;
    }
    setCreating(true);
    try {
      const ok = await ensureFreshSession();
      if (!ok) {
        toast.error("Your session expired. Please sign in again.");
        return;
      }
      await upsertClientRegistration(clientId, buildDraft());
      const res = await createDraftInvoice({
        client_id: clientId,
        client_name: primaryName,
        entity: billingEntity || null,
        payment_terms: paymentTerms,
        lines,
      });
      const email = getLeadFields().email ?? f.email;
      if (portalEnabled && email) {
        try {
          await supabase.functions.invoke("client-portal-invite-create", {
            body: { clientId, email, access_level: portalAccessLevel },
          });
          toast.success(`Login credentials sent to ${email}`);
        } catch {
          toast.warning("Client saved but portal invite could not be sent");
        }
      }
      toast.success(`Client ${regNumber ?? clientId} registered. Draft invoice ${res.invoice_number} ready.`);
      if (slLibraryId) {
        nav(
          buildClientDetailUrlFromServiceLibrary({
            clientId,
            libraryId: slLibraryId,
            country: slCountry,
            serviceCode: slVisaService,
          }),
        );
      } else {
        nav(`/clients/${clientId}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create invoice");
    } finally {
      setCreating(false);
    }
  };

  const unlockNotes = () => {
    if (!notesUnlockReason.trim()) {
      toast.error("Reason required to unlock notes");
      return;
    }
    setField("counselor_notes_locked", false as never);
    setTimeout(autosave, 0);
  };

  const invoiceSection = (
    <InvoicePreviewSection
      primaryName={primaryName}
      selected={services}
      catalogue={catalogue}
      familyMembers={familyMembers}
      serviceFees={serviceFees}
      isCounselor={!!isCounselor}
      paymentTerms={paymentTerms}
      onPaymentTermsChange={(v) => {
        setPaymentTerms(v);
        setTimeout(autosave, 0);
      }}
      billingEntity={billingEntity}
      onBillingEntityChange={(v) => {
        setBillingEntity(v);
        setTimeout(autosave, 0);
      }}
      onCreateInvoice={handleCreateInvoice}
      creating={creating || !clientId}
    />
  );

  const saveFooter = (
    <div className="space-y-2">
      {saving && <p className="text-xs text-muted-foreground">Saving…</p>}
      <Button
        className="w-full"
        onClick={autosave}
        disabled={
          saving || !(getLeadFields().first_name ?? "").trim() || !(getLeadFields().last_name ?? "").trim()
        }
      >
        {saving ? "Saving…" : clientId ? "Save Client" : "Register Client"}
      </Button>
    </div>
  );

  const sectionContent = (() => {
    switch (activeSection) {
      case "profile":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Identity documents and contact details for the client file. Lead name and primary contact come from the
              lead record above.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Date of Birth *</Label>
                <Input
                  type="date"
                  value={f.date_of_birth ?? ""}
                  onChange={(e) => setField("date_of_birth", e.target.value || null)}
                  onBlur={autosave}
                />
              </div>
              {isColdLead && (
                <>
                  <div className="space-y-1.5">
                    <Label>Gender *</Label>
                    <Select
                      value={f.gender ?? getLeadFields().gender ?? ""}
                      onValueChange={(v) => {
                        setField("gender", v);
                        setTimeout(autosave, 0);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDERS.map((g) => (
                          <SelectItem key={g} value={g} className="capitalize">
                            {g.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Country of Citizenship *</Label>
                    <CountrySelect
                      value={f.country_of_citizenship ?? getLeadFields().country_of_citizenship ?? ""}
                      onChange={(v) => {
                        setField("country_of_citizenship", v);
                        setTimeout(autosave, 0);
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Country of Residence *</Label>
                    <CountrySelect
                      value={f.country_of_residence ?? getLeadFields().country_of_residence ?? ""}
                      onChange={(v) => {
                        setField("country_of_residence", v);
                        setTimeout(autosave, 0);
                      }}
                    />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label>Phone (alternate)</Label>
                <Input
                  value={f.phone_alternate ?? ""}
                  onChange={(e) => setField("phone_alternate", e.target.value)}
                  onBlur={autosave}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email (alternate)</Label>
                <Input
                  type="email"
                  value={f.email_alternate ?? ""}
                  onChange={(e) => setField("email_alternate", e.target.value)}
                  onBlur={autosave}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Passport Number</Label>
                <Input
                  value={f.passport_number ?? ""}
                  onChange={(e) => setField("passport_number", e.target.value)}
                  onBlur={autosave}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Passport Expiry</Label>
                <Input
                  type="date"
                  value={f.passport_expiry ?? ""}
                  onChange={(e) => setField("passport_expiry", e.target.value || null)}
                  onBlur={autosave}
                />
              </div>
              <div className="space-y-1.5">
                <Label>National ID / Aadhar (last 4)</Label>
                <Input
                  maxLength={4}
                  value={f.national_id_last4 ?? ""}
                  onChange={(e) => setField("national_id_last4", e.target.value.replace(/\D/g, "").slice(0, 4))}
                  onBlur={autosave}
                />
              </div>
              <div className="space-y-1.5">
                <Label>PAN</Label>
                <Input
                  value={f.pan_number ?? ""}
                  onChange={(e) => setField("pan_number", e.target.value.toUpperCase())}
                  onBlur={autosave}
                />
              </div>
            </div>
          </div>
        );
      case "education":
        return (
          <EducationExperienceFields
            value={{
              education_history: (f.education_history ?? []) as never,
              english_test: f.english_test ?? null,
              english_overall: f.english_overall ?? null,
              english_test_date: f.english_test_date ?? null,
              english_test_expiry: f.english_test_expiry ?? null,
              english_sections: (f.english_sections ?? {}) as Record<string, string>,
              other_tests: otherTests,
              work_experience: (f.work_experience ?? []) as never,
            }}
            onChange={(patch) => {
              if (patch.other_tests !== undefined) setOtherTests(patch.other_tests);
              setF((p) => {
                const next: typeof p = { ...p };
                if (patch.education_history !== undefined) next.education_history = patch.education_history;
                if (patch.english_test !== undefined) next.english_test = patch.english_test;
                if (patch.english_overall !== undefined) next.english_overall = patch.english_overall;
                if (patch.english_test_date !== undefined) next.english_test_date = patch.english_test_date;
                if (patch.english_test_expiry !== undefined) next.english_test_expiry = patch.english_test_expiry;
                if (patch.english_sections !== undefined) next.english_sections = patch.english_sections;
                if (patch.work_experience !== undefined) next.work_experience = patch.work_experience;
                return next;
              });
            }}
            onCommit={autosave}
          />
        );
      case "family":
        return (
          <FamilyMembersSection primaryClientId={clientId} primaryLeadId={leadId} onChange={setFamilyMembers} embedded />
        );
      case "services":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Confirm services from the lead and set allied/travel fees.</p>
            <ServiceTabs
              value={services}
              onChange={(v) => {
                setServices(v);
                setTimeout(autosave, 0);
              }}
              visaLocked={false}
            />
            {(services.allied_services.length > 0 || services.travel_services.length > 0) && (
              <div className="border-t pt-3 space-y-2">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Allied / Travel fees</div>
                {[...services.allied_services, ...services.travel_services].map((code) => {
                  const s = catalogue.find((c) => c.service_code === code);
                  const fee = serviceFees[code];
                  return (
                    <div key={code} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_auto] gap-3 items-center">
                      <div className="text-sm truncate">{s?.service_name ?? code}</div>
                      <Input
                        type="number"
                        placeholder="Amount ₹"
                        disabled={fee?.complimentary}
                        value={fee?.amount ?? ""}
                        onChange={(e) => updateServiceFee(code, { amount: Number(e.target.value || 0) })}
                        onBlur={autosave}
                      />
                      <label className="text-xs flex items-center gap-1.5">
                        <Checkbox
                          checked={!!fee?.complimentary}
                          onCheckedChange={(c) => {
                            updateServiceFee(code, { complimentary: !!c });
                            setTimeout(autosave, 0);
                          }}
                        />
                        Complimentary
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      case "intake":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Branch *</Label>
                <Select
                  value={f.branch ?? getLeadFields().branch ?? ""}
                  onValueChange={(v) => {
                    setField("branch", v);
                    setTimeout(autosave, 0);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.name}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select
                  value={f.department ?? getLeadFields().department ?? ""}
                  onValueChange={(v) => {
                    setField("department", v);
                    setTimeout(autosave, 0);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.name}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Intake / Session</Label>
                <Input
                  placeholder="e.g. Sep 2026"
                  value={f.intake ?? ""}
                  onChange={(e) => setField("intake", e.target.value)}
                  onBlur={autosave}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Interested Countries</Label>
              <InterestedCountriesPicker
                value={interestedCountries}
                onChange={(v) => {
                  setInterestedCountries(v);
                  setTimeout(autosave, 0);
                }}
              />
            </div>
          </div>
        );
      case "notes":
        return (
          <div className="space-y-4">
            {leadNotes && (
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Lead notes (read-only)</Label>
                <div className="text-sm whitespace-pre-wrap rounded-md border bg-muted/30 p-3 mt-1">{leadNotes}</div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                Counselor notes
                {f.counselor_notes_locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
              </Label>
              <Textarea
                rows={6}
                disabled={!!f.counselor_notes_locked}
                value={f.counselor_notes ?? ""}
                onChange={(e) => setField("counselor_notes", e.target.value)}
                onBlur={autosave}
                placeholder="Internal notes for counselors — not visible to client"
              />
              {f.counselor_notes_locked && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Reason to unlock…"
                    value={notesUnlockReason}
                    onChange={(e) => setNotesUnlockReason(e.target.value)}
                  />
                  <Button type="button" size="sm" variant="outline" onClick={unlockNotes}>
                    Unlock
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      case "portal":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Optionally create a client portal login so they can upload documents and view payments.
            </p>
            <label className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-muted/30">
              <Checkbox checked={portalEnabled} onCheckedChange={(c) => setPortalEnabled(!!c)} />
              <span className="text-sm font-medium">Create client login on registration</span>
            </label>
            {portalEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Client email</Label>
                  <div className="flex items-center gap-1">
                    <Input value={getLeadFields().email ?? f.email ?? ""} readOnly />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const email = getLeadFields().email ?? f.email;
                        if (email) {
                          navigator.clipboard.writeText(email);
                          toast.success("Copied");
                        }
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Access level</Label>
                  <Select value={portalAccessLevel} onValueChange={setPortalAccessLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PORTAL_ACCESS_LEVELS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        );
      case "billing":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tax ID / PAN</Label>
              <Input value={f.tax_id ?? ""} onChange={(e) => setField("tax_id", e.target.value)} onBlur={autosave} />
            </div>
            <div className="space-y-1.5">
              <Label>Client Type</Label>
              <Select
                value={f.client_type ?? ""}
                onValueChange={(v) => {
                  setField("client_type", v);
                  setTimeout(autosave, 0);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_TYPES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      default:
        return null;
    }
  })();

  return (
    <div className="col-span-full grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
      <RegistrationWorkspace
        sections={CLIENT_SECTIONS}
        activeId={activeSection}
        onSectionChange={setActiveSection}
        title="Client Registration"
        subtitle={
          regNumber
            ? `Lead ${leadNumber} → Client ${regNumber}`
            : `Complete each section to register lead ${leadNumber}`
        }
        footer={saveFooter}
      >
        {sectionContent}
      </RegistrationWorkspace>

      <div className="xl:sticky xl:top-4 xl:self-start space-y-3">
        <div className="rounded-lg border bg-card p-3 shadow-elev-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Invoice preview</div>
          {invoiceSection}
        </div>
      </div>
    </div>
  );
}
