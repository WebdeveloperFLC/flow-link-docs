import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  Upload,
  Trash2,
  Plus,
  User,
  CreditCard,
  MapPin,
  GraduationCap,
  Briefcase,
  Phone,
  ChevronsDownUp,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";
import { PROFILE_FIELDS } from "@/lib/extractedFields";
import { dialCodeFor, COUNTRY_OPTIONS } from "@/lib/countryCodes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface Props {
  clientId: string;
  canEdit: boolean;
  onReExtract?: () => Promise<void>;
  reExtracting?: boolean;
  onSyncOdoo?: () => Promise<void>;
  syncingOdoo?: boolean;
  refreshKey?: number;
}

type FieldDef = { key: typeof PROFILE_FIELDS[number]; label: string; type?: "date" | "number" };

type GroupDef = {
  id: string;
  title: string;
  icon: typeof User;
  fields: FieldDef[];
};

const GROUPS: GroupDef[] = [
  {
    id: "identity",
    title: "Identity",
    icon: User,
    fields: [
      { key: "date_of_birth", label: "Date of birth", type: "date" },
      { key: "gender", label: "Gender" },
      { key: "nationality", label: "Nationality" },
      { key: "place_of_birth", label: "Place of birth" },
      { key: "marital_status", label: "Marital status" },
      { key: "spouse_name", label: "Spouse name" },
    ],
  },
  {
    id: "passport",
    title: "Passport",
    icon: CreditCard,
    fields: [
      { key: "passport_number", label: "Passport number" },
      { key: "passport_country", label: "Passport country" },
      { key: "passport_issue_date", label: "Issue date", type: "date" },
      { key: "passport_expiry", label: "Expiry date", type: "date" },
    ],
  },
  {
    id: "contact",
    title: "Contact & address",
    icon: MapPin,
    fields: [
      { key: "phone_alt", label: "Alt phone" },
      { key: "email_alt", label: "Alt email" },
      { key: "address_line1", label: "Address" },
      { key: "address_city", label: "City" },
      { key: "address_state", label: "State" },
      { key: "address_country", label: "Country" },
      { key: "address_postal", label: "Postal code" },
    ],
  },
  {
    id: "education",
    title: "Education & language",
    icon: GraduationCap,
    fields: [
      { key: "highest_qualification", label: "Highest qualification" },
      { key: "institution_name", label: "Institution" },
      { key: "graduation_year", label: "Graduation year", type: "number" },
      { key: "gpa_or_percentage", label: "GPA / %" },
      { key: "ielts_overall", label: "IELTS overall", type: "number" },
      { key: "ielts_listening", label: "IELTS L", type: "number" },
      { key: "ielts_reading", label: "IELTS R", type: "number" },
      { key: "ielts_writing", label: "IELTS W", type: "number" },
      { key: "ielts_speaking", label: "IELTS S", type: "number" },
      { key: "ielts_test_date", label: "IELTS test date", type: "date" },
    ],
  },
  {
    id: "employment",
    title: "Employment & finance",
    icon: Briefcase,
    fields: [
      { key: "employer_name", label: "Employer" },
      { key: "job_title", label: "Job title" },
      { key: "annual_income", label: "Annual income", type: "number" },
      { key: "currency", label: "Currency" },
      { key: "bank_name", label: "Bank" },
      { key: "account_balance", label: "Account balance", type: "number" },
      { key: "gic_amount", label: "GIC amount", type: "number" },
      { key: "tuition_paid", label: "Tuition paid", type: "number" },
    ],
  },
  {
    id: "emergency",
    title: "Emergency",
    icon: Phone,
    fields: [
      { key: "emergency_contact_name", label: "Contact name" },
      { key: "emergency_contact_phone", label: "Contact phone" },
    ],
  },
];

const ALL_SECTION_IDS = [...GROUPS.map((g) => g.id), "education-history"];

function countFilled(fields: FieldDef[], valFor: (k: string) => string): { filled: number; total: number } {
  const total = fields.length;
  const filled = fields.filter((f) => valFor(f.key).trim().length > 0).length;
  return { filled, total };
}

function sectionSummary(fields: FieldDef[], valFor: (k: string) => string, max = 3): string {
  const parts = fields
    .map((f) => {
      const v = valFor(f.key).trim();
      return v ? `${f.label}: ${v}` : null;
    })
    .filter(Boolean)
    .slice(0, max);
  return parts.length > 0 ? parts.join(" · ") : "No details yet — expand to add";
}

export const ClientProfileCard = ({
  clientId,
  canEdit,
  onReExtract,
  reExtracting,
  onSyncOdoo,
  syncingOdoo,
  refreshKey,
}: Props) => {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [primaryPhone, setPrimaryPhone] = useState<string>("");
  const [primaryPhoneEdit, setPrimaryPhoneEdit] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState<string>("");
  const [countryCodeEdit, setCountryCodeEdit] = useState<string | null>(null);
  const [education, setEducation] = useState<Array<Record<string, unknown>>>([]);
  const [openSections, setOpenSections] = useState<string[]>(["identity"]);
  const [fullViewOpen, setFullViewOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data }, { data: clientRow }, { data: edu }] = await Promise.all([
      supabase.from("client_profile").select("*").eq("client_id", clientId).maybeSingle(),
      supabase.from("clients").select("phone, country_code, country").eq("id", clientId).maybeSingle(),
      supabase.from("client_education").select("*").eq("client_id", clientId).order("end_year", { ascending: false }),
    ]);
    setProfile(data as Record<string, unknown> | null);
    setPrimaryPhone(clientRow?.phone ?? "");
    setPrimaryPhoneEdit(null);
    setCountryCode((clientRow as { country_code?: string } | null)?.country_code ?? "");
    setCountryCodeEdit(null);
    setEducation((edu as Array<Record<string, unknown>>) ?? []);
    setEdits({});
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [clientId, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const sourceMapRaw =
    (profile?.source_documents as Record<string, string | { file_name: string; document_type?: string | null }> | undefined) ??
    {};
  const sourceMap: Record<string, string> = Object.fromEntries(
    Object.entries(sourceMapRaw).map(([k, v]) => [k, typeof v === "string" ? v : v?.file_name ?? ""]),
  );

  const valFor = (k: string): string => {
    if (k in edits) return edits[k];
    const v = profile?.[k];
    if (v === null || v === undefined) return "";
    return String(v);
  };

  const dirty = Object.keys(edits).length > 0 || primaryPhoneEdit !== null || countryCodeEdit !== null;

  useEffect(() => {
    if (countryCode || countryCodeEdit !== null) return;
    const candidate =
      (edits.address_country as string | undefined) ??
      (profile?.address_country as string | undefined) ??
      (edits.nationality as string | undefined) ??
      (profile?.nationality as string | undefined);
    const cc = dialCodeFor(candidate);
    if (cc) setCountryCodeEdit(cc);
  }, [edits.address_country, edits.nationality, profile, countryCode, countryCodeEdit]);

  const profileCompletion = useMemo(() => {
    let filled = 0;
    let total = 0;
    for (const g of GROUPS) {
      const c = countFilled(g.fields, valFor);
      filled += c.filled;
      total += c.total;
    }
    if ((primaryPhoneEdit ?? primaryPhone).trim()) filled += 1;
    total += 1;
    return { filled, total, pct: total > 0 ? Math.round((filled / total) * 100) : 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, edits, primaryPhone, primaryPhoneEdit]);

  const save = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(edits)) {
        if (v === "") payload[k] = null;
        else if (
          [
            "graduation_year",
            "annual_income",
            "account_balance",
            "gic_amount",
            "tuition_paid",
            "ielts_overall",
            "ielts_listening",
            "ielts_reading",
            "ielts_writing",
            "ielts_speaking",
          ].includes(k)
        ) {
          const n = Number(v);
          payload[k] = Number.isFinite(n) ? n : null;
        } else {
          payload[k] = v;
        }
      }
      if (profile) {
        const { error } = await supabase.from("client_profile").update(payload as never).eq("client_id", clientId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_profile").insert({ client_id: clientId, ...payload } as never);
        if (error) throw error;
      }
      if (primaryPhoneEdit !== null) {
        const { error: phErr } = await supabase
          .from("clients")
          .update({ phone: primaryPhoneEdit || null } as never)
          .eq("id", clientId);
        if (phErr) throw phErr;
      }
      if (countryCodeEdit !== null) {
        const cleaned = countryCodeEdit.replace(/\D/g, "") || null;
        const { error: ccErr } = await supabase
          .from("clients")
          .update({ country_code: cleaned } as never)
          .eq("id", clientId);
        if (ccErr) throw ccErr;
      }
      toast.success("Profile saved");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const removeEducation = async (id: string) => {
    const { error } = await supabase.from("client_education").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEducation((prev) => prev.filter((e) => e.id !== id));
  };

  const addEducation = async () => {
    const { data, error } = await supabase
      .from("client_education")
      .insert({ client_id: clientId, degree: "", institution: "" } as never)
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setEducation((prev) => [data as Record<string, unknown>, ...prev]);
  };

  const updateEducationField = async (id: string, field: string, value: string) => {
    const v = value === "" ? null : field === "start_year" || field === "end_year" ? Number(value) : value;
    setEducation((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: v } : e)));
    const { error } = await supabase.from("client_education").update({ [field]: v } as never).eq("id", id);
    if (error) toast.error(error.message);
  };

  const renderContactExtras = () => (
    <>
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Country (for phone code)</Label>
        <Select
          value={(() => {
            const cur = countryCodeEdit ?? countryCode;
            const match = COUNTRY_OPTIONS.find((o) => o.code === cur);
            return match?.name ?? "";
          })()}
          onValueChange={(name) => {
            const opt = COUNTRY_OPTIONS.find((o) => o.name === name);
            if (opt) setCountryCodeEdit(opt.code);
          }}
          disabled={!canEdit}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_OPTIONS.map((o) => (
              <SelectItem key={`${o.name}-${o.code}`} value={o.name}>
                +{o.code} · {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Country code</Label>
        <Input
          value={countryCodeEdit ?? countryCode}
          readOnly={!canEdit}
          onChange={(e) => setCountryCodeEdit(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="e.g. 91"
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Phone (primary)</Label>
        <Input
          value={primaryPhoneEdit ?? primaryPhone}
          readOnly={!canEdit}
          onChange={(e) => setPrimaryPhoneEdit(e.target.value)}
          className="h-8 text-sm"
        />
      </div>
    </>
  );

  const renderField = (f: FieldDef) => {
    const src = sourceMap[f.key];
    return (
      <div key={f.key} className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">{f.label}</Label>
        <Input
          value={valFor(f.key)}
          type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
          step="any"
          readOnly={!canEdit}
          onChange={(e) => setEdits((p) => ({ ...p, [f.key]: e.target.value }))}
          className="h-8 text-sm"
        />
        {src && (
          <div className="text-[10px] text-muted-foreground truncate" title={`Auto-extracted from ${src}`}>
            ✨ {src}
          </div>
        )}
      </div>
    );
  };

  const renderFieldsGrid = (g: GroupDef, compact?: boolean) => (
    <div className={cn("grid gap-3", compact ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3")}>
      {g.id === "contact" && renderContactExtras()}
      {g.fields.map(renderField)}
    </div>
  );

  const renderEducationHistory = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Degrees and qualifications from documents or manual entry.</p>
        {canEdit && (
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addEducation}>
            <Plus className="size-3.5 mr-1" /> Add
          </Button>
        )}
      </div>
      {education.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
          No qualifications yet. Upload a resume or transcript, or add manually.
        </div>
      ) : (
        <div className="space-y-2">
          {education.map((e) => (
            <div key={String(e.id)} className="rounded-lg border bg-muted/20 p-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-2 relative">
              <Input
                className="h-8 text-sm bg-background"
                placeholder="Degree"
                value={String(e.degree ?? "")}
                readOnly={!canEdit}
                onChange={(ev) => updateEducationField(String(e.id), "degree", ev.target.value)}
              />
              <Input
                className="h-8 text-sm bg-background"
                placeholder="Field of study"
                value={String(e.field_of_study ?? "")}
                readOnly={!canEdit}
                onChange={(ev) => updateEducationField(String(e.id), "field_of_study", ev.target.value)}
              />
              <Input
                className="h-8 text-sm bg-background"
                placeholder="Institution"
                value={String(e.institution ?? "")}
                readOnly={!canEdit}
                onChange={(ev) => updateEducationField(String(e.id), "institution", ev.target.value)}
              />
              <div className="flex gap-2">
                <Input
                  className="h-8 text-sm bg-background"
                  type="number"
                  placeholder="Start"
                  value={e.start_year ? String(e.start_year) : ""}
                  readOnly={!canEdit}
                  onChange={(ev) => updateEducationField(String(e.id), "start_year", ev.target.value)}
                />
                <Input
                  className="h-8 text-sm bg-background"
                  type="number"
                  placeholder="End"
                  value={e.end_year ? String(e.end_year) : ""}
                  readOnly={!canEdit}
                  onChange={(ev) => updateEducationField(String(e.id), "end_year", ev.target.value)}
                />
              </div>
              <Input
                className="h-8 text-sm sm:col-span-2 bg-background"
                placeholder="GPA / %"
                value={String(e.gpa_or_percentage ?? "")}
                readOnly={!canEdit}
                onChange={(ev) => updateEducationField(String(e.id), "gpa_or_percentage", ev.target.value)}
              />
              <Input
                className="h-8 text-sm bg-background"
                placeholder="Level"
                value={String(e.level ?? "")}
                readOnly={!canEdit}
                onChange={(ev) => updateEducationField(String(e.id), "level", ev.target.value)}
              />
              <div className="flex items-center justify-between gap-2">
                {e.source_file_name && (
                  <div className="text-[10px] text-muted-foreground truncate" title={`From ${e.source_file_name}`}>
                    ✨ {String(e.source_file_name)}
                  </div>
                )}
                {canEdit && (
                  <Button variant="ghost" size="icon" className="size-7 ml-auto" onClick={() => removeEducation(String(e.id))}>
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSectionHeader = (g: GroupDef) => {
    const Icon = g.icon;
    const { filled, total } = countFilled(g.fields, valFor);
    const contactExtra = g.id === "contact" && (primaryPhoneEdit ?? primaryPhone).trim() ? 1 : 0;
    const contactTotal = g.id === "contact" ? 1 : 0;
    const filledCount = filled + contactExtra;
    const totalCount = total + contactTotal;
    const complete = filledCount >= totalCount && totalCount > 0;

    return (
      <div className="flex flex-1 items-center gap-3 min-w-0 text-left">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{g.title}</span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0 h-5",
                complete ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" : "text-muted-foreground",
              )}
            >
              {filledCount}/{totalCount}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{sectionSummary(g.fields, valFor)}</p>
        </div>
      </div>
    );
  };

  const renderFullViewSections = () => (
    <div className="space-y-6 pb-8">
      {GROUPS.map((g) => (
        <div key={g.id} className="rounded-lg border bg-card p-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">{g.title}</div>
          {renderFieldsGrid(g)}
        </div>
      ))}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-primary">Education history</div>
        {renderEducationHistory()}
      </div>
    </div>
  );

  return (
    <>
      <Card className="overflow-hidden shadow-elev-sm">
        <div className="gradient-brand px-4 sm:px-6 py-3 text-primary-foreground">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-semibold flex items-center gap-1.5 text-sm sm:text-base">
                <Sparkles className="size-4" /> Client profile
              </div>
              <div className="text-[11px] text-primary-foreground/80 mt-0.5">
                Auto-extracted · editable · {profileCompletion.pct}% complete
                {profile?.last_extracted_at && (
                  <span> · updated {new Date(String(profile.last_extracted_at)).toLocaleDateString()}</span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                className="h-8 text-xs bg-white/15 text-primary-foreground border-0 hover:bg-white/25"
                onClick={() => setFullViewOpen(true)}
              >
                <Maximize2 className="size-3.5 mr-1" /> View full
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 text-xs bg-white/15 text-primary-foreground border-0 hover:bg-white/25"
                onClick={() =>
                  setOpenSections(openSections.length === ALL_SECTION_IDS.length ? ["identity"] : [...ALL_SECTION_IDS])
                }
              >
                <ChevronsDownUp className="size-3.5 mr-1" />
                {openSections.length === ALL_SECTION_IDS.length ? "Collapse" : "Expand all"}
              </Button>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-2 border-b flex flex-wrap items-center justify-between gap-2 bg-muted/30">
          <div className="text-xs text-muted-foreground">Click a section to expand · only edit what you need</div>
          {canEdit && (
            <div className="flex gap-1.5">
              {onReExtract && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onReExtract} disabled={reExtracting}>
                  {reExtracting ? <Loader2 className="size-3 animate-spin mr-1" /> : <RefreshCw className="size-3 mr-1" />}
                  Re-extract
                </Button>
              )}
              {onSyncOdoo && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onSyncOdoo} disabled={syncingOdoo}>
                  {syncingOdoo ? <Loader2 className="size-3 animate-spin mr-1" /> : <Upload className="size-3 mr-1" />}
                  Odoo
                </Button>
              )}
              {dirty && (
                <Button size="sm" className="h-7 text-xs gradient-brand text-primary-foreground" onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="size-3 animate-spin mr-1" /> : <Save className="size-3 mr-1" />}
                  Save
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="px-2 sm:px-4 pb-2">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading profile…</div>
          ) : (
            <Accordion type="multiple" value={openSections} onValueChange={setOpenSections} className="w-full">
              {GROUPS.map((g) => (
                <AccordionItem key={g.id} value={g.id} className="border-b last:border-0 px-2">
                  <AccordionTrigger className="py-3 hover:no-underline [&>svg]:text-primary">
                    {renderSectionHeader(g)}
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-1">{renderFieldsGrid(g)}</AccordionContent>
                </AccordionItem>
              ))}
              <AccordionItem value="education-history" className="border-b-0 px-2">
                <AccordionTrigger className="py-3 hover:no-underline [&>svg]:text-primary">
                  <div className="flex flex-1 items-center gap-3 min-w-0 text-left">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <GraduationCap className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">Education history</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                          {education.length} record{education.length === 1 ? "" : "s"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {education.length > 0
                          ? education
                              .slice(0, 2)
                              .map((e) => String(e.degree || e.institution || "Entry"))
                              .join(" · ")
                          : "No qualifications captured"}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 pt-1">{renderEducationHistory()}</AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      </Card>

      <Sheet open={fullViewOpen} onOpenChange={setFullViewOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> Full client profile
            </SheetTitle>
            <p className="text-xs text-muted-foreground">{profileCompletion.pct}% complete · scroll to review all fields</p>
          </SheetHeader>
          {renderFullViewSections()}
          {canEdit && dirty && (
            <div className="sticky bottom-0 pt-3 pb-2 bg-background border-t">
              <Button className="w-full gradient-brand text-primary-foreground" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
                Save changes
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
