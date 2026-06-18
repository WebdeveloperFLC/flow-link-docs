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
  User,
  CreditCard,
  MapPin,
  Briefcase,
  Phone,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";
import { appendClientActivityLog, diffRecordFields, formatFieldChanges } from "@/lib/clientActivityLog";
import { PROFILE_FIELDS } from "@/lib/extractedFields";
import {
  clientToProfileFallback,
  ensureClientProfileSynced,
} from "@/lib/clientProfileSync";
import { dialCodeFor, COUNTRY_OPTIONS } from "@/lib/countryCodes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  shortLabel: string;
  icon: typeof User;
  fields: FieldDef[];
};

type PersonalSectionId = "identity" | "passport" | "contact" | "emergency" | "employment";

const PERSONAL_GROUP_IDS: PersonalSectionId[] = ["identity", "passport", "contact", "emergency", "employment"];

const GROUPS: GroupDef[] = [
  {
    id: "identity",
    title: "Identity",
    shortLabel: "Identity",
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
    shortLabel: "Passport",
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
    shortLabel: "Contact",
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
    id: "employment",
    title: "Employment & finance",
    shortLabel: "Employment",
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
    shortLabel: "Emergency",
    icon: Phone,
    fields: [
      { key: "emergency_contact_name", label: "Contact name" },
      { key: "emergency_contact_phone", label: "Contact phone" },
    ],
  },
];

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
  return parts.length > 0 ? parts.join(" · ") : "No details captured yet";
}

function sectionProgress(
  g: GroupDef,
  valFor: (k: string) => string,
  primaryPhone: string,
  primaryPhoneEdit: string | null,
): { filled: number; total: number; complete: boolean } {
  const { filled, total } = countFilled(g.fields, valFor);
  const contactExtra = g.id === "contact" && (primaryPhoneEdit ?? primaryPhone).trim() ? 1 : 0;
  const contactTotal = g.id === "contact" ? 1 : 0;
  const filledCount = filled + contactExtra;
  const totalCount = total + contactTotal;
  return { filled: filledCount, total: totalCount, complete: filledCount >= totalCount && totalCount > 0 };
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
  const [profileFallback, setProfileFallback] = useState<Record<string, string>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [primaryPhone, setPrimaryPhone] = useState<string>("");
  const [primaryPhoneEdit, setPrimaryPhoneEdit] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState<string>("");
  const [countryCodeEdit, setCountryCodeEdit] = useState<string | null>(null);
  const [personalSection, setPersonalSection] = useState<PersonalSectionId>("identity");
  const [fullViewOpen, setFullViewOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      await ensureClientProfileSynced(clientId);
      const [{ data }, { data: clientRow }, { data: spouse }] = await Promise.all([
        supabase.from("client_profile").select("*").eq("client_id", clientId).maybeSingle(),
        supabase.from("clients").select("*").eq("id", clientId).maybeSingle(),
        supabase
          .from("client_family_members")
          .select("first_name, last_name")
          .eq("primary_client_id", clientId)
          .eq("relationship", "spouse")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);
      const spouseName = spouse
        ? [spouse.first_name, spouse.last_name].filter(Boolean).join(" ").trim() || null
        : null;
      setProfile(data as Record<string, unknown> | null);
      setProfileFallback(
        clientRow ? clientToProfileFallback(clientRow as Record<string, unknown>, spouseName) : {},
      );
      setPrimaryPhone(clientRow?.phone ?? "");
      setPrimaryPhoneEdit(null);
      setCountryCode(
        (clientRow as { country_code?: string; phone_country_code?: string } | null)?.country_code ??
          (clientRow as { phone_country_code?: string } | null)?.phone_country_code ??
          "",
      );
      setCountryCodeEdit(null);
      setEdits({});
    } finally {
      setLoading(false);
    }
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
    if (v !== null && v !== undefined && String(v).trim().length > 0) return String(v);
    return profileFallback[k] ?? "";
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
      const changedFields = Object.keys(edits);
      if (changedFields.length || primaryPhoneEdit !== null || countryCodeEdit !== null) {
        const before: Record<string, unknown> = {};
        const after: Record<string, unknown> = {};
        for (const k of changedFields) {
          before[k] = profile?.[k] ?? "";
          after[k] = edits[k];
        }
        if (primaryPhoneEdit !== null) {
          before.phone = primaryPhone;
          after.phone = primaryPhoneEdit;
        }
        if (countryCodeEdit !== null) {
          before.country_code = countryCode;
          after.country_code = countryCodeEdit;
        }
        const keys = [...changedFields, ...(primaryPhoneEdit !== null ? ["phone"] : []), ...(countryCodeEdit !== null ? ["country_code"] : [])];
        const changes = diffRecordFields(before, after, keys);
        if (changes.length) {
          const { previousValue, newValue } = formatFieldChanges(changes);
          const contactKeys = new Set(["phone", "email", "country_code", "alternate_phone", "email_alternate"]);
          const isContact = keys.every((k) => contactKeys.has(k));
          await appendClientActivityLog({
            clientId,
            action: isContact ? "contact_updated" : "profile_updated",
            summary: isContact ? "Contact information updated" : "Profile updated",
            previousValue,
            newValue,
          });
        }
      }
      toast.success("Profile saved");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
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

  const activeGroup = GROUPS.find((g) => g.id === personalSection);

  const renderPersonalSubNav = () => (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1 mb-4">
      {PERSONAL_GROUP_IDS.map((id) => {
        const g = GROUPS.find((group) => group.id === id)!;
        const Icon = g.icon;
        const active = personalSection === id;
        const { filled, total, complete } = sectionProgress(g, valFor, primaryPhone, primaryPhoneEdit);
        return (
          <button
            key={g.id}
            type="button"
            onClick={() => setPersonalSection(id)}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all border",
              active
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted",
            )}
          >
            <Icon className="size-3.5 shrink-0" />
            <span>{g.shortLabel}</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0 text-[10px] font-semibold tabular-nums",
                complete ? "bg-emerald-500/15 text-emerald-700" : "bg-muted text-muted-foreground",
              )}
            >
              {filled}/{total}
            </span>
          </button>
        );
      })}
    </div>
  );

  const renderGroupPanel = (g: GroupDef) => {
    const { filled, total, complete } = sectionProgress(g, valFor, primaryPhone, primaryPhoneEdit);
    const Icon = g.icon;
    return (
      <div key={g.id} className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold">{g.title}</h3>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0 h-5",
                  complete ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" : "text-muted-foreground",
                )}
              >
                {filled}/{total} fields
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{sectionSummary(g.fields, valFor, 4)}</p>
          </div>
        </div>
        {renderFieldsGrid(g)}
      </div>
    );
  };

  const renderActivePanel = () => {
    if (!activeGroup) return null;
    return (
      <div className="space-y-4">
        {renderPersonalSubNav()}
        {renderGroupPanel(activeGroup)}
      </div>
    );
  };

  const renderFullViewSections = () => (
    <div className="space-y-6 pb-8">
      {PERSONAL_GROUP_IDS.map((id) => {
        const g = GROUPS.find((group) => group.id === id);
        return g ? (
          <div key={g.id} className="rounded-lg border bg-card p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">{g.title}</div>
            {renderFieldsGrid(g)}
          </div>
        ) : null;
      })}
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
                <Maximize2 className="size-3.5 mr-1" /> View full profile
              </Button>
              {canEdit && (
                <>
                  {onReExtract && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 text-xs bg-white/15 text-primary-foreground border-0 hover:bg-white/25"
                      onClick={onReExtract}
                      disabled={reExtracting}
                    >
                      {reExtracting ? <Loader2 className="size-3 animate-spin mr-1" /> : <RefreshCw className="size-3 mr-1" />}
                      Re-extract
                    </Button>
                  )}
                  {onSyncOdoo && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 text-xs bg-white/15 text-primary-foreground border-0 hover:bg-white/25"
                      onClick={onSyncOdoo}
                      disabled={syncingOdoo}
                    >
                      {syncingOdoo ? <Loader2 className="size-3 animate-spin mr-1" /> : <Upload className="size-3 mr-1" />}
                      Odoo
                    </Button>
                  )}
                  {dirty && (
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-white text-primary hover:bg-white/90"
                      onClick={save}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="size-3 animate-spin mr-1" /> : <Save className="size-3 mr-1" />}
                      Save
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 min-h-[280px]">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading profile…</div>
          ) : (
            renderActivePanel()
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
