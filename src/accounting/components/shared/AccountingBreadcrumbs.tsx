import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export default function AccountingBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (!items?.length) return null;
  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1 text-[12px] text-muted-foreground">
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1">
              {it.to && !last ? (
                <Link to={it.to} className="hover:text-foreground transition-colors">{it.label}</Link>
              ) : (
                <span className={last ? "text-foreground font-medium" : ""}>{it.label}</span>
              )}
              {!last && <ChevronRight className="size-3 text-muted-foreground/60" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}