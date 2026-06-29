import { Badge } from "@/components/ui/badge";
import type { KcArticleStatus, KcVersionStatus } from "@/knowledge-centre/types/kc";

const articleLabels: Record<KcArticleStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  published: "Published",
  archived: "Archived",
};

const versionLabels: Record<KcVersionStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  published: "Published",
  superseded: "Superseded",
};

export function KcStatusBadge({ status }: { status: KcArticleStatus | KcVersionStatus | string }) {
  const label = articleLabels[status as KcArticleStatus] ?? versionLabels[status as KcVersionStatus] ?? status;
  const variant =
    status === "published" ? "default" : status === "archived" || status === "superseded" ? "secondary" : "outline";
  return <Badge variant={variant}>{label}</Badge>;
}

export function ArticleVersionBadge({ label, publishedAt }: { label?: string | null; publishedAt?: string | null }) {
  if (!label) return null;
  return (
    <Badge variant="outline" className="font-mono text-xs">
      v{label}
      {publishedAt ? ` · ${new Date(publishedAt).toLocaleDateString()}` : ""}
    </Badge>
  );
}
