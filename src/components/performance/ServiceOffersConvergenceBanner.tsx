import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  dismissServiceOffersBanner,
  isServiceOffersBannerDismissed,
  LEGACY_OFFERS_RETIREMENT_LABEL,
  SERVICE_OFFERS_CONVERGENCE_BANNER,
} from "@/lib/legacyOffersConvergence";

interface ServiceOffersConvergenceBannerProps {
  /** One dismiss state per legacy surface (e.g. registration invoice). */
  scope: string;
  className?: string;
}

export function ServiceOffersConvergenceBanner({ scope, className }: ServiceOffersConvergenceBannerProps) {
  const [dismissed, setDismissed] = useState(() => isServiceOffersBannerDismissed(scope));

  if (dismissed) return null;

  const copy = SERVICE_OFFERS_CONVERGENCE_BANNER;

  return (
    <div
      className={cn(
        "rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm",
        className,
      )}
      role="status"
    >
      <div className="flex gap-2">
        <AlertTriangle className="size-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2 min-w-0">
          <p className="text-amber-950/90 dark:text-amber-100/90">
            <span className="font-medium text-amber-900 dark:text-amber-200">{copy.title}. </span>
            {copy.body(LEGACY_OFFERS_RETIREMENT_LABEL)}
          </p>
          <Button variant="outline" size="sm" className="h-8 border-amber-600/30" asChild>
            <Link to={copy.ctaTo}>{copy.ctaLabel}</Link>
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          aria-label="Dismiss"
          onClick={() => {
            dismissServiceOffersBanner(scope);
            setDismissed(true);
          }}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
