import { Bell, Share2, Search, BookOpen, Brain, Plus, Link as LinkIcon, ClipboardCheck } from "lucide-react";
import flcLogo from "@/assets/flc-logo.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AcademyViewModel } from "@/lib/service-library/buildAcademyViewModel";
import { splitServiceTitle } from "@/lib/service-library/serviceDisplayLabels";
import { copyToClipboard } from "@/lib/serviceLibrary";
import { toast } from "sonner";
import { MbbsInstitutionSwitcher } from "@/components/service-library/design/MbbsInstitutionSwitcher";
import type { MbbsInstitutionOption } from "@/lib/service-library/mbbs/types";

type Props = {
  view: AcademyViewModel;
  mbbsInstitutionOptions?: MbbsInstitutionOption[];
  selectedInstitutionId?: string | null;
  onInstitutionChange?: (id: string) => void;
  onOpenTab?: (tab: string) => void;
  onOpenResources?: () => void;
  onNewApplication?: () => void;
  onStartEligibility?: () => void;
  policyDismissed?: boolean;
  canManage?: boolean;
};

export function ServiceAcademyHero({
  view,
  mbbsInstitutionOptions,
  selectedInstitutionId,
  onInstitutionChange,
  onOpenTab,
  onOpenResources,
  onNewApplication,
  onStartEligibility,
  policyDismissed,
  canManage,
}: Props) {
  const showPolicy = !policyDismissed && view.policyAlert;
  const regionLabel = view.mbbsMeta?.regionLabel ?? view.country;
  const { country: titleCountry, name: titleName } = view.isMbbs
    ? { country: regionLabel, name: view.mbbsMeta?.institutionName ?? view.title }
    : splitServiceTitle(view.title, view.country);

  return (
    <div className={cn("space-y-4 border-b bg-card pb-4", view.isMbbs && "border-rose-500/20")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="text-sm text-muted-foreground flex flex-wrap items-center gap-1.5">
          <span>Future Link Consultants</span>
          <span>›</span>
          <span>Service Library</span>
          <span>›</span>
          <span>{view.categoryLabel}</span>
          <span>›</span>
          <span className="text-foreground font-medium">{view.breadcrumbTitle}</span>
        </nav>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/15">
            {view.version} · {view.versionStatus}
          </Badge>
          {showPolicy && (
            <Badge
              variant="outline"
              className="border-warning/50 bg-warning/10 text-warning cursor-pointer"
              onClick={() => onOpenTab?.("changelog")}
            >
              Policy update
            </Badge>
          )}
          <div className="relative hidden sm:block w-48 md:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input placeholder="Search services…" className="h-8 pl-8 text-sm" />
          </div>
          <Button variant="ghost" size="icon" className="size-8 relative">
            <Bell className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={async () => {
              const ok = await copyToClipboard(view.shareLink);
              toast[ok ? "success" : "error"](ok ? "Link copied" : "Copy failed");
            }}
          >
            <Share2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {view.isMbbs && mbbsInstitutionOptions && selectedInstitutionId && onInstitutionChange && (
          <MbbsInstitutionSwitcher
            options={mbbsInstitutionOptions}
            selectedId={selectedInstitutionId}
            onSelect={onInstitutionChange}
          />
        )}
        <div className="flex gap-4 items-start">
          <div
            className={cn(
              "size-14 rounded-xl bg-white flex items-center justify-center shrink-0 border shadow-sm p-2",
              view.isMbbs ? "border-rose-500/30" : "border-border",
            )}
          >
            <img src={flcLogo} alt="Future Link Consultants" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            {titleCountry ? (
              <p className="text-sm font-semibold text-muted-foreground tracking-wide mb-0.5">{titleCountry}</p>
            ) : null}
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-snug">
              {titleName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 leading-snug">{view.subtitle}</p>
            {view.updatedLabel && (
              <p className="text-xs text-muted-foreground mt-0.5">{view.updatedLabel}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {view.tags.map((tag) => (
                <span
                  key={tag.label}
                  className={cn(
                    "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
                    tag.variant === "success" && "border-success/40 bg-success/10 text-success",
                    tag.variant === "warning" && "border-warning/40 bg-warning/10 text-warning",
                    tag.variant === "neutral" && "border-border bg-muted/40",
                  )}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-end pl-[4.5rem]">
          {canManage && (
            <Button variant="outline" size="sm" asChild>
              <a href={`/service-library-admin`} target="_blank" rel="noopener noreferrer">
                Edit content
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => (onOpenResources ? onOpenResources() : onOpenTab?.("downloads"))}>
            <BookOpen className="size-4 mr-1.5" />
            Resources
          </Button>
          <Button variant="outline" size="sm" onClick={() => onOpenTab?.("quiz")}>
            <Brain className="size-4 mr-1.5" />
            Take quiz
          </Button>
          {!view.isCoaching && !view.isMbbs && onStartEligibility && (
            <Button variant="outline" size="sm" onClick={onStartEligibility}>
              <ClipboardCheck className="size-4 mr-1.5" />
              Eligibility Assessment
            </Button>
          )}
          <Button
            size="sm"
            className="bg-success hover:bg-success/90 text-success-foreground"
            onClick={onNewApplication}
          >
            <Plus className="size-4 mr-1.5" />
            {view.isCoaching ? "New enrollment" : "New application"}
          </Button>
        </div>
      </div>

      {showPolicy && view.policyAlert && (
        <p className="text-xs text-muted-foreground flex items-start gap-2">
          <LinkIcon className="size-3.5 shrink-0 mt-0.5" />
          <span>
            <span className="font-medium text-warning">Policy — {view.policyAlert.date}:</span>{" "}
            {view.policyAlert.summary}
            {view.isMbbs && view.mbbsMeta?.website && (
              <>
                {" "}
                <a
                  href={view.mbbsMeta.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {view.mbbsMeta.website.replace(/^https?:\/\//, "")}
                </a>
              </>
            )}
          </span>
        </p>
      )}
    </div>
  );
}
