import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  FileCheck2,
  FileText,
  FolderArchive,
  Mail,
  MessageCircle,
  MoreHorizontal,
  ShieldCheck,
  Star,
  ArrowRightLeft,
  ListTodo,
  Flag,
  Upload,
  Loader2,
  RotateCcw,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CallClientButton } from "@/components/clients/CallClientButton";
import { LeadTemperaturePicker } from "@/components/leads/LeadTemperaturePicker";
import { updateClientLeadTemperature } from "@/lib/clientLeadTemperature";
import type { LeadTemperature } from "@/lib/leads";
import { toast } from "sonner";
import { AddTaskDialog } from "@/components/clients/AddTaskDialog";
import { buildServiceLibraryUrl } from "@/lib/service-library/serviceCodes";
import { countryFlagEmoji } from "@/lib/service-library/countryBadges";
import type { ActiveServiceContext } from "@/lib/clientActiveServiceContext";
import type { CaseOutcome, ClientServiceCase } from "@/lib/clientServiceCase";
import { OUTCOME_BADGE } from "@/lib/caseOutcomeStyles";
import { attachRefusalDocument, uploadOutcomeDocument } from "@/lib/caseOutcome";
import { CaseAttemptSwitcher } from "@/components/clients/CaseAttemptSwitcher";

export type ClientHeaderClient = {
  id: string;
  full_name: string;
  application_id: string;
  country: string;
  application_type: string;
  branch?: string | null;
  email?: string | null;
  phone?: string | null;
  lead_temperature?: string | null;
  lead_score?: number | null;
  source_lead_id?: string | null;
  owner_id?: string | null;
  created_by?: string | null;
  current_stage_id?: string | null;
};

type Props = {
  client: ClientHeaderClient;
  serviceCtx: ActiveServiceContext;
  slLibraryId?: string | null;
  slCountry?: string | null;
  fromServiceLibrary?: boolean;
  canUpload: boolean;
  isAdmin: boolean;
  userId?: string | null;
  onHandoff: () => void;
  onRemark: () => void;
  onManageAccess: () => void;
  onGenerateBinder?: () => void;
  onGenerateGroupedBinders?: () => void;
  generating?: boolean;
  generatingGroups?: boolean;
  hasTemplate?: boolean;
  refusalDocPending?: boolean;
  caseClosed?: boolean;
  caseOutcome?: CaseOutcome | null;
  caseId?: string | null;
  attemptNumber?: number;
  serviceAttempts?: ClientServiceCase[];
  onSelectAttempt?: (caseId: string) => void;
  onCaseOutcome?: () => void;
  onReapply?: () => void;
  onRefusalDocUploaded?: () => void;
  onOpenAssessment?: () => void;
  onTemperatureChange?: (temperature: LeadTemperature) => void;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function ClientIdentityHeader({
  client,
  serviceCtx,
  slLibraryId,
  slCountry,
  fromServiceLibrary,
  canUpload,
  isAdmin,
  userId,
  onHandoff,
  onRemark,
  onManageAccess,
  onGenerateBinder,
  onGenerateGroupedBinders,
  generating,
  generatingGroups,
  hasTemplate,
  refusalDocPending,
  caseClosed,
  caseOutcome,
  caseId,
  attemptNumber,
  serviceAttempts = [],
  onSelectAttempt,
  onCaseOutcome,
  onReapply,
  onRefusalDocUploaded,
  onOpenAssessment,
  onTemperatureChange,
}: Props) {
  const refusalInputRef = useRef<HTMLInputElement>(null);
  const [uploadingRefusal, setUploadingRefusal] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [savingTemperature, setSavingTemperature] = useState(false);
  const destination = serviceCtx.destinationCountry ?? client.country;
  const flag = destination ? countryFlagEmoji(destination) : "";
  const serviceLabel = serviceCtx.serviceLabel ?? client.application_type;
  const libraryId = slLibraryId ?? serviceCtx.libraryId;
  const resolvedSlCountry = slCountry ?? serviceCtx.destinationCountry;
  const cleanPhone = (client.phone ?? "").replace(/\D/g, "");
  const canManageAccess =
    isAdmin || (!!userId && (client.owner_id === userId || client.created_by === userId));
  const score = client.lead_score ?? 0;
  const showScore = score > 0;

  const onTemperatureSelect = async (temperature: LeadTemperature) => {
    if (temperature === client.lead_temperature) return;
    setSavingTemperature(true);
    try {
      await updateClientLeadTemperature(client.id, temperature, {
        sourceLeadId: client.source_lead_id,
        previousTemperature: client.lead_temperature,
      });
      onTemperatureChange?.(temperature);
      toast.success(`Lead importance set to ${temperature}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update lead importance");
    } finally {
      setSavingTemperature(false);
    }
  };

  const onRefusalFile = async (file: File) => {
    if (!caseId || !canUpload) return;
    setUploadingRefusal(true);
    try {
      const docId = await uploadOutcomeDocument({
        clientId: client.id,
        caseId,
        file,
        documentType: "Other",
        customType: "Visa refusal letter",
      });
      await attachRefusalDocument({
        caseId,
        clientId: client.id,
        documentId: docId,
        actorId: userId ?? null,
      });
      toast.success("Refusal letter uploaded");
      onRefusalDocUploaded?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingRefusal(false);
    }
  };

  return (
    <>
      <div className="border-b bg-card shadow-elev-sm">
        <div className="px-4 sm:px-8 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <Avatar className="size-12 shrink-0 border border-primary/20 shadow-sm">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                {initials(client.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{client.full_name}</h1>
                <LeadTemperaturePicker
                  value={client.lead_temperature}
                  disabled={!canUpload || savingTemperature}
                  onChange={onTemperatureSelect}
                />
                {showScore && (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    <Star className="size-3 fill-amber-500 text-amber-500" />
                    {score}
                  </span>
                )}
                {caseClosed && caseOutcome && OUTCOME_BADGE[caseOutcome] && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${OUTCOME_BADGE[caseOutcome].className}`}
                  >
                    {OUTCOME_BADGE[caseOutcome].label}
                  </span>
                )}
                {refusalDocPending && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/50 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                    <Flag className="size-3" />
                    Refusal letter pending
                    {canUpload && caseId && (
                      <>
                        <input
                          ref={refusalInputRef}
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void onRefusalFile(f);
                            e.target.value = "";
                          }}
                        />
                        <button
                          type="button"
                          className="ml-1 inline-flex items-center gap-0.5 underline underline-offset-2 hover:no-underline disabled:opacity-50"
                          disabled={uploadingRefusal}
                          onClick={() => refusalInputRef.current?.click()}
                        >
                          {uploadingRefusal ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Upload className="size-3" />
                          )}
                          Upload
                        </button>
                      </>
                    )}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <span className="font-mono text-primary/90">{client.application_id}</span>
                {destination && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      {flag && <span aria-hidden>{flag}</span>}
                      {destination}
                    </span>
                  </>
                )}
                {serviceLabel && (
                  <>
                    <span>·</span>
                    <span className="inline-flex flex-wrap items-center gap-x-1.5">
                      {serviceLabel}
                      {serviceAttempts.length > 1 && onSelectAttempt ? (
                        <CaseAttemptSwitcher
                          attempts={serviceAttempts}
                          activeCaseId={caseId}
                          onSelect={onSelectAttempt}
                        />
                      ) : attemptNumber != null && attemptNumber > 1 ? (
                        <span className="text-muted-foreground">· Attempt {attemptNumber}</span>
                      ) : null}
                    </span>
                  </>
                )}
                {client.branch && (
                  <>
                    <span>·</span>
                    <span>{client.branch}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {libraryId && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  to={buildServiceLibraryUrl({ libraryId, country: resolvedSlCountry })}
                  title="Service Library"
                >
                  <ChevronLeft className="size-4 mr-1" />
                  Service Library
                </Link>
              </Button>
            )}
            {onOpenAssessment && (
              <Button variant="outline" size="sm" onClick={onOpenAssessment}>
                <ClipboardCheck className="size-4 mr-1" />
                Eligibility Assessment
              </Button>
            )}
            {!libraryId && (
              <Button asChild variant="outline" size="icon" className="size-9">
                <Link to="/clients" title="All clients">
                  <ChevronLeft className="size-4" />
                </Link>
              </Button>
            )}
            <CallClientButton clientId={client.id} />
            {client.phone && cleanPhone && (
              <Button
                size="icon"
                variant="outline"
                className="size-9 shrink-0"
                title="WhatsApp"
                onClick={() => import("@/lib/whatsappShare").then((m) => m.openWhatsApp(cleanPhone, ""))}
              >
                <MessageCircle className="size-4" />
              </Button>
            )}
            {client.email && (
              <Button
                size="icon"
                variant="outline"
                className="size-9"
                title="Email"
                onClick={() => window.open(`mailto:${client.email}`)}
              >
                <Mail className="size-4" />
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setTaskOpen(true)}>
              <ListTodo className="size-3.5 mr-1.5" />
              Task
            </Button>
            {canUpload && onCaseOutcome && !caseClosed && (
              <Button size="sm" variant="secondary" onClick={onCaseOutcome}>
                Case outcome
              </Button>
            )}
            {canUpload && onReapply && caseClosed && (
              <Button
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white border-orange-700"
                onClick={onReapply}
              >
                <RotateCcw className="size-3.5 mr-1.5" />
                Reapply
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="outline" className="size-9">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={onHandoff}>
                  <ArrowRightLeft className="size-4 mr-2" /> Hand off
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onRemark}>
                  <FileText className="size-4 mr-2" /> Add remark
                </DropdownMenuItem>
                {canManageAccess && (
                  <DropdownMenuItem onClick={onManageAccess}>
                    <ShieldCheck className="size-4 mr-2" /> Manage access
                  </DropdownMenuItem>
                )}
                {canUpload && hasTemplate && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onGenerateGroupedBinders} disabled={generatingGroups}>
                      <FolderArchive className="size-4 mr-2" />
                      Grouped binders
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onGenerateBinder} disabled={generating}>
                      <FileCheck2 className="size-4 mr-2" />
                      Full binder
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <AddTaskDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        clientId={client.id}
        applicationMode
        pipelineStageId={client.current_stage_id ?? undefined}
      />
    </>
  );
}
