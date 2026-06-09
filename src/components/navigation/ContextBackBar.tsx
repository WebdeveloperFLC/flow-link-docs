import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildServiceLibraryUrl } from "@/lib/service-library/serviceCodes";

const SL_RETURN_KEY = "flc_sl_return_url";

export function rememberServiceLibraryReturn(libraryId: string, country?: string | null) {
  try {
    sessionStorage.setItem(SL_RETURN_KEY, buildServiceLibraryUrl({ libraryId, country }));
  } catch {
    /* ignore */
  }
}

export function readServiceLibraryReturn(): string | null {
  try {
    return sessionStorage.getItem(SL_RETURN_KEY);
  } catch {
    return null;
  }
}

type Props = {
  libraryId?: string | null;
  country?: string | null;
  /** Shown when no service-library context (defaults to browser back). */
  fallbackLabel?: string;
  fallbackHref?: string;
  className?: string;
};

/** Prominent back control — Service Library when opened from academy, otherwise history or fallback link. */
export function ContextBackBar({
  libraryId,
  country,
  fallbackLabel = "Back",
  fallbackHref,
  className,
}: Props) {
  const navigate = useNavigate();
  const returnUrl = libraryId
    ? buildServiceLibraryUrl({ libraryId, country })
    : readServiceLibraryReturn();

  if (returnUrl) {
    return (
      <div className={className ?? "px-4 sm:px-8 pt-4"}>
        <Button variant="outline" size="sm" asChild>
          <Link to={returnUrl}>
            <ChevronLeft className="size-4 mr-1" />
            Service Library
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={className ?? "px-4 sm:px-8 pt-4"}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => (fallbackHref ? navigate(fallbackHref) : navigate(-1))}
      >
        <ChevronLeft className="size-4 mr-1" />
        {fallbackLabel}
      </Button>
    </div>
  );
}
