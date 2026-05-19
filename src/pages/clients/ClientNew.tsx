import { useEffect, useMemo, useRef, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Lock, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { CountrySelect } from "@/components/leads/CountrySelect";
import { PhoneCodeSelect } from "@/components/leads/PhoneCodeSelect";
import { InterestedCountriesPicker } from "@/components/leads/InterestedCountriesPicker";
import { ServiceTabs, type ServiceSelection } from "@/components/leads/ServiceTabs";
import { FamilyMembersSection } from "@/components/clients/registration/FamilyMembersSection";
import { InvoicePreviewSection } from "@/components/clients/registration/InvoicePreviewSection";

import {
  upsertClientRegistration,
  fetchClient,
  prefillFromLead,
  createDraftInvoice,
  type ClientRow,
  type ClientDraft,
  type FamilyMember,
  type InvoiceLineDraft,
} from "@/lib/clientRegistration";
import { fetchLead, fetchBranches, fetchDepartments, fetchAllServiceCatalogue, type Branch, type Department, type ServiceCatalogueItem } from "@/lib/leads";
import { GENDERS, MARITAL_STATUSES } from "@/lib/leadSchemas";
import { useMasterItems } from "@/lib/masters";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const ENGLISH_TESTS = ["IELTS", "PTE", "TOEFL", "CELPIP", "Duolingo", "None"];
const OTHER_TESTS = ["GRE", "GMAT", "SAT", "DELF", "TestDaF"];
const CLIENT_TYPES = ["Student", "Corporate", "Partner", "Referral", "B2B"];
const PORTAL_ACCESS_LEVELS = [
  { value: "standard", label: "Standard — profile, docs, payments, messages" },
  { value: "limited", label: "Limited — payments & messages only" },
];

const ClientNew = () => {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const leadIdParam = sp.get("lead_id");
  const editId = sp.get("id");
  const { hasRole, isAdmin } = useAuth();
  const isCounselor = isAdmin || hasRole(["counselor", "admin"]);

  const [clientId, setClientId] = useState<string | null>(editId);
  const [regNumber, setRegNumber] = useState<string | null>(null);
  const [sourceLead, setSourceLead] = useState<{ id: string; lead_number: string } | null>(null);

  const [f, setF] = useState<ClientDraft>({});
  const [services, setServices] = useState<ServiceSelection>({
    coaching_services: [], visa_services: [], admission_services: [], allied_services: [], travel_services: [],
  });
  const [interestedCountries, setInterestedCountries] = useState<string[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [otherTests, setOtherTests] = useState<Array<{ type: string; score?: string; date?: string }>>([]);
  const [paymentTerms, setPaymentTerms] = useState<string>("DUE_ON_RECEIPT");
  const [billingEntity, setBillingEntity] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Portal
  const [portalEnabled, setPortalEnabled] = useState(false);
  const [portalAccessLevel, setPortalAccessLevel] = useState<string>("standard");

  // Notes lock UX
  const [notesUnlockReason, setNotesUnlockReason] = useState<string>("");

  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [catalogue, setCatalogue] = useState<ServiceCatalogueItem[]>([]);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; country: string | null; category: string | null }>>([]);
  const qualificationLevels = useMasterItems("qualification_levels");
  const leadNotesRef = useRef<string>("");

  useEffect(() => {
    fetchBranches().then(setBranches);
    fetchDepartments().then(setDepartments);
    fetchAllServiceCatalogue().then(setCatalogue).catch(() => setCatalogue([]));
    supabase.from("workflow_templates").select("id,name,country,category").then(({ data }) => setTemplates(data ?? []));
  }, []);

  // Prefill from lead
  useEffect(() => {
    if (!leadIdParam || clientId) return;
    fetchLead(leadIdParam).then((lead) => {
      if (!lead) { toast.error("Lead not found"); return; }
      setSourceLead({ id: lead.id, lead_number: lead.lead_number });
      leadNotesRef.current = lead.notes ?? "";
      const pre = prefillFromLead(lead);
      setF(pre);
      setInterestedCountries(lead.interested_countries ?? []);
      setServices({
        coaching_services: lead.coaching_services ?? [],
        visa_services: lead.visa_services ?? [],
        admission_services: lead.admission_services ?? [],
        allied_services: lead.allied_services ?? [],
        travel_services: [],
      });
    });
  }, [leadIdParam, clientId]);

  // Load existing client
  useEffect(() => {
    if (!editId) return;
    fetchClient(editId).then((c) => {
      if (!c) return;
      setClientId(c.id);
      setRegNumber(c.registration_number ?? null);
      setF(c);
      setInterestedCountries(c.interested_countries ?? []);
      setOtherTests(c.other_tests ?? []);
      setServices({
        coaching_services: c.coaching_services ?? [],
        visa_services: c.visa_services ?? [],
        admission_services: c.admission_services ?? [],
        allied_services: c.allied_services ?? [],
        travel_services: c.travel_financial_services ?? [],
      });
      setPaymentTerms(c.payment_terms ?? "DUE_ON_RECEIPT");
      setBillingEntity(c.billing_entity ?? "");
    });
  }, [editId]);

  const setField = <K extends keyof ClientDraft>(k: K, v: ClientDraft[K]) => setF((p) => ({ ...p, [k]: v }));

  const buildDraft = (): ClientDraft => ({
    ...f,
    interested_countries: interestedCountries,
    coaching_services: services.coaching_services,
    visa_services: services.visa_services,
    admission_services: services.admission_services,
    allied_services: services.allied_services,
    travel_financial_services: services.travel_services,
    other_tests: otherTests,
    payment_terms: paymentTerms,
    billing_entity: billingEntity || null,
  });

  const autosave = async () => {
    const fn = (f.first_name ?? "").trim();
    const ln = (f.last_name ?? "").trim();
    if (!clientId && (!fn || !ln)) return;
    setSaving(true);
    try {
      const saved = await upsertClientRegistration(clientId, buildDraft());
      if (!clientId) {
        setClientId(saved.id);
        setRegNumber(saved.registration_number ?? null);
        toast.success(`Client created: ${saved.registration_number ?? saved.application_id ?? saved.id}`);
      }
    } catch (e) {
      console.error("[client autosave]", e);
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const primaryName = useMemo(() =>
    [f.first_name, f.middle_name, f.last_name].filter(Boolean).join(" ") || "Primary applicant",
  [f.first_name, f.middle_name, f.last_name]);

  const serviceFees = (f.service_fees ?? {}) as Record<string, { amount: number; complimentary?: boolean }>;
  const updateServiceFee = (code: string, patch: Partial<{ amount: number; complimentary: boolean }>) => {
    const next = { ...(f.service_fees ?? {}) };
    next[code] = { ...(next[code] ?? { amount: 0 }), ...patch };
    setField("service_fees", next as never);
  };

  const handleCreateInvoice = async (lines: InvoiceLineDraft[]) => {
    if (!clientId) { toast.error("Save the client first"); return; }
    if (!f.first_name || !f.last_name) { toast.error("Name required"); return; }
    setCreating(true);
    try {
      // Final save
      await upsertClientRegistration(clientId, buildDraft());
      const res = await createDraftInvoice({
        client_id: clientId,
        client_name: primaryName,
        entity: billingEntity || null,
        payment_terms: paymentTerms,
        lines,
      });
      // Portal access
      if (portalEnabled && f.email) {
        try {
          await supabase.functions.invoke("client-portal-invite-create", {
            body: { client_id: clientId, email: f.email, access_level: portalAccessLevel },
          });
          toast.success(`Login credentials sent to ${f.email}`);
        } catch (e) {
          console.warn("portal invite failed", e);
          toast.warning("Client saved but portal invite could not be sent");
        }
      }
      toast.success(`Client ${regNumber ?? clientId} created. Draft invoice ${res.invoice_number} ready.`);
      nav(`/clients/${clientId}`);
    } catch (e) {
      console.error("[create invoice]", e);
      toast.error(e instanceof Error ? e.message : "Failed to create invoice");
    } finally {
      setCreating(false);
    }
  };

  const unlockNotes = () => {
    if (!notesUnlockReason.trim()) { toast.error("Reason required to unlock notes"); return; }
    setField("counselor_notes_locked", false as never);
    setTimeout(autosave, 0);
  };

  const englishTest = (f.english_test ?? "") as string;

  return (
    <AppLayout>
      <PageHeader
        title={editId ? "Edit Client" : "New Client"}
        description={regNumber ? `Client # ${regNumber}` : "Auto-saves on blur once name is entered."}
        actions={
          <div className="flex items-center gap-2">
            {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
            <Button variant="outline" onClick={() => nav("/clients")}>Cancel</Button>
          </div>
        }
      />
      <div className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {sourceLead && (
            <Card className="p-3 bg-primary/5 border-primary/20 flex items-center justify-between">
              <div className="text-sm">Converting lead: <span className="font-mono font-semibold">{sourceLead.lead_number}</span></div>
              <Button variant="ghost" size="sm" onClick={() => nav(`/leads/${sourceLead.id}`)}>
                View lead <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </Card>
          )}

          {/* SECTION 1 — Personal */}
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">1. Personal Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>First Name *</Label>
                <Input value={f.first_name ?? ""} onChange={(e) => setField("first_name", e.target.value)} onBlur={autosave} />
              </div>
              <div className="space-y-1.5">
                <Label>Middle Name</Label>
                <Input value={f.middle_name ?? ""} onChange={(e) => setField("middle_name", e.target.value)} onBlur={autosave} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name *</Label>
                <Input value={f.last_name ?? ""} onChange={(e) => setField("last_name", e.target.value)} onBlur={autosave} />
              </div>
              <div className="space-y-1.5">
                <Label>Date of Birth *</Label>
                <Input type="date" value={f.date_of_birth ?? ""} onChange={(e) => setField("date_of_birth", e.target.value || null)} onBlur={autosave} />
              </div>
              <div className="space-y-1.5">
                <Label>Gender *</Label>
                <Select value={f.gender ?? ""} onValueChange={(v) => { setField("gender", v); setTimeout(autosave, 0); }}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => <SelectItem key={g} value={g} className="capitalize">{g.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Marital Status</Label>
                <Select value={f.marital_status ?? ""} onValueChange={(v) => { setField("marital_status", v); setTimeout(autosave, 0); }}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    {MARITAL_STATUSES.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Phone Code</Label>
                <PhoneCodeSelect value={f.phone_country_code ?? ""} onChange={(v) => { setField("phone_country_code", v); setTimeout(autosave, 0); }} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input value={f.phone ?? ""} onChange={(e) => setField("phone", e.target.value)} onBlur={autosave} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone (alternate)</Label>
                <Input value={f.phone_alternate ?? ""} onChange={(e) => setField("phone_alternate", e.target.value)} onBlur={autosave} />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" value={f.email ?? ""} onChange={(e) => setField("email", e.target.value)} onBlur={autosave} />
              </div>
              <div className="space-y-1.5">
                <Label>Email (alternate)</Label>
                <Input type="email" value={f.email_alternate ?? ""} onChange={(e) => setField("email_alternate", e.target.value)} onBlur={autosave} />
              </div>
              <div className="space-y-1.5">
                <Label>Country of Citizenship *</Label>
                <CountrySelect value={f.country_of_citizenship ?? ""} onChange={(v) => { setField("country_of_citizenship", v); setTimeout(autosave, 0); }} />
              </div>
              <div className="space-y-1.5">
                <Label>Country of Residence *</Label>
                <CountrySelect value={f.country_of_residence ?? ""} onChange={(v) => { setField("country_of_residence", v); setTimeout(autosave, 0); }} />
              </div>
              <div className="space-y-1.5">
                <Label>Passport Number</Label>
                <Input value={f.passport_number ?? ""} onChange={(e) => setField("passport_number", e.target.value)} onBlur={autosave} />
              </div>
              <div className="space-y-1.5">
                <Label>Passport Expiry</Label>
                <Input type="date" value={f.passport_expiry ?? ""} onChange={(e) => setField("passport_expiry", e.target.value || null)} onBlur={autosave} />
              </div>
              <div className="space-y-1.5">
                <Label>National ID / Aadhar (last 4)</Label>
                <Input maxLength={4} value={f.national_id_last4 ?? ""} onChange={(e) => setField("national_id_last4", e.target.value.replace(/\D/g, "").slice(0, 4))} onBlur={autosave} />
              </div>
              <div className="space-y-1.5">
                <Label>PAN</Label>
                <Input value={f.pan_number ?? ""} onChange={(e) => setField("pan_number", e.target.value.toUpperCase())} onBlur={autosave} />
              </div>
            </div>
          </Card>

          {/* SECTION 2 — Education */}
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">2. Education &amp; Test Scores</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Last Education</Label>
                <Select value={f.last_education ?? ""} onValueChange={(v) => { setField("last_education", v); setTimeout(autosave, 0); }}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {qualificationLevels.map((q) => <SelectItem key={q.code} value={q.code}>{q.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Institution Name</Label>
                <Input value={f.institution_name ?? ""} onChange={(e) => setField("institution_name", e.target.value)} onBlur={autosave} />
              </div>
              <div className="space-y-1.5">
                <Label>Year of Passing</Label>
                <Input type="number" value={f.year_of_passing ?? ""} onChange={(e) => setField("year_of_passing", e.target.value ? Number(e.target.value) : null)} onBlur={autosave} />
              </div>
              <div className="space-y-1.5">
                <Label>Percentage / CGPA</Label>
                <Input value={f.percentage_cgpa ?? ""} onChange={(e) => setField("percentage_cgpa", e.target.value)} onBlur={autosave} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>English Test</Label>
              <div className="flex flex-wrap gap-1.5">
                {ENGLISH_TESTS.map((t) => (
                  <Button key={t} type="button" size="sm" variant={englishTest === t ? "default" : "outline"} onClick={() => { setField("english_test", t === englishTest ? null : t); setTimeout(autosave, 0); }}>
                    {t}
                  </Button>
                ))}
              </div>
              {englishTest && englishTest !== "None" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <Label>Overall Score</Label>
                    <Input value={f.english_overall ?? ""} onChange={(e) => setField("english_overall", e.target.value)} onBlur={autosave} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Test Date</Label>
                    <Input type="date" value={f.english_test_date ?? ""} onChange={(e) => setField("english_test_date", e.target.value || null)} onBlur={autosave} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Expiry Date</Label>
                    <Input type="date" value={f.english_test_expiry ?? ""} onChange={(e) => setField("english_test_expiry", e.target.value || null)} onBlur={autosave} />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 border-t pt-3">
              <Label>Other Tests (optional)</Label>
              <div className="flex flex-wrap gap-1.5">
                {OTHER_TESTS.map((t) => {
                  const sel = otherTests.find((x) => x.type === t);
                  return (
                    <Button key={t} type="button" size="sm" variant={sel ? "default" : "outline"} onClick={() => {
                      const next = sel ? otherTests.filter((x) => x.type !== t) : [...otherTests, { type: t, score: "", date: "" }];
                      setOtherTests(next); setTimeout(autosave, 0);
                    }}>{t}</Button>
                  );
                })}
              </div>
              {otherTests.map((ot, idx) => (
                <div key={ot.type} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end pt-1">
                  <div className="text-sm font-medium">{ot.type}</div>
                  <Input placeholder="Score" value={ot.score ?? ""} onChange={(e) => {
                    const next = [...otherTests]; next[idx] = { ...ot, score: e.target.value }; setOtherTests(next);
                  }} onBlur={autosave} />
                  <Input type="date" value={ot.date ?? ""} onChange={(e) => {
                    const next = [...otherTests]; next[idx] = { ...ot, date: e.target.value }; setOtherTests(next); setTimeout(autosave, 0);
                  }} />
                </div>
              ))}
            </div>
          </Card>

          {/* SECTION 3 — Family */}
          <FamilyMembersSection
            primaryClientId={clientId}
            primaryLeadId={sourceLead?.id ?? null}
            onChange={setFamilyMembers}
          />

          {/* SECTION 4 — Services */}
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">4. Services Confirmed</h3>
            <ServiceTabs value={services} onChange={(v) => { setServices(v); setTimeout(autosave, 0); }} visaLocked={false} />
            {(services.allied_services.length > 0 || services.travel_services.length > 0) && (
              <div className="border-t pt-3 space-y-2">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Allied / Travel &amp; Financial fees</div>
                {[...services.allied_services, ...services.travel_services].map((code) => {
                  const s = catalogue.find((c) => c.service_code === code);
                  const fee = serviceFees[code];
                  return (
                    <div key={code} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_auto] gap-3 items-center">
                      <div className="text-sm truncate">{s?.service_name ?? code}</div>
                      <Input type="number" placeholder="Amount ₹" disabled={fee?.complimentary} value={fee?.amount ?? ""} onChange={(e) => updateServiceFee(code, { amount: Number(e.target.value || 0) })} onBlur={autosave} />
                      <label className="text-xs flex items-center gap-1.5">
                        <Checkbox checked={!!fee?.complimentary} onCheckedChange={(c) => { updateServiceFee(code, { complimentary: !!c }); setTimeout(autosave, 0); }} />
                        Complimentary
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* SECTION 6 — Branch & Assignment */}
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">6. Branch &amp; Assignment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Branch *</Label>
                <Select value={f.branch ?? ""} onValueChange={(v) => { setField("branch", v); setTimeout(autosave, 0); }}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={f.department ?? ""} onValueChange={(v) => { setField("department", v); setTimeout(autosave, 0); }}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Intake / Session</Label>
                <Input placeholder="e.g. Sep 2026" value={f.intake ?? ""} onChange={(e) => setField("intake", e.target.value)} onBlur={autosave} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Interested Countries</Label>
              <InterestedCountriesPicker value={interestedCountries} onChange={(v) => { setInterestedCountries(v); setTimeout(autosave, 0); }} />
            </div>
          </Card>

          {/* SECTION 7 — Notes */}
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">7. Notes</h3>
            {leadNotesRef.current && (
              <div>
                <Label className="text-xs uppercase">Lead notes (read-only)</Label>
                <div className="text-sm whitespace-pre-wrap rounded-md border bg-muted/30 p-3 mt-1">{leadNotesRef.current}</div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                Counselor notes
                {f.counselor_notes_locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
              </Label>
              <Textarea
                rows={4}
                disabled={!!f.counselor_notes_locked}
                value={f.counselor_notes ?? ""}
                onChange={(e) => setField("counselor_notes", e.target.value)}
                onBlur={autosave}
              />
              {f.counselor_notes_locked && (
                <div className="flex gap-2">
                  <Input placeholder="Reason to unlock…" value={notesUnlockReason} onChange={(e) => setNotesUnlockReason(e.target.value)} />
                  <Button type="button" size="sm" variant="outline" onClick={unlockNotes}>Unlock</Button>
                </div>
              )}
              {!f.counselor_notes_locked && (
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox checked={false} onCheckedChange={(c) => { if (c) { setField("counselor_notes_locked", true as never); setTimeout(autosave, 0); } }} />
                  Lock notes on save
                </label>
              )}
            </div>
          </Card>

          {/* SECTION 8 — Client Portal */}
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">8. Client Portal Access</h3>
            <label className="flex items-center gap-2">
              <Checkbox checked={portalEnabled} onCheckedChange={(c) => setPortalEnabled(!!c)} />
              <span className="text-sm">Create client login</span>
            </label>
            {portalEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Client email</Label>
                  <div className="flex items-center gap-1">
                    <Input value={f.email ?? ""} readOnly />
                    <Button type="button" variant="ghost" size="icon" onClick={() => { if (f.email) { navigator.clipboard.writeText(f.email); toast.success("Copied"); } }}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Access level</Label>
                  <Select value={portalAccessLevel} onValueChange={setPortalAccessLevel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PORTAL_ACCESS_LEVELS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <p className="col-span-2 text-xs text-muted-foreground">Only the primary applicant gets a login. Family members share it. Invite sent on save.</p>
              </div>
            )}
          </Card>

          {/* SECTION 9 — Accounting */}
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">9. Accounting Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Tax ID / PAN</Label>
                <Input value={f.tax_id ?? ""} onChange={(e) => setField("tax_id", e.target.value)} onBlur={autosave} />
              </div>
              <div className="space-y-1.5">
                <Label>Client Type</Label>
                <Select value={f.client_type ?? ""} onValueChange={(v) => { setField("client_type", v); setTimeout(autosave, 0); }}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{CLIENT_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* SECTION 10 — Workflow */}
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">10. Workflow</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Workflow Template</Label>
                <Select value={f.workflow_template_id ?? ""} onValueChange={(v) => { setField("workflow_template_id", v); setTimeout(autosave, 0); }}>
                  <SelectTrigger><SelectValue placeholder={templates.length ? "Choose a template" : "No templates"} /></SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN — Invoice preview */}
        <div>
          <InvoicePreviewSection
            primaryName={primaryName}
            selected={services}
            catalogue={catalogue}
            familyMembers={familyMembers}
            serviceFees={serviceFees}
            isCounselor={!!isCounselor}
            paymentTerms={paymentTerms}
            onPaymentTermsChange={(v) => { setPaymentTerms(v); setTimeout(autosave, 0); }}
            billingEntity={billingEntity}
            onBillingEntityChange={(v) => { setBillingEntity(v); setTimeout(autosave, 0); }}
            onCreateInvoice={handleCreateInvoice}
            creating={creating}
          />
        </div>
      </div>
    </AppLayout>
  );
};

export default ClientNew;