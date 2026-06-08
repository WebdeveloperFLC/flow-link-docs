import { Bell, Share2, Search, BookOpen, Brain, Plus, Link as LinkIcon } from "lucide-react";
import flcLogo from "@/assets/flc-logo.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AcademyViewModel } from "@/lib/service-library/buildAcademyViewModel";
import { copyToClipboard } from "@/lib/serviceLibrary";
import { toast } from "sonner";

type Props = {
  view: AcademyViewModel;
  onOpenTab?: (tab: string) => void;
  onOpenResources?: () => void;
  onNewApplication?: () => void;
  policyDismissed?: boolean;
  canManage?: boolean;
};

export function ServiceAcademyHero({
  view,
  onOpenTab,
  onOpenResources,
  onNewApplication,
  policyDismissed,
  canManage,
}: Props) {
  const showPolicy = !policyDismissed && view.policyAlert;

  return (
    <div className="space-y-4 border-b bg-card pb-4">
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

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex gap-4 min-w-0">
          <div className="size-14 rounded-xl bg-white flex items-center justify-center shrink-0 border border-border shadow-sm p-2">
            <img src={flcLogo} alt="Future Link Consultants" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{view.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{view.subtitle}</p>
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
        <div className="flex flex-wrap gap-2 shrink-0">
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
          </span>
        </p>
      )}
    </div>
  );
}
