import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  findDuplicateApplication,
  upsertStudentApplication,
} from "@/lib/application/applicationApi";
import type { ApplicationDuplicateMatch } from "@/lib/application/applicationDuplicate";
import {
  buildIntakeTermOptions,
  fetchCourseFinderCoursesForInstitution,
  fetchCourseFinderInstitutions,
  snapshotFieldsFromCourse,
  type CourseFinderCourseOption,
  type CourseFinderInstitutionOption,
} from "@/lib/application/courseFinderCatalog";
import { ApplicationDuplicateWarningDialog } from "./ApplicationDuplicateWarningDialog";
import { InstitutionFeePreviewPanel } from "./InstitutionFeePreviewPanel";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  isFeeMasterV1Enabled,
  useResolvedInstitutionFees,
  serializeFeeSnapshot,
  tuitionFromResolutions,
  applicationFeeFromResolutions,
} from "@/lib/feeMaster";

type PendingCreatePayload = {
  clientId: string;
  clientServiceCaseId: string;
  institutionId: string;
  cfCourseId: string | null;
  intakeTerm: string;
  programName: string | null;
  programCode: string | null;
  campusName: string | null;
  destinationCountry: string | null;
  intakeYear: number | null;
  studyLevel: string | null;
  durationMonths: number | null;
  tuitionFee: number | null;
  tuitionCurrency: string | null;
  applicationFee: number | null;
  applicationFeeCurrency: string | null;
  partnershipRouteId: string | null;
  feeSnapshotJsonb: Record<string, unknown>[] | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  caseId: string;
  onCreated: (applicationId: string) => void;
};

export function ApplicationCreateDialog({
  open,
  onOpenChange,
  clientId,
  caseId,
  onCreated,
}: Props) {
  const [institutions, setInstitutions] = useState<CourseFinderInstitutionOption[]>([]);
  const [courses, setCourses] = useState<CourseFinderCourseOption[]>([]);
  const [institutionId, setInstitutionId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [programName, setProgramName] = useState("");
  const [programCode, setProgramCode] = useState("");
  const [campusName, setCampusName] = useState("");
  const [destinationCountry, setDestinationCountry] = useState("");
  const [intakeTerm, setIntakeTerm] = useState("");
  const [intakeYear, setIntakeYear] = useState("");
  const [studyLevel, setStudyLevel] = useState("");
  const [durationMonths, setDurationMonths] = useState("");
  const [tuitionFee, setTuitionFee] = useState("");
  const [tuitionCurrency, setTuitionCurrency] = useState("");
  const [manualOverride, setManualOverride] = useState(false);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [saving, setSaving] = useState(false);
  const [duplicateMatch, setDuplicateMatch] = useState<ApplicationDuplicateMatch | null>(null);
  const [pendingCreate, setPendingCreate] = useState<PendingCreatePayload | null>(null);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === courseId) ?? null,
    [courses, courseId],
  );
  const intakeOptions = useMemo(
    () => (selectedCourse ? buildIntakeTermOptions(selectedCourse) : []),
    [selectedCourse],
  );
  const campusOptions = selectedCourse?.campusNames ?? [];
  const fieldsLocked = !!selectedCourse && !manualOverride;
  const feeMasterEnabled = isFeeMasterV1Enabled();

  const {
    loading: feesLoading,
    error: feesError,
    resolutions,
    selectedRoute,
  } = useResolvedInstitutionFees({
    institutionId: institutionId || null,
    cfCourseId: courseId || null,
    enabled: open && feeMasterEnabled && !!institutionId,
  });

  useEffect(() => {
    if (!feeMasterEnabled || manualOverride || !resolutions.length) return;
    const { tuitionFee: resolvedTuition, tuitionCurrency: resolvedCurrency } =
      tuitionFromResolutions(resolutions);
    if (resolvedTuition != null) {
      setTuitionFee(String(resolvedTuition));
      setTuitionCurrency(resolvedCurrency ?? "CAD");
    }
  }, [feeMasterEnabled, manualOverride, resolutions]);

  useEffect(() => {
    if (!open) return;
    setLoadingInstitutions(true);
    void fetchCourseFinderInstitutions()
      .then(setInstitutions)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Could not load institutions"))
      .finally(() => setLoadingInstitutions(false));
  }, [open]);

  useEffect(() => {
    if (!open || !institutionId) {
      setCourses([]);
      return;
    }

    setLoadingCourses(true);
    void fetchCourseFinderCoursesForInstitution(institutionId)
      .then((rows) => {
        setCourses(rows);
        if (rows.length === 0) {
          setCourseId("");
        }
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Could not load programs"))
      .finally(() => setLoadingCourses(false));
  }, [open, institutionId]);

  const resetForm = () => {
    setInstitutionId("");
    setCourseId("");
    setProgramName("");
    setProgramCode("");
    setCampusName("");
    setDestinationCountry("");
    setIntakeTerm("");
    setIntakeYear("");
    setStudyLevel("");
    setDurationMonths("");
    setTuitionFee("");
    setTuitionCurrency("");
    setManualOverride(false);
    setCourses([]);
    setDuplicateMatch(null);
    setPendingCreate(null);
  };

  const applyCourseSnapshot = (course: CourseFinderCourseOption, nextCampus?: string, nextIntake?: string) => {
    const snapshot = snapshotFieldsFromCourse(course, {
      campusName: nextCampus ?? campusName,
      intakeTerm: nextIntake ?? intakeTerm,
    });
    setProgramName(snapshot.programName);
    setProgramCode(snapshot.programCode ?? "");
    setCampusName(snapshot.campusName ?? "");
    setDestinationCountry(snapshot.destinationCountry ?? "");
    setIntakeTerm(snapshot.intakeTerm);
    setIntakeYear(snapshot.intakeYear != null ? String(snapshot.intakeYear) : "");
    setStudyLevel(snapshot.studyLevel);
    setDurationMonths(snapshot.durationMonths != null ? String(snapshot.durationMonths) : "");
    setTuitionFee(snapshot.tuitionFee != null ? String(snapshot.tuitionFee) : "");
    setTuitionCurrency(snapshot.tuitionCurrency ?? "");
  };

  const handleInstitutionChange = (nextInstitutionId: string) => {
    setInstitutionId(nextInstitutionId);
    setCourseId("");
    setProgramName("");
    setProgramCode("");
    setCampusName("");
    setDestinationCountry("");
    setIntakeTerm("");
    setIntakeYear("");
    setStudyLevel("");
    setDurationMonths("");
    setTuitionFee("");
    setTuitionCurrency("");
    setManualOverride(false);

    const institution = institutions.find((item) => item.id === nextInstitutionId);
    if (institution?.countryName) {
      setDestinationCountry(institution.countryName);
    }
  };

  const handleCourseChange = (nextCourseId: string) => {
    setCourseId(nextCourseId);
    setManualOverride(false);
    const course = courses.find((item) => item.id === nextCourseId);
    if (course) applyCourseSnapshot(course);
  };

  const buildPendingPayload = (): PendingCreatePayload | null => {
    if (!institutionId || !intakeTerm.trim()) {
      toast.error("Institution and intake are required");
      return null;
    }
    if (!programName.trim()) {
      toast.error("Select a Course Finder program or enable manual override");
      return null;
    }
    if (!courseId && !manualOverride) {
      toast.error("Select a program from Course Finder or enable manual override");
      return null;
    }

    let resolvedTuitionFee = tuitionFee ? Number(tuitionFee) : null;
    let resolvedTuitionCurrency = tuitionCurrency.trim() || null;
    let applicationFee: number | null = null;
    let applicationFeeCurrency: string | null = null;
    let partnershipRouteId: string | null = null;
    let feeSnapshotJsonb: Record<string, unknown>[] | null = null;

    if (feeMasterEnabled && !manualOverride && resolutions.length) {
      const tuition = tuitionFromResolutions(resolutions);
      const appFee = applicationFeeFromResolutions(resolutions);
      resolvedTuitionFee = tuition.tuitionFee;
      resolvedTuitionCurrency = tuition.tuitionCurrency;
      applicationFee = appFee.applicationFee;
      applicationFeeCurrency = appFee.applicationFeeCurrency;
      partnershipRouteId = selectedRoute?.id ?? null;
      feeSnapshotJsonb = serializeFeeSnapshot(resolutions);
    }

    return {
      clientId,
      clientServiceCaseId: caseId,
      institutionId,
      cfCourseId: courseId || null,
      intakeTerm: intakeTerm.trim(),
      programName: programName.trim() || null,
      programCode: programCode.trim() || null,
      campusName: campusName.trim() || null,
      destinationCountry: destinationCountry.trim() || null,
      intakeYear: intakeYear ? Number(intakeYear) : null,
      studyLevel: studyLevel.trim() || null,
      durationMonths: durationMonths ? Number(durationMonths) : null,
      tuitionFee: resolvedTuitionFee,
      tuitionCurrency: resolvedTuitionCurrency,
      applicationFee,
      applicationFeeCurrency,
      partnershipRouteId,
      feeSnapshotJsonb,
    };
  };

  const createApplication = async (
    payload: PendingCreatePayload,
    options?: { allowDuplicateOverride?: boolean; duplicateOverrideReason?: string },
  ) => {
    const id = await upsertStudentApplication({
      ...payload,
      allowDuplicateOverride: options?.allowDuplicateOverride,
      duplicateOverrideReason: options?.duplicateOverrideReason,
    });
    toast.success(
      options?.allowDuplicateOverride ? "Application created with duplicate override" : "Application created",
    );
    onCreated(id);
    onOpenChange(false);
    resetForm();
  };

  const handleSubmit = async () => {
    const payload = buildPendingPayload();
    if (!payload) return;

    setSaving(true);
    try {
      const duplicate = await findDuplicateApplication({
        clientId: payload.clientId,
        institutionId: payload.institutionId,
        programName: payload.programName,
        campusName: payload.campusName,
        intakeTerm: payload.intakeTerm,
      });

      if (duplicate) {
        setPendingCreate(payload);
        setDuplicateMatch(duplicate);
        return;
      }

      await createApplication(payload);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create application");
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicateOverride = async (reason: string) => {
    if (!pendingCreate) return;
    setSaving(true);
    try {
      await createApplication(pendingCreate, {
        allowDuplicateOverride: true,
        duplicateOverrideReason: reason,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create application");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next);
          if (!next) resetForm();
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Student Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Institution</Label>
              <Select value={institutionId} onValueChange={handleInstitutionChange} disabled={loadingInstitutions}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingInstitutions ? "Loading institutions…" : "Select institution"} />
                </SelectTrigger>
                <SelectContent>
                  {institutions.map((institution) => (
                    <SelectItem key={institution.id} value={institution.id}>
                      {institution.name}
                      {institution.countryName ? ` · ${institution.countryName}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!loadingInstitutions && institutions.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No Course Finder–linked institutions found. Link institutions in Institution Review first.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Program (Course Finder)</Label>
              <Select
                value={courseId}
                onValueChange={handleCourseChange}
                disabled={!institutionId || loadingCourses}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !institutionId
                        ? "Select institution first"
                        : loadingCourses
                          ? "Loading programs…"
                          : courses.length
                            ? "Select program"
                            : "No programs linked to this institution"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                      {course.programCode ? ` (${course.programCode})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {institutionId && !loadingCourses && courses.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Publish programs from Institution Review or add courses in Course Finder for this institution.
                </p>
              )}
            </div>

            {selectedCourse && (
              <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                <p>
                  <span className="font-medium text-foreground">Source:</span> Course Finder
                  {selectedCourse.universityName ? ` · ${selectedCourse.universityName}` : ""}
                </p>
                <p>
                  <span className="font-medium text-foreground">Field:</span> {selectedCourse.fieldOfStudy}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                id="manual-override"
                checked={manualOverride}
                onCheckedChange={(checked) => setManualOverride(!!checked)}
              />
              <Label htmlFor="manual-override" className="text-sm font-normal cursor-pointer">
                Manual override for exceptional cases
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Program code</Label>
                <Input
                  value={programCode}
                  onChange={(e) => setProgramCode(e.target.value)}
                  disabled={fieldsLocked}
                />
              </div>
              <div className="space-y-2">
                <Label>Campus</Label>
                {campusOptions.length > 0 && !manualOverride ? (
                  <Select value={campusName || undefined} onValueChange={setCampusName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select campus" />
                    </SelectTrigger>
                    <SelectContent>
                      {campusOptions.map((campus) => (
                        <SelectItem key={campus} value={campus}>
                          {campus}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={campusName}
                    onChange={(e) => setCampusName(e.target.value)}
                    disabled={fieldsLocked}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Intake</Label>
                {intakeOptions.length > 0 && !manualOverride ? (
                  <Select value={intakeTerm || undefined} onValueChange={setIntakeTerm}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select intake" />
                    </SelectTrigger>
                    <SelectContent>
                      {intakeOptions.map((term) => (
                        <SelectItem key={term} value={term}>
                          {term}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="e.g. Fall 2026"
                    value={intakeTerm}
                    onChange={(e) => setIntakeTerm(e.target.value)}
                    disabled={fieldsLocked && intakeOptions.length > 0}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Destination country</Label>
                <Input
                  value={destinationCountry}
                  onChange={(e) => setDestinationCountry(e.target.value)}
                  disabled={fieldsLocked}
                />
              </div>
            </div>

            {feeMasterEnabled && institutionId && !manualOverride && (
              <InstitutionFeePreviewPanel
                loading={feesLoading}
                error={feesError}
                resolutions={resolutions}
                routeName={selectedRoute?.display_name}
                compact
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Study level</Label>
                <Input
                  value={studyLevel}
                  onChange={(e) => setStudyLevel(e.target.value)}
                  disabled={fieldsLocked}
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (months)</Label>
                <Input
                  type="number"
                  min={1}
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                  disabled={fieldsLocked}
                />
              </div>
            </div>

            {(!feeMasterEnabled || manualOverride) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tuition fee</Label>
                  <Input
                    type="number"
                    min={0}
                    value={tuitionFee}
                    onChange={(e) => setTuitionFee(e.target.value)}
                    disabled={fieldsLocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Input
                    value={tuitionCurrency}
                    onChange={(e) => setTuitionCurrency(e.target.value)}
                    disabled={fieldsLocked}
                  />
                </div>
              </div>
            )}

            {manualOverride && (
              <div className="space-y-2">
                <Label>Program name (manual)</Label>
                <Input value={programName} onChange={(e) => setProgramName(e.target.value)} />
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Programs load from Course Finder master data. Manual override is for exceptional cases only.
              Duplicate check uses client + institution + program + campus + intake.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={saving || loadingCourses}>
              {saving ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create Application"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ApplicationDuplicateWarningDialog
        open={!!duplicateMatch}
        match={duplicateMatch}
        busy={saving}
        onClose={() => {
          setDuplicateMatch(null);
          setPendingCreate(null);
        }}
        onUseExisting={(applicationId) => {
          setDuplicateMatch(null);
          setPendingCreate(null);
          onOpenChange(false);
          resetForm();
          onCreated(applicationId);
        }}
        onOverride={(reason) => void handleDuplicateOverride(reason)}
      />
    </>
  );
}
