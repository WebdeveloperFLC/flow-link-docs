import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AI_ROADMAP_FEATURES,
  CMS_DEPARTMENTS,
  ELIGIBILITY_AUDIENCE,
  ELIGIBILITY_HISTORY_CHECKS,
  INVOICE_COMMERCIAL_CONTROLS,
  SERVICE_CATALOG_CATEGORIES,
} from "@/incentives/lib/configurationCmsLogic";
import { cn } from "@/lib/utils";
import { Bolt, Combine, Lock, Shield } from "lucide-react";

export function PerformanceConfigurationEligibilityPanel() {
  return (
    <Card className="p-5 ph-surface-card space-y-4">
      <div>
        <h2 className="text-lg font-semibold ph-heading">Eligibility controls</h2>
        <p className="text-xs ph-muted mt-1">Who can receive offers & wallet discounts</p>
      </div>
      <div>
        <p className="text-xs font-semibold ph-muted uppercase tracking-wide mb-2">Available to</p>
        <div className="flex flex-wrap gap-2">
          {ELIGIBILITY_AUDIENCE.map((label, i) => (
            <Badge key={label} variant={i < 2 ? "default" : "outline"} className="text-xs">
              {label}
            </Badge>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs ph-muted mb-2">Eligibility is evaluated against CRM client history:</p>
        <div className="flex flex-wrap gap-2">
          {ELIGIBILITY_HISTORY_CHECKS.map((label) => (
            <span key={label} className="rounded-full border px-2 py-0.5 text-xs ph-muted">
              {label}
            </span>
          ))}
        </div>
      </div>
      <div className="rounded-lg border ph-period-bar p-3 flex gap-3 text-xs">
        <Shield className="size-4 shrink-0" style={{ color: "var(--amber, #d97706)" }} />
        <div>
          <p className="font-semibold ph-heading">Block re-discounting an active service</p>
          <p className="ph-muted mt-1">
            Example: a client already enrolled in IELTS cannot receive an IELTS offer — but the same client
            enrolling for Germany Opportunity Card is eligible.
          </p>
        </div>
      </div>
    </Card>
  );
}

export function PerformanceConfigurationInvoiceControlsPanel() {
  return (
    <Card className="p-5 ph-surface-card space-y-4">
      <div>
        <h2 className="text-lg font-semibold ph-heading">Invoice-based commercial controls</h2>
        <p className="text-xs ph-muted mt-1">Lock terms once payment begins</p>
      </div>
      <ul className="space-y-3">
        {INVOICE_COMMERCIAL_CONTROLS.map((rule) => (
          <li key={rule.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="ph-heading">{rule.label}</span>
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                rule.enabled ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground",
              )}
            >
              {rule.enabled ? "On" : "Off"}
            </span>
          </li>
        ))}
      </ul>
      <div className="rounded-lg border ph-period-bar p-3 flex gap-3 text-xs">
        <Lock className="size-4 shrink-0" style={{ color: "var(--blue)" }} />
        <p className="ph-muted">
          Once partial or full payment is received, or the invoice is closed, commercial terms lock. Overrides
          require an authorised role and are written to the audit trail.
        </p>
      </div>
    </Card>
  );
}

export function PerformanceConfigurationServiceCatalogPanel() {
  return (
    <Card className="p-5 ph-surface-card space-y-4">
      <div>
        <h2 className="text-lg font-semibold ph-heading">Service catalog</h2>
        <p className="text-xs ph-muted mt-1">Master list — used across CMS, CRM, Wallet, Offer, Incentive & Reporting</p>
      </div>
      {SERVICE_CATALOG_CATEGORIES.map((cat) => (
        <div key={cat.id}>
          <div className="flex items-center gap-2 mb-2">
            <Badge className={cn("border-0 text-[10px]", cat.pillClass)}>{cat.label}</Badge>
            <span className="text-xs ph-muted">{cat.examples.length} examples</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {cat.examples.map((ex) => (
              <span key={ex} className="rounded-full border px-2 py-0.5 text-xs ph-muted">
                {ex}
              </span>
            ))}
          </div>
        </div>
      ))}
      <div className="rounded-lg border ph-period-bar p-3 flex gap-3 text-xs">
        <Combine className="size-4 shrink-0" style={{ color: "var(--blue)" }} />
        <p className="ph-muted">
          New services, destinations, programs and allied offerings are added as data — the combination engine
          composes valid bundles automatically.
        </p>
      </div>
    </Card>
  );
}

export function PerformanceConfigurationDepartmentsPanel() {
  return (
    <Card className="p-5 ph-surface-card space-y-3">
      <div>
        <h2 className="text-lg font-semibold ph-heading">Departments</h2>
        <p className="text-xs ph-muted mt-1">{CMS_DEPARTMENTS.length} departments</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {CMS_DEPARTMENTS.map((d) => (
          <span key={d} className="rounded-full border px-2 py-0.5 text-xs ph-muted">
            {d}
          </span>
        ))}
      </div>
    </Card>
  );
}

export function PerformanceConfigurationAiRoadmapPanel() {
  return (
    <Card className="p-5 ph-surface-card space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold ph-heading">AI recommendation engine</h2>
        <Badge className="bg-violet-100 text-violet-800 border-0">Roadmap · Phase 2</Badge>
      </div>
      <div className="rounded-lg border ph-period-bar p-3 flex gap-3 text-xs">
        <Bolt className="size-4 shrink-0" style={{ color: "var(--blue)" }} />
        <p className="ph-muted">
          Future capability: optimal discount levels per lead, campaign ROI before launch, wallet over-burn
          alerts, and incentive structure suggestions from historical data.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {AI_ROADMAP_FEATURES.map((f) => (
          <div key={f.title} className="rounded-lg border ph-period-bar p-3 bg-muted/20">
            <p className="font-semibold text-sm ph-heading">{f.title}</p>
            <p className="text-xs ph-muted mt-1">{f.description}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
