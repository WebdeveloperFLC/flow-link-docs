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
import { PhoneInputRow } from "@/components/leads/PhoneInputRow";
import { LeadJourneyFieldsBlock } from "@/components/leads/LeadJourneyFields";
import {
  upsertLeadAutosave,
  createLead,
  updateLead,
  fetchLead,
  fetchBranches,
  fetchDepartments,
  findDuplicateLeads,
  suggestDepartmentFromServices,
  type LeadDraft,
  type LeadTemperature,
  type Branch,
  type Department,
} from "@/lib/leads";
import {
  leadColdSchema,
  leadWarmHotSchema,
  formatLeadValidationError,
  GENDERS,
  MARITAL_STATUSES,
} from "@/lib/leadSchemas";
import { useMasterItems, useMasterLabels } from "@/lib/masters";
import { dialCodeFor } from "@/lib/countryCodes";
import { buildServiceLibraryUrl, buildClientDetailUrlFromServiceLibrary } from "@/lib/service-library/serviceCodes";
import { ContextBackBar } from "@/components/navigation/ContextBackBar";
import { formatSupabaseError } from "@/lib/formatSupabaseError";
import { convertLeadToClient } from "@/lib/convertLeadToClient";
import type { Lead } from "@/lib/leads";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchEligiblePrimaryUsers,
  logLeadPrimaryUserChange,
  mergePrimaryUserOptionsWithSelf,
  type PrimaryUserOption,
} from "@/lib/leadAssignment";
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "@/lib/leadFollowup";
import { syncLeadFollowupLog } from "@/lib/leadFollowupLog";
import { LeadFollowupSection } from "@/components/leads/LeadFollowupSection";
import { LeadBackgroundSummaryCard } from "@/components/leads/LeadBackgroundSummaryCard";
import { UpgradeColdLeadCard } from "@/components/leads/UpgradeColdLeadCard";
import {
  backgroundStateToLeadDraft,
  EMPTY_LEAD_BACKGROUND,
  leadToBackgroundState,
  mergeBackgroundIntoEducationHistory,
  syncLastEducationFromBackground,
  type LeadBackgroundState,
} from "@/lib/leadBackground";

const VISA_LOCK_TEMPLATE = (reason: string) =>
  `Visa not pursued at this stage. Reason: ${reason || "(please specify)"}\n\nFollow-up: Re-engage when visa interest is expressed.\n\n`;

const LeadNew = () => {
  const nav = useNavigate();
  const { user } = useAuth();
  const [sp] = useSearchParams();
  const editId = sp.get("id") ?? sp.get("lead_id");
  const slCountry = sp.get("country");
  const slVisaService = sp.get("visa_service");
  const slServiceLabel = sp.get("service_label");
  const slLibraryId = sp.get("library_id");
  const slSubService = sp.get("sub_service");
  const slCat = sp.get("cat");
  const registerClientParam = sp.get("register_client") === "1";
  const initialMode: LeadMode = sp.get("mode") === "cold" ? "cold" : "warm_hot";

  const [mode, setMode] = useState<LeadMode>(initialMode);
  const [leadId, setLeadId] = useState<string | null>(editId);
  const [leadNumber, setLeadNumber] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertedClientId, setConvertedClientId] = useState<string | null>(null);
  const autoConvertStarted = useRef(false);

  const [f, setF] = useState<Record<string, unknown>>({});
  const [services, setServices] = useState<ServiceSelection>({
    coaching_services: [], visa_services: [], admission_services: [], allied_services: [], travel_services: [],
  });
  const [interestedCountries, setInterestedCountries] = useState<string[]>([]);
  const [visaLocked, setVisaLocked] = useState(false);
  const [visaLockReason, setVisaLockReason] = useState("");
  const [notes, setNotes] = useState("");
  const [followupAtLocal, setFollowupAtLocal] = useState("");
  const [followupChannel, setFollowupChannel] = useState("");
  const [followupNote, setFollowupNote] = useState("");
  const [followupLogVersion, setFollowupLogVersion] = useState(0);
  const [followupSaved, setFollowupSaved] = useState(false);
  const [savingFollowup, setSavingFollowup] = useState(false);
  const [background, setBackground] = useState<LeadBackgroundState>(EMPTY_LEAD_BACKGROUND);
  const [upgradingCold, setUpgradingCold] = useState(false);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [eligiblePrimaryUsers, setEligiblePrimaryUsers] = useState<PrimaryUserOption[]>([]);
  const [loadingPrimaryUsers, setLoadingPrimaryUsers] = useState(false);
  const lastAssignedCounselorRef = useRef<string | null>(null);
  const defaultedPrimaryUserRef = useRef(false);
  const leadIdRef = useRef<string | null>(editId);
  const autosaveInFlightRef = useRef(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveFnRef = useRef<() => Promise<string | null>>(async () => null);
  const lead_sources = useMasterLabels("lead_sources" as never);
  const qualificationLevels = useMasterItems("qualification_levels");
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchBranches().then(setBranches);
    fetchDepartments().then(setDepartments);
  }, []);

  useEffect(() => {
    if (editId || !user?.id || defaultedPrimaryUserRef.current) return;
    setField("assigned_counselor_id", user.id);
    lastAssignedCounselorRef.current = user.id;
    defaultedPrimaryUserRef.current = true;
  }, [editId, user?.id]);

  useEffect(() => {
    const branch = (f.branch as string) || "";
    const department = (f.department as string) || "";
    if (!branch || !department) {
      setEligiblePrimaryUsers([]);
      return;
    }
    let cancelled = false;
    setLoadingPrimaryUsers(true);
    fetchEligiblePrimaryUsers({ branchName: branch, departmentName: department })
      .then((rows) => {
        if (!cancelled) setEligiblePrimaryUsers(rows);
      })
      .finally(() => {
        if (!cancelled) setLoadingPrimaryUsers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [f.branch, f.department]);

  useEffect(() => {
    if (editId || leadId) return;
    if (slCountry) setInterestedCountries([slCountry]);
    if (slVisaService) {
      const isCoaching = slCat === "coaching";
      setServices((s) => ({
        ...s,
        ...(isCoaching
          ? {
              coaching_services: s.coaching_services?.length ? s.coaching_services : [slVisaService],
            }
          : {
              visa_services: s.visa_services?.length ? s.visa_services : [slVisaService],
            }),
      }));
    }
    if (slServiceLabel) {
      const line = `Service Library: ${slServiceLabel}`;
      setNotes((n) => (n && n.includes(line) ? n : n ? `${n}\n${line}` : line));
    }
  }, [slCountry, slVisaService, slServiceLabel, slLibraryId, slCat, editId, leadId]);

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
      sponsor: l.sponsor, sponsor_other: l.sponsor_other,
      has_budget: l.has_budget, budget_currency: l.budget_currency,
      budget_min: l.budget_min, budget_max: l.budget_max,
      lead_temperature: l.lead_temperature, branch: l.branch, department: l.department,
      assigned_counselor_id: l.assigned_counselor_id,
      cold_pool_campaign: l.cold_pool_campaign,
    });
    lastAssignedCounselorRef.current = l.assigned_counselor_id ?? null;
    setServices({
      coaching_services: l.coaching_services ?? [],
      visa_services: l.visa_services ?? [],
      admission_services: l.admission_services ?? [],
      allied_services: l.allied_services ?? [],
      travel_services: l.travel_financial_services ?? [],
    });
    setInterestedCountries(l.interested_countries ?? []);
    setVisaLocked(l.visa_locked);
    setVisaLockReason(l.visa_lock_reason ?? "");
    setNotes(l.notes ?? "");
    setFollowupAtLocal(toDatetimeLocalValue(l.next_followup_at));
    setFollowupChannel(l.followup_channel ?? "");
    setFollowupNote(l.followup_note ?? "");
    setFollowupSaved(!!l.next_followup_at);
    if (l.converted_to_client_id) {
      setConvertedClientId(l.converted_to_client_id);
    }
    setBackground(leadToBackgroundState(l));
  }, []);

  useEffect(() => {
    if (!editId) return;
    fetchLead(editId).then(hydrateLeadForm);
  }, [editId, hydrateLeadForm]);

  const setField = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  const buildDraft = (): LeadDraft => {
    const isCold = mode === "cold";
    const lastEd = (f.last_education as string) || null;
    const mergedBackground = mergeBackgroundIntoEducationHistory(background, lastEd);
    const educationSync = syncLastEducationFromBackground(
      { ...background, education_history: mergedBackground },
      lastEd,
    );
    return {
      ...(f as object),
      ...backgroundStateToLeadDraft({ ...background, education_history: mergedBackground }),
      ...educationSync,
      lead_type: isCold ? "cold" : ((f.lead_temperature as string) === "hot" ? "hot" : "warm"),
      lead_temperature: isCold ? "cold" : (((f.lead_temperature as string) || "warm") as never),
      is_cold_pool: isCold,
      coaching_services: services.coaching_services,
      visa_services: services.visa_services,
      admission_services: services.admission_services,
      allied_services: services.allied_services,
      travel_financial_services: services.travel_services,
      interested_countries: interestedCountries,
      visa_locked: visaLocked,
      visa_lock_reason: visaLocked ? visaLockReason : null,
      notes,
      next_followup_at: fromDatetimeLocalValue(followupAtLocal),
      followup_channel: followupChannel || null,
      followup_note: followupNote.trim() || null,
    } as LeadDraft;
  };

  const autosave = async (): Promise<string | null> => {
    if (autosaveInFlightRef.current) return leadIdRef.current;
    const currentLeadId = leadIdRef.current;
    if (!currentLeadId) {
      const fn = (f.first_name as string)?.trim();
      const ln = (f.last_name as string)?.trim();
      if (!fn || !ln) return null;
      const draft = buildDraft();
      if (mode === "cold") {
        const email = (f.email as string)?.trim();
        const phone = (f.phone as string)?.trim();
        if (!email && !phone) return null;
      } else {
        const validation = leadWarmHotSchema.safeParse({
          ...draft,
          travel_services: services.travel_services,
        });
        if (!validation.success) return null;
        const dups = await findDuplicateLeads({
          email: (f.email as string) ?? null,
          phone: (f.phone as string) ?? null,
        }).catch(() => []);
        if (dups.length) {
          toast.error(`Duplicate lead: ${dups[0].lead_number} already uses this email or phone`);
          return null;
        }
      }
    }
    autosaveInFlightRef.current = true;
    setSaving(true);
    try {
      const saved = await upsertLeadAutosave(currentLeadId, buildDraft());
      const prevAssigned = lastAssignedCounselorRef.current;
      const nextAssigned = (saved.assigned_counselor_id as string | null | undefined) ?? null;
      if (saved.id && prevAssigned !== nextAssigned) {
        await logLeadPrimaryUserChange({
          leadId: saved.id,
          clientId: saved.converted_to_client_id ?? null,
          previousUserId: prevAssigned,
          newUserId: nextAssigned,
        }).catch(() => {});
        lastAssignedCounselorRef.current = nextAssigned;
      }
      if (!currentLeadId) {
        leadIdRef.current = saved.id;
        setLeadId(saved.id);
        setLeadNumber(saved.lead_number);
      }
      try {
        await syncLeadFollowupLog(saved.id, {
          scheduledAt: fromDatetimeLocalValue(followupAtLocal),
          channel: followupChannel || null,
          note: followupNote.trim() || null,
        });
        setFollowupLogVersion((v) => v + 1);
      } catch (e) {
        console.warn("[lead followup sync]", e);
        toast.error(formatSupabaseError(e, "Follow-up log sync failed — publish pending migrations in Lovable"));
      }
      return saved.id;
    } catch (e: unknown) {
      const msg = formatSupabaseError(e, "Save failed");
      console.error("[lead autosave]", e);
      toast.error(msg);
      return null;
    } finally {
      autosaveInFlightRef.current = false;
      setSaving(false);
    }
  };

  autosaveFnRef.current = autosave;

  const ensureLeadIdForFollowup = async (): Promise<string | null> => {
    if (leadIdRef.current) return leadIdRef.current;
    const fn = (f.first_name as string)?.trim();
    const ln = (f.last_name as string)?.trim();
    if (!fn || !ln) {
      toast.error("Enter first and last name once — then follow-up saves on its own");
      return null;
    }
    const isCold = mode === "cold";
    try {
      const saved = await createLead({
        first_name: fn,
        last_name: ln,
        middle_name: (f.middle_name as string) || null,
        lead_type: isCold ? "cold" : ((f.lead_temperature as string) === "hot" ? "hot" : "warm"),
        lead_temperature: (isCold ? "cold" : ((f.lead_temperature as string) || "warm")) as LeadTemperature,
        is_cold_pool: isCold,
        email: (f.email as string) || null,
        phone: (f.phone as string) || null,
      });
      leadIdRef.current = saved.id;
      setLeadId(saved.id);
      setLeadNumber(saved.lead_number);
      return saved.id;
    } catch (e) {
      toast.error(formatSupabaseError(e, "Could not create lead draft"));
      return null;
    }
  };

  const saveFollowupOnly = useCallback(async (): Promise<boolean> => {
    if (!followupAtLocal.trim()) {
      toast.error("Set a follow-up date first");
      return false;
    }
    setSavingFollowup(true);
    try {
      const id = await ensureLeadIdForFollowup();
      if (!id) return false;
      await syncLeadFollowupLog(id, {
        scheduledAt: fromDatetimeLocalValue(followupAtLocal),
        channel: followupChannel || null,
        note: followupNote.trim() || null,
      });
      setFollowupLogVersion((v) => v + 1);
      setFollowupSaved(true);
      toast.success("Follow-up saved");
      return true;
    } catch (e) {
      toast.error(formatSupabaseError(e, "Could not save follow-up"));
      return false;
    } finally {
      setSavingFollowup(false);
    }
  }, [followupAtLocal, followupChannel, followupNote, mode, f.first_name, f.last_name, f.middle_name, f.lead_temperature, f.email, f.phone]);

  const onFollowupCompleted = useCallback(() => {
    setFollowupAtLocal("");
    setFollowupChannel("");
    setFollowupNote("");
    setFollowupSaved(false);
    setFollowupLogVersion((v) => v + 1);
  }, []);

  const onFollowupNotesMigrated = useCallback((cleanedNotes: string | null) => {
    setNotes(cleanedNotes ?? "");
  }, []);

  const onFollowupAtChange = useCallback((value: string) => {
    setFollowupAtLocal(value);
    setFollowupSaved(false);
  }, []);
  const onFollowupChannelChange = useCallback((value: string) => {
    setFollowupChannel(value);
    setFollowupSaved(false);
  }, []);
  const onFollowupNoteChange = useCallback((value: string) => {
    setFollowupNote(value);
    setFollowupSaved(false);
  }, []);

  const scheduleAutosave = () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      void autosaveFnRef.current();
    }, 400);
  };

  useEffect(() => {
    leadIdRef.current = leadId;
  }, [leadId]);

  useEffect(() => () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
  }, []);

  const mergeLeadFromForm = useCallback((lead: Lead): Lead => ({
    ...lead,
    coaching_services: services.coaching_services,
    visa_services: services.visa_services,
    admission_services: services.admission_services,
    allied_services: services.allied_services,
    travel_financial_services: services.travel_services,
    interested_countries: interestedCountries,
    notes,
    next_followup_at: fromDatetimeLocalValue(followupAtLocal),
    followup_channel: followupChannel || null,
    followup_note: followupNote.trim() || null,
    ...(f as Partial<Lead>),
  }), [f, services, interestedCountries, notes, followupAtLocal, followupChannel, followupNote]);

  const convertAndNavigate = async () => {
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

    const draft = buildDraft();
    const validation = mode === "cold"
      ? leadColdSchema.safeParse({ ...draft })
      : leadWarmHotSchema.safeParse({ ...draft, travel_services: services.travel_services });
    if (!validation.success) {
      toast.error(formatLeadValidationError(validation.error, "Complete required lead fields before converting"));
      return;
    }

    setConverting(true);
    try {
      const merged = mergeLeadFromForm(lead);
      const result = await convertLeadToClient(merged, {
        leadNotes: notes,
        slCountry,
        slVisaService,
        slServiceLabel,
        slLibraryId,
        slSubService,
        slServiceCategory: slCat === "coaching" ? "coaching_services" : null,
      });
      const label = result.registrationNumber ?? result.clientId.slice(0, 8);
      toast.success(result.alreadyConverted ? "Opening client profile" : `Client created: ${label}`);
      if (slLibraryId) {
        nav(
          buildClientDetailUrlFromServiceLibrary({
            clientId: result.clientId,
            libraryId: slLibraryId,
            country: slCountry,
            serviceCode: slVisaService ?? undefined,
          }),
        );
      } else {
        nav(`/clients/${result.clientId}`);
      }
    } catch (e: unknown) {
      toast.error(formatSupabaseError(e, "Conversion failed"));
    } finally {
      setConverting(false);
    }
  };

  useEffect(() => {
    if (!registerClientParam || !editId || autoConvertStarted.current) return;
    if (convertedClientId) {
      nav(`/clients/${convertedClientId}`);
      return;
    }
    if (leadId && leadNumber) {
      autoConvertStarted.current = true;
      void convertAndNavigate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerClientParam, editId, leadId, leadNumber, convertedClientId]);

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

  const primaryUserOptions = useMemo(() => {
    const selectedId = (f.assigned_counselor_id as string) || null;
    const selectedName = eligiblePrimaryUsers.find((o) => o.id === selectedId)?.name;
    return mergePrimaryUserOptionsWithSelf(eligiblePrimaryUsers, selectedId, user?.id ?? null, selectedName);
  }, [eligiblePrimaryUsers, f.assigned_counselor_id, user?.id]);

  const onPrimaryUserChange = (v: string) => {
    setField("assigned_counselor_id", v || null);
    setTimeout(scheduleAutosave, 0);
  };

  const onBranchChange = (v: string) => {
    setField("branch", v);
    setTimeout(scheduleAutosave, 0);
  };

  const onDepartmentChange = (v: string) => {
    setField("department", v);
    setTimeout(scheduleAutosave, 0);
  };

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

  const validateAndSubmit = async () => {
    const draft = buildDraft();
    const payload = mode === "cold"
      ? leadColdSchema.safeParse({ ...draft })
      : leadWarmHotSchema.safeParse({ ...draft, travel_services: services.travel_services });
    if (!payload.success) {
      toast.error(formatLeadValidationError(payload.error, "Complete required lead fields"));
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

  const commitBackgroundAutosave = async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    const currentLeadId = leadIdRef.current;
    if (currentLeadId) {
      try {
        setSaving(true);
        await updateLead(currentLeadId, buildDraft());
        toast.success("Background details saved");
      } catch (e) {
        toast.error(formatSupabaseError(e, "Could not save background details"));
      } finally {
        setSaving(false);
      }
      return;
    }
    const id = await autosave();
    if (id) {
      toast.success("Background details saved");
      return;
    }
    const fn = (f.first_name as string)?.trim();
    const ln = (f.last_name as string)?.trim();
    if (fn && ln) {
      toast.message("Background kept on this form — complete required lead fields so it saves to the database");
    } else {
      toast.message("Enter first and last name — background is kept on this form until the lead saves");
    }
  };

  const patchBackground = (patch: Partial<LeadBackgroundState>) => {
    setBackground((prev) => {
      const next = { ...prev, ...patch };
      const level = next.education_history?.[0]?.level;
      if (level) {
        setField("last_education", level);
      }
      return next;
    });
  };

  const handleUpgradeCold = async () => {
    setUpgradingCold(true);
    try {
      setMode("warm_hot");
      setField("lead_temperature", "warm");
      if (leadIdRef.current) {
        await updateLead(leadIdRef.current, {
          lead_type: "warm",
          lead_temperature: "warm",
          is_cold_pool: false,
        });
      }
      toast.success("Upgraded to warm lead — full form unlocked");
    } catch (e) {
      toast.error(formatSupabaseError(e, "Upgrade failed"));
    } finally {
      setUpgradingCold(false);
    }
  };

  const draftForValidation = buildDraft();
  const canRegisterAsClient =
    !convertedClientId &&
    !converting &&
    !saving &&
    !!(f.first_name as string)?.trim() &&
    !!(f.last_name as string)?.trim() &&
    (isCold
      ? !!((f.email as string)?.trim() || (f.phone as string)?.trim())
      : leadWarmHotSchema.safeParse({ ...draftForValidation, travel_services: services.travel_services }).success);

  const personalFields = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="space-y-1.5">
        <Label>First Name *</Label>
        <Input value={(f.first_name as string) || ""} onChange={(e) => setField("first_name", e.target.value)} onBlur={scheduleAutosave} />
      </div>
      <div className="space-y-1.5">
        <Label>Middle Name</Label>
        <Input value={(f.middle_name as string) || ""} onChange={(e) => setField("middle_name", e.target.value)} onBlur={scheduleAutosave} />
      </div>
      <div className="space-y-1.5">
        <Label>Last Name *</Label>
        <Input value={(f.last_name as string) || ""} onChange={(e) => setField("last_name", e.target.value)} onBlur={scheduleAutosave} />
      </div>
      {!isCold && (
        <>
          <div className="space-y-1.5">
            <Label>Gender *</Label>
            <Select value={(f.gender as string) || ""} onValueChange={(v) => { setField("gender", v); setTimeout(scheduleAutosave, 0); }}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => <SelectItem key={g} value={g} className="capitalize">{g.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Marital Status</Label>
            <Select value={(f.marital_status as string) || ""} onValueChange={(v) => { setField("marital_status", v); setTimeout(scheduleAutosave, 0); }}>
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
        <Input type="email" value={(f.email as string) || ""} onChange={(e) => setField("email", e.target.value)} onBlur={scheduleAutosave} />
      </div>
      <PhoneInputRow
        className="md:col-span-2 lg:col-span-2"
        label="Phone"
        required={!isCold}
        countryCode={(f.phone_country_code as string) || ""}
        phone={(f.phone as string) || ""}
        onCountryCodeChange={(v) => { setField("phone_country_code", v); setTimeout(scheduleAutosave, 0); }}
        onPhoneChange={(v) => setField("phone", v)}
        onBlur={scheduleAutosave}
      />
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
          <Input value={visaLockReason} onChange={(e) => setVisaLockReason(e.target.value)} onBlur={scheduleAutosave} placeholder="e.g. Coaching only" />
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
        title={editId ? "Edit Lead" : "New Lead"}
        description={
          leadNumber
            ? `Lead # ${leadNumber}`
            : "Capture lead details, then Register as Client to open the client profile."
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {(saving || converting) && (
              <span className="text-xs text-muted-foreground">{converting ? "Converting…" : "Saving…"}</span>
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
            {convertedClientId && (
              <Button variant="outline" onClick={() => nav(`/clients/${convertedClientId}`)}>
                View Client
              </Button>
            )}
          </div>
        }
      />
      <div className="p-3 sm:p-6 mx-auto space-y-6 max-w-5xl">
        <Card className="p-3 bg-muted/40 border-dashed text-sm text-muted-foreground">
          When the person confirms they want to proceed, click{" "}
          <span className="font-semibold text-foreground">Register as Client</span> — the client is created
          immediately and you are taken to their profile. A draft invoice is generated from selected services.
          {leadNumber && (
            <span className="block mt-1 text-foreground/80">Lead # {leadNumber} · autosaves when you leave a field</span>
          )}
        </Card>

        <>
            <div className="flex items-center justify-between gap-4">
              <LeadModeToggle value={mode} onChange={setMode} disabled={!!leadId} />
              {leadId && <span className="text-xs text-muted-foreground">Mode locked after first save</span>}
            </div>

            {isCold && (
              <UpgradeColdLeadCard onUpgrade={handleUpgradeCold} upgrading={upgradingCold} />
            )}

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
                      <CountrySelect value={(f.country_of_citizenship as string) || ""} onChange={(v) => { setField("country_of_citizenship", v); setTimeout(scheduleAutosave, 0); }} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Country of Residence *</Label>
                      <CountrySelect value={(f.country_of_residence as string) || ""} onChange={(v) => { setField("country_of_residence", v); setTimeout(scheduleAutosave, 0); }} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Countries of Interest *</Label>
                    <RegionCountriesPicker value={interestedCountries} onChange={(v) => { setInterestedCountries(v); setTimeout(scheduleAutosave, 0); }} />
                  </div>
                </Card>

                <Card className="p-4 sm:p-6 space-y-4">
                  <h3 className="font-semibold">3. Background</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label>Last Education</Label>
                      <Select
                        value={(f.last_education as string) || ""}
                        onValueChange={(v) => {
                          setField("last_education", v);
                          setBackground((prev) => {
                            const history = [...(prev.education_history ?? [])];
                            if (history.length === 0) history.push({ level: v });
                            else history[0] = { ...history[0], level: v };
                            return { ...prev, education_history: history };
                          });
                          setTimeout(scheduleAutosave, 0);
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{qualificationLevels.map((q) => <SelectItem key={q.code} value={q.code}>{q.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {String(f.last_education ?? "").toLowerCase() === "other" && (
                      <div className="space-y-1.5">
                        <Label>Specify</Label>
                        <Input value={(f.last_education_other as string) || ""} onChange={(e) => setField("last_education_other", e.target.value)} onBlur={scheduleAutosave} />
                      </div>
                    )}
                  </div>
                </Card>

                <LeadBackgroundSummaryCard
                  value={background}
                  onChange={patchBackground}
                  onCommit={commitBackgroundAutosave}
                />

                <Card className="p-4 sm:p-6 space-y-4">
                  <h3 className="font-semibold">4. Funding &amp; Timeline</h3>
                  <LeadJourneyFieldsBlock
                    interestedCountries={interestedCountries}
                    value={{
                      sponsor: (f.sponsor as string) ?? null,
                      sponsor_other: (f.sponsor_other as string) ?? null,
                      start_timeline: (f.start_timeline as string) ?? null,
                      has_budget: (f.has_budget as string) ?? null,
                      budget_currency: (f.budget_currency as string) ?? "INR",
                      budget_min: (f.budget_min as number) ?? null,
                      budget_max: (f.budget_max as number) ?? null,
                    }}
                    onChange={(patch) => {
                      setF((p) => ({ ...p, ...patch }));
                      setTimeout(scheduleAutosave, 0);
                    }}
                    onBlur={scheduleAutosave}
                  />
                </Card>

                <Card className="p-4 sm:p-6 space-y-4">
                  <h3 className="font-semibold">5. Services Required *</h3>
                  <ServiceTabs
                    value={services}
                    onChange={(v) => { setServices(v); setTimeout(scheduleAutosave, 0); }}
                    visaLocked={visaLocked}
                    interestedCountries={interestedCountries}
                    layout="compact"
                  />
                  {visaLockBlock}
                </Card>

                <Card className="p-4 sm:p-6 space-y-4">
                  <h3 className="font-semibold">6. Assignment</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label>Branch</Label>
                      <Select value={(f.branch as string) || ""} onValueChange={onBranchChange}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Department {suggestedDept && f.department !== suggestedDept && <span className="text-xs text-muted-foreground">(suggested: {suggestedDept})</span>}</Label>
                      <Select value={(f.department as string) || ""} onValueChange={onDepartmentChange}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Primary User</Label>
                      <Select
                        value={(f.assigned_counselor_id as string) || ""}
                        onValueChange={onPrimaryUserChange}
                        disabled={loadingPrimaryUsers && !primaryUserOptions.length}
                      >
                        <SelectTrigger><SelectValue placeholder={loadingPrimaryUsers ? "Loading…" : "Select"} /></SelectTrigger>
                        <SelectContent>
                          {primaryUserOptions.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {(!(f.branch as string) || !(f.department as string)) && (
                        <p className="text-xs text-muted-foreground">Select branch and department to filter eligible users.</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Lead Source</Label>
                      <Select value={(f.lead_source as string) || ""} onValueChange={(v) => { setField("lead_source", v); setTimeout(scheduleAutosave, 0); }}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{lead_sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Temperature</Label>
                      <Select value={(f.lead_temperature as string) || "warm"} onValueChange={(v) => { setField("lead_temperature", v); setTimeout(scheduleAutosave, 0); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="warm">Warm</SelectItem>
                          <SelectItem value="hot">Hot</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 sm:p-6 space-y-4">
                  <h3 className="font-semibold">7. Follow-up</h3>
                  <LeadFollowupSection
                    leadId={leadId}
                    followupAtLocal={followupAtLocal}
                    followupChannel={followupChannel}
                    followupNote={followupNote}
                    onFollowupAtChange={onFollowupAtChange}
                    onFollowupChannelChange={onFollowupChannelChange}
                    onFollowupNoteChange={onFollowupNoteChange}
                    onSaveFollowup={saveFollowupOnly}
                    savingFollowup={savingFollowup}
                    followupLogVersion={followupLogVersion}
                    onFollowupCompleted={onFollowupCompleted}
                    onNotesMigrated={onFollowupNotesMigrated}
                    followupSaved={followupSaved}
                    description="Schedule the next touchpoint for the assigned primary user. Save here — no need to save the whole form. Carried over when you register as client."
                  />
                </Card>
              </>
            )}

            {isCold && (
              <Card className="p-4 sm:p-6 space-y-4">
                <h3 className="font-semibold">Cold Pool Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Campaign / List Name</Label>
                    <Input value={(f.cold_pool_campaign as string) || ""} onChange={(e) => setField("cold_pool_campaign", e.target.value)} onBlur={scheduleAutosave} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Lead Source</Label>
                    <Select value={(f.lead_source as string) || ""} onValueChange={(v) => { setField("lead_source", v); setTimeout(scheduleAutosave, 0); }}>
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

            {isCold && (
              <Card className="p-4 sm:p-6 space-y-4">
                <h3 className="font-semibold">Follow-up</h3>
                <LeadFollowupSection
                  leadId={leadId}
                  followupAtLocal={followupAtLocal}
                  followupChannel={followupChannel}
                  followupNote={followupNote}
                  onFollowupAtChange={onFollowupAtChange}
                  onFollowupChannelChange={onFollowupChannelChange}
                  onFollowupNoteChange={onFollowupNoteChange}
                  onSaveFollowup={saveFollowupOnly}
                  savingFollowup={savingFollowup}
                  followupLogVersion={followupLogVersion}
                  onFollowupCompleted={onFollowupCompleted}
                  onNotesMigrated={onFollowupNotesMigrated}
                  followupSaved={followupSaved}
                  notePlaceholder="Brief reminder for next call"
                  description="Optional — schedule when to call this cold lead again. Save here without saving the whole form."
                />
              </Card>
            )}

            <Card className="p-6 space-y-3">
              <h3 className="font-semibold">{isCold ? "Notes" : "8. Notes"}</h3>
              <Textarea
                ref={notesRef}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={scheduleAutosave}
                rows={6}
                placeholder="Counsellor notes, follow-up plan, special considerations…"
              />
            </Card>

            {!convertedClientId && (
              <Card className="p-4 sm:p-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 border-primary/20 bg-muted/20">
                <p className="text-sm text-muted-foreground sm:mr-auto sm:max-w-md">
                  {isCold
                    ? "Save the lead when contact details are complete. Register as Client when they show interest."
                    : "Complete all required fields, then save or register as client."}
                </p>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button
                    variant="secondary"
                    onClick={convertAndNavigate}
                    disabled={!canRegisterAsClient}
                    title={
                      canRegisterAsClient
                        ? "Create client and open profile"
                        : isCold
                          ? "Enter name plus email or phone first"
                          : "Complete all required warm/hot fields first"
                    }
                  >
                    <UserCheck className="size-4 mr-1" />
                    Register as Client
                  </Button>
                  <Button
                    onClick={validateAndSubmit}
                    disabled={saving || converting || !canRegisterAsClient}
                    title={
                      canRegisterAsClient
                        ? "Save lead and open detail page"
                        : isCold
                          ? "Enter name plus email or phone first"
                          : "Complete all required warm/hot fields first"
                    }
                  >
                    Save &amp; View
                  </Button>
                </div>
              </Card>
            )}
        </>
      </div>
    </AppLayout>
  );
};

export default LeadNew;
