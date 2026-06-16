import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Lock, ChevronLeft, UserCheck } from "lucide-react";

import { LeadModeToggle, type LeadMode } from "@/components/leads/LeadModeToggle";
import { RegionCountriesPicker } from "@/components/leads/RegionCountriesPicker";
import { ServiceTabs, type ServiceSelection } from "@/components/leads/ServiceTabs";
import { CountrySelect } from "@/components/leads/CountrySelect";
import { PhoneCodeSelect } from "@/components/leads/PhoneCodeSelect";
import {
  upsertLeadAutosave,
  fetchLead,
  fetchBranches,
  fetchDepartments,
  suggestDepartmentFromServices,
  type LeadDraft,
  type Branch,
  type Department,
} from "@/lib/leads";
import { prefillFromLead, type ClientDraft } from "@/lib/clientRegistration";
import { leadColdSchema, leadWarmHotSchema, GENDERS, MARITAL_STATUSES } from "@/lib/leadSchemas";
import { useMasterItems, useMasterLabels } from "@/lib/masters";
import { dialCodeFor } from "@/lib/countryCodes";
import { buildServiceLibraryUrl } from "@/lib/service-library/serviceCodes";
import { ContextBackBar } from "@/components/navigation/ContextBackBar";
import { formatSupabaseError } from "@/lib/formatSupabaseError";
import {
  ClientRegistrationPanel,
  type LeadFieldSnapshot,
} from "@/components/crm/ClientRegistrationPanel";
import { LeadSummaryStrip } from "@/components/crm/LeadSummaryStrip";
import { cn } from "@/lib/utils";

const VISA_LOCK_TEMPLATE = (reason: string) =>
  `Visa not pursued at this stage. Reason: ${reason || "(please specify)"}\n\nFollow-up: Re-engage when visa interest is expressed.\n\n`;

type RegistrationPhase = "lead" | "client";

const LeadNew = () => {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const editId = sp.get("id") ?? sp.get("lead_id");
  const slCountry = sp.get("country");
  const slVisaService = sp.get("visa_service");
  const slServiceLabel = sp.get("service_label");
  const slLibraryId = sp.get("library_id");
  const slSubService = sp.get("sub_service");
  const registerClientParam = sp.get("register_client") === "1";
  const initialMode: LeadMode = sp.get("mode") === "cold" ? "cold" : "warm_hot";

  const [mode, setMode] = useState<LeadMode>(initialMode);
  const [phase, setPhase] = useState<RegistrationPhase>(registerClientParam ? "client" : "lead");
  const [leadId, setLeadId] = useState<string | null>(editId);
  const [leadNumber, setLeadNumber] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [clientSaving, setClientSaving] = useState(false);
  const [convertedClientId, setConvertedClientId] = useState<string | null>(null);
  const [initialClientDraft, setInitialClientDraft] = useState<ClientDraft | undefined>();
  const clientSectionRef = useRef<HTMLDivElement>(null);

  const [f, setF] = useState<Record<string, unknown>>({});
  const [services, setServices] = useState<ServiceSelection>({
    coaching_services: [], visa_services: [], admission_services: [], allied_services: [], travel_services: [],
  });
  const [interestedCountries, setInterestedCountries] = useState<string[]>([]);
  const [visaLocked, setVisaLocked] = useState(false);
  const [visaLockReason, setVisaLockReason] = useState("");
  const [notes, setNotes] = useState("");

  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const lead_sources = useMasterLabels("lead_sources" as never);
  const qualificationLevels = useMasterItems("qualification_levels");
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchBranches().then(setBranches);
    fetchDepartments().then(setDepartments);
  }, []);

  useEffect(() => {
    if (editId || leadId) return;
    if (slCountry) setInterestedCountries([slCountry]);
    if (slVisaService) {
      setServices((s) => ({
        ...s,
        visa_services: s.visa_services?.length ? s.visa_services : [slVisaService],
      }));
    }
    if (slLibraryId || slServiceLabel) {
      const line = [
        slServiceLabel ? `Service Library: ${slServiceLabel}` : null,
        slLibraryId ? `library_id=${slLibraryId}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      setNotes((n) => (n ? `${n}\n${line}` : line));
    }
  }, [slCountry, slVisaService, slServiceLabel, slLibraryId, editId, leadId]);

  const hydrateLeadForm = useCallback((l: Awaited<ReturnType<typeof fetchLead>>) => {
    if (!l) return;
    setLeadId(l.id);
    setLeadNumber(l.lead_number);
    setMode(l.lead_type === "cold" || l.is_cold_pool ? "cold" : "warm_hot");
    setF({
      first_name: l.first_name, middle_name: l.middle_name, last_name: l.last_name,
      email: l.email, phone: l.phone, phone_country_code: l.phone_country_code,
      gender: l.gender, marital_status: l.marital_status,
      country_of_citizenship: l.country_of_citizenship, country_of_residence: l.country_of_residence,
      last_education: l.last_education, last_education_other: l.last_education_other,
      start_timeline: l.start_timeline, lead_source: l.lead_source,
      lead_temperature: l.lead_temperature, branch: l.branch, department: l.department,
      cold_pool_campaign: l.cold_pool_campaign,
    });
    setServices({
      coaching_services: l.coaching_services ?? [],
      visa_services: l.visa_services ?? [],
      admission_services: l.admission_services ?? [],
      allied_services: l.allied_services ?? [],
      travel_services: [],
    });
    setInterestedCountries(l.interested_countries ?? []);
    setVisaLocked(l.visa_locked);
    setVisaLockReason(l.visa_lock_reason ?? "");
    setNotes(l.notes ?? "");
    if (l.converted_to_client_id) {
      setConvertedClientId(l.converted_to_client_id);
      setInitialClientDraft(prefillFromLead(l));
    }
  }, []);

  useEffect(() => {
    if (!editId) return;
    fetchLead(editId).then(hydrateLeadForm);
  }, [editId, hydrateLeadForm]);

  const setField = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  const buildDraft = (): LeadDraft => {
    const isCold = mode === "cold";
    return {
      ...(f as object),
      lead_type: isCold ? "cold" : ((f.lead_temperature as string) === "hot" ? "hot" : "warm"),
      lead_temperature: isCold ? "cold" : (((f.lead_temperature as string) || "warm") as never),
      is_cold_pool: isCold,
      coaching_services: services.coaching_services,
      visa_services: services.visa_services,
      admission_services: services.admission_services,
      allied_services: services.allied_services,
      interested_countries: interestedCountries,
      visa_locked: visaLocked,
      visa_lock_reason: visaLocked ? visaLockReason : null,
      notes,
    } as LeadDraft;
  };

  const getLeadFields = useCallback((): LeadFieldSnapshot => ({
    first_name: (f.first_name as string) || undefined,
    middle_name: (f.middle_name as string) || null,
    last_name: (f.last_name as string) || undefined,
    email: (f.email as string) || null,
    phone: (f.phone as string) || null,
    phone_country_code: (f.phone_country_code as string) || null,
    gender: (f.gender as string) || null,
    marital_status: (f.marital_status as string) || null,
    country_of_citizenship: (f.country_of_citizenship as string) || null,
    country_of_residence: (f.country_of_residence as string) || null,
    last_education: (f.last_education as string) || null,
    last_education_other: (f.last_education_other as string) || null,
    branch: (f.branch as string) || null,
    department: (f.department as string) || null,
    coaching_services: services.coaching_services,
    visa_services: services.visa_services,
    admission_services: services.admission_services,
    allied_services: services.allied_services,
    travel_services: services.travel_services,
    interested_countries: interestedCountries,
  }), [f, services, interestedCountries]);

  const autosave = async (): Promise<string | null> => {
    if (!leadId) {
      const fn = (f.first_name as string)?.trim();
      const ln = (f.last_name as string)?.trim();
      if (!fn || !ln) return null;
    }
    setSaving(true);
    try {
      const saved = await upsertLeadAutosave(leadId, buildDraft());
      if (!leadId) {
        setLeadId(saved.id);
        setLeadNumber(saved.lead_number);
        toast.success(`Lead created: ${saved.lead_number}`);
      }
      return saved.id;
    } catch (e: unknown) {
      const msg = formatSupabaseError(e, "Save failed");
      console.error("[lead autosave]", e);
      toast.error(msg);
      return null;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const cor = f.country_of_residence as string | undefined;
    if (cor && !f.phone_country_code) {
      const code = dialCodeFor(cor);
      if (code) setField("phone_country_code", `+${code}`);
    }
  }, [f.country_of_residence]); // eslint-disable-line react-hooks/exhaustive-deps

  const suggestedDept = useMemo(() => {
    return suggestDepartmentFromServices({
      coaching: services.coaching_services.length > 0,
      visa: services.visa_services.length > 0 || visaLocked,
      admission: services.admission_services.length > 0,
      allied: services.allied_services.length > 0,
      travel: services.travel_services.length > 0,
    }, departments);
  }, [services, visaLocked, departments]);

  useEffect(() => {
    if (suggestedDept && !f.department) setField("department", suggestedDept);
  }, [suggestedDept]); // eslint-disable-line

  const onToggleVisaLock = (checked: boolean) => {
    setVisaLocked(checked);
    if (checked) {
      setServices((s) => ({ ...s, visa_services: [] }));
      setTimeout(() => {
        notesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        notesRef.current?.focus();
        if (!notes.trim()) {
          setNotes(VISA_LOCK_TEMPLATE(visaLockReason));
        }
      }, 60);
    }
  };

  const enterClientPhase = async () => {
    let id = leadId;
    if (!id) {
      id = await autosave();
      if (!id) {
        toast.error("Enter first and last name to save the lead first");
        return;
      }
    } else {
      await autosave();
    }

    const lead = await fetchLead(id);
    if (!lead) {
      toast.error("Lead not found");
      return;
    }
    if (lead.converted_to_client_id) {
      nav(`/clients/${lead.converted_to_client_id}`);
      return;
    }

    setInitialClientDraft(prefillFromLead(lead));
    setPhase("client");
    setTimeout(() => clientSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  useEffect(() => {
    if (!registerClientParam || !editId) return;
    if (convertedClientId) return;
    if (phase === "client" && initialClientDraft) return;
    if (leadId && leadNumber) {
      void enterClientPhase();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerClientParam, editId, leadId, leadNumber, convertedClientId]);

  useEffect(() => {
    if (phase !== "client" || !leadId || initialClientDraft) return;
    fetchLead(leadId).then((lead) => {
      if (!lead) return;
      if (lead.converted_to_client_id) {
        setConvertedClientId(lead.converted_to_client_id);
      }
      setInitialClientDraft(prefillFromLead(lead));
    });
  }, [phase, leadId, initialClientDraft]);

  const validateAndSubmit = async () => {
    const draft = buildDraft();
    const payload = mode === "cold"
      ? leadColdSchema.safeParse({ ...draft })
      : leadWarmHotSchema.safeParse({ ...draft, travel_services: services.travel_services });
    if (!payload.success) {
      const first = payload.error.errors[0];
      toast.error(first.message);
      return;
    }
    setSaving(true);
    try {
      const saved = await upsertLeadAutosave(leadId, draft);
      toast.success(`Saved ${saved.lead_number}`);
      nav(`/leads/${saved.id}`);
    } catch (e) {
      toast.error(formatSupabaseError(e, "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const isCold = mode === "cold";
  const isClientPhase = phase === "client";

  const personalFields = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="space-y-1.5">
        <Label>First Name *</Label>
        <Input value={(f.first_name as string) || ""} onChange={(e) => setField("first_name", e.target.value)} onBlur={autosave} />
      </div>
      <div className="space-y-1.5">
        <Label>Middle Name</Label>
        <Input value={(f.middle_name as string) || ""} onChange={(e) => setField("middle_name", e.target.value)} onBlur={autosave} />
      </div>
      <div className="space-y-1.5">
        <Label>Last Name *</Label>
        <Input value={(f.last_name as string) || ""} onChange={(e) => setField("last_name", e.target.value)} onBlur={autosave} />
      </div>
      {!isCold && (
        <>
          <div className="space-y-1.5">
            <Label>Gender *</Label>
            <Select value={(f.gender as string) || ""} onValueChange={(v) => { setField("gender", v); setTimeout(autosave, 0); }}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => <SelectItem key={g} value={g} className="capitalize">{g.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Marital Status</Label>
            <Select value={(f.marital_status as string) || ""} onValueChange={(v) => { setField("marital_status", v); setTimeout(autosave, 0); }}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                {MARITAL_STATUSES.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div />
        </>
      )}
      <div className="space-y-1.5">
        <Label>Email {isCold ? "" : "*"}</Label>
        <Input type="email" value={(f.email as string) || ""} onChange={(e) => setField("email", e.target.value)} onBlur={autosave} />
      </div>
      <div className="space-y-1.5">
        <Label>Phone Code</Label>
        <PhoneCodeSelect value={(f.phone_country_code as string) || ""} onChange={(v) => { setField("phone_country_code", v); setTimeout(autosave, 0); }} />
      </div>
      <div className="space-y-1.5">
        <Label>Phone {isCold ? "" : "*"}</Label>
        <Input value={(f.phone as string) || ""} onChange={(e) => setField("phone", e.target.value)} onBlur={autosave} />
      </div>
    </div>
  );

  const visaLockBlock = (
    <div className="border-t pt-4 space-y-3">
      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox checked={visaLocked} onCheckedChange={(c) => onToggleVisaLock(!!c)} />
        <div className="space-y-1">
          <div className="text-sm font-medium flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> Lock visa services (not pursuing visa)
          </div>
          <div className="text-xs text-muted-foreground">Greys out the Visa tab and requires a reason in notes.</div>
        </div>
      </label>
      {visaLocked && (
        <div className="space-y-1.5 ml-8">
          <Label>Reason *</Label>
          <Input value={visaLockReason} onChange={(e) => setVisaLockReason(e.target.value)} onBlur={autosave} placeholder="e.g. Coaching only" />
        </div>
      )}
    </div>
  );

  return (
    <AppLayout>
      <ContextBackBar
        libraryId={slLibraryId}
        country={slCountry}
        fallbackLabel="All leads"
        fallbackHref="/leads"
      />
      <PageHeader
        title={isClientPhase ? "Register Client" : editId ? "Edit Lead" : "New Lead"}
        description={
          isClientPhase
            ? "Complete the additional sections below to register this lead as a client."
            : leadNumber
              ? `Lead # ${leadNumber}`
              : "Start with lead details. Click Register as Client when they confirm they want to proceed."
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {(saving || clientSaving) && (
              <span className="text-xs text-muted-foreground">Saving…</span>
            )}
            {slLibraryId ? (
              <Button
                variant="outline"
                onClick={() => nav(buildServiceLibraryUrl({ libraryId: slLibraryId, country: slCountry }))}
              >
                <ChevronLeft className="size-4 mr-1" />
                Service Library
              </Button>
            ) : (
              <Button variant="outline" onClick={() => nav(isCold ? "/leads/cold" : "/leads")}>
                Cancel
              </Button>
            )}
            {!isClientPhase && (
              <>
                <Button
                  variant="secondary"
                  onClick={enterClientPhase}
                  disabled={saving || (!(f.first_name as string)?.trim() || !(f.last_name as string)?.trim())}
                  title={
                    !(f.first_name as string)?.trim() || !(f.last_name as string)?.trim()
                      ? "Enter first and last name first"
                      : "Unlock client registration sections"
                  }
                >
                  <UserCheck className="size-4 mr-1" />
                  Register as Client
                </Button>
                <Button onClick={validateAndSubmit}>Save &amp; View</Button>
              </>
            )}
            {isClientPhase && convertedClientId && (
              <Button variant="outline" onClick={() => nav(`/clients/${convertedClientId}`)}>
                View Client
              </Button>
            )}
          </div>
        }
      />
      <div
        className={cn(
          "p-3 sm:p-6 mx-auto space-y-6",
          isClientPhase ? "max-w-7xl" : "max-w-5xl",
        )}
      >
        {!isClientPhase ? (
          <Card className="p-3 bg-muted/40 border-dashed text-sm text-muted-foreground">
            Capture lead details first. When the person confirms they want to proceed, click{" "}
            <span className="font-semibold text-foreground">Register as Client</span> to unlock
            academics, family, and invoice sections.
            {leadNumber && (
              <span className="block mt-1 text-foreground/80">Lead # {leadNumber} · autosaves when you leave a field</span>
            )}
          </Card>
        ) : !leadId ? (
          <Card className="p-3 bg-amber-500/10 border-amber-500/30 text-sm">
            Enter first and last name — the lead saves on blur, then client registration sections appear below.
          </Card>
        ) : null}

        {!isClientPhase && (
          <>
            <div className="flex items-center justify-between gap-4">
              <LeadModeToggle value={mode} onChange={setMode} disabled={!!leadId} />
              {leadId && <span className="text-xs text-muted-foreground">Mode locked after first save</span>}
            </div>

            <Card className="p-4 sm:p-6 space-y-4">
              <h3 className="font-semibold">1. Personal Information</h3>
              {personalFields}
            </Card>

            {!isCold && (
              <>
                <Card className="p-4 sm:p-6 space-y-4">
                  <h3 className="font-semibold">2. Geography</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Country of Citizenship *</Label>
                      <CountrySelect value={(f.country_of_citizenship as string) || ""} onChange={(v) => { setField("country_of_citizenship", v); setTimeout(autosave, 0); }} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Country of Residence *</Label>
                      <CountrySelect value={(f.country_of_residence as string) || ""} onChange={(v) => { setField("country_of_residence", v); setTimeout(autosave, 0); }} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Countries of Interest *</Label>
                    <RegionCountriesPicker value={interestedCountries} onChange={(v) => { setInterestedCountries(v); setTimeout(autosave, 0); }} />
                  </div>
                </Card>

                <Card className="p-4 sm:p-6 space-y-4">
                  <h3 className="font-semibold">3. Background</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label>Last Education</Label>
                      <Select value={(f.last_education as string) || ""} onValueChange={(v) => { setField("last_education", v); setTimeout(autosave, 0); }}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{qualificationLevels.map((q) => <SelectItem key={q.code} value={q.code}>{q.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {String(f.last_education ?? "").toLowerCase() === "other" && (
                      <div className="space-y-1.5">
                        <Label>Specify</Label>
                        <Input value={(f.last_education_other as string) || ""} onChange={(e) => setField("last_education_other", e.target.value)} onBlur={autosave} />
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="p-4 sm:p-6 space-y-4">
                  <h3 className="font-semibold">4. Services Required *</h3>
                  <ServiceTabs
                    value={services}
                    onChange={(v) => { setServices(v); setTimeout(autosave, 0); }}
                    visaLocked={visaLocked}
                    interestedCountries={interestedCountries}
                  />
                  {visaLockBlock}
                </Card>

                <Card className="p-4 sm:p-6 space-y-4">
                  <h3 className="font-semibold">5. Assignment</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label>Branch</Label>
                      <Select value={(f.branch as string) || ""} onValueChange={(v) => { setField("branch", v); setTimeout(autosave, 0); }}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Department {suggestedDept && f.department !== suggestedDept && <span className="text-xs text-muted-foreground">(suggested: {suggestedDept})</span>}</Label>
                      <Select value={(f.department as string) || ""} onValueChange={(v) => { setField("department", v); setTimeout(autosave, 0); }}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Temperature</Label>
                      <Select value={(f.lead_temperature as string) || "warm"} onValueChange={(v) => { setField("lead_temperature", v); setTimeout(autosave, 0); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="warm">Warm</SelectItem>
                          <SelectItem value="hot">Hot</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Lead Source</Label>
                      <Select value={(f.lead_source as string) || ""} onValueChange={(v) => { setField("lead_source", v); setTimeout(autosave, 0); }}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{lead_sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {isCold && (
              <Card className="p-4 sm:p-6 space-y-4">
                <h3 className="font-semibold">Cold Pool Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Campaign / List Name</Label>
                    <Input value={(f.cold_pool_campaign as string) || ""} onChange={(e) => setField("cold_pool_campaign", e.target.value)} onBlur={autosave} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Lead Source</Label>
                    <Select value={(f.lead_source as string) || ""} onValueChange={(v) => { setField("lead_source", v); setTimeout(autosave, 0); }}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{lead_sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cold leads only need first name, last name, and one of email/phone. Click Register as Client when they show interest.
                </p>
              </Card>
            )}

            <Card className="p-6 space-y-3">
              <h3 className="font-semibold">{isCold ? "Notes" : "6. Notes"}</h3>
              <Textarea
                ref={notesRef}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={autosave}
                rows={6}
                placeholder="Counsellor notes, follow-up plan, special considerations…"
              />
            </Card>
          </>
        )}

        {isClientPhase && (
          <>
            <LeadSummaryStrip
              leadNumber={leadNumber ?? "—"}
              fields={getLeadFields()}
              notes={notes}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <LeadModeToggle value={mode} onChange={setMode} disabled />
                  <span className="text-xs text-muted-foreground">Lead fields (autosave on blur)</span>
                </div>
                {personalFields}
                {!isCold && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                      <div className="space-y-1.5">
                        <Label>Branch</Label>
                        <Select value={(f.branch as string) || ""} onValueChange={(v) => { setField("branch", v); setTimeout(autosave, 0); }}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Department</Label>
                        <Select value={(f.department as string) || ""} onValueChange={(v) => { setField("department", v); setTimeout(autosave, 0); }}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <ServiceTabs
                      value={services}
                      onChange={(v) => { setServices(v); setTimeout(autosave, 0); }}
                      visaLocked={visaLocked}
                      interestedCountries={interestedCountries}
                    />
                  </>
                )}
              </div>
            </LeadSummaryStrip>

            {leadId && leadNumber && (
              <div ref={clientSectionRef}>
                <ClientRegistrationPanel
                  leadId={leadId}
                  leadNumber={leadNumber}
                  leadNotes={notes}
                  isColdLead={isCold}
                  getLeadFields={getLeadFields}
                  initialClientDraft={initialClientDraft}
                  existingClientId={convertedClientId}
                  slCountry={slCountry}
                  slVisaService={slVisaService}
                  slServiceLabel={slServiceLabel}
                  slLibraryId={slLibraryId}
                  slSubService={slSubService}
                  onClientIdChange={setConvertedClientId}
                  onSavingChange={setClientSaving}
                />
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default LeadNew;
