import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Check, X, Pencil, Trash2, Upload, ExternalLink } from "lucide-react";
import type { UpiCourseStaging } from "../types/upi";

type ColumnId =
  | "course"
  | "institution"
  | "country"
  | "level"
  | "campus"
  | "duration"
  | "tuition"
  | "intakes"
  | "ielts"
  | "pte"
  | "toefl"
  | "duolingo"
  | "pgwp"
  | "appFee"
  | "delivery"
  | "status"
  | "confidence"
  | "source";

const ConfidenceBadge = ({ score }: { score: number | null }) => {
  const s = score ?? 0;
  const cls =
    s >= 80
      ? "bg-success/15 text-success"
      : s >= 50
        ? "bg-yellow-500/15 text-yellow-700"
        : "bg-destructive/15 text-destructive";
  return <Badge className={`${cls} border-0`}>{Math.round(s)}%</Badge>;
};

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "published"
      ? "bg-success/15 text-success"
      : status === "approved"
        ? "bg-primary/10 text-primary"
        : status === "rejected"
          ? "bg-destructive/15 text-destructive"
          : "bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={`${cls} border-0 text-[10px] capitalize`}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function formatDuration(r: UpiCourseStaging) {
  if (r.duration_value == null) return "—";
  return `${r.duration_value} ${r.duration_unit ?? "months"}`;
}

function deliveryMode(r: UpiCourseStaging) {
  const m = r.metadata as Record<string, unknown> | null;
  return String(m?.program_delivery_mode ?? (r.is_online ? "Online" : "")).trim() || "—";
}

function PgwpCell({ r }: { r: UpiCourseStaging }) {
  if (r.is_pgwp_eligible === true) return <Badge className="bg-success/15 text-success border-0">Yes</Badge>;
  if (r.is_pgwp_eligible === false) return <Badge variant="secondary">No</Badge>;
  return <>—</>;
}

function RowActions({
  r,
  canEdit,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  onPublish,
}: {
  r: UpiCourseStaging;
  canEdit: boolean;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPublish: () => void;
}) {
  if (!canEdit) {
    return r.review_status === "published" && r.published_course_id ? (
      <Button asChild size="sm" variant="ghost" title="Open in Course Finder">
        <Link to={`/course-finder?courseId=${r.published_course_id}`} target="_blank">
          <ExternalLink className="size-4" />
        </Link>
      </Button>
    ) : (
      <span className="text-xs text-muted-foreground px-2">View only</span>
    );
  }
  return (
    <div className="flex gap-1 justify-end">
      <Button size="sm" variant="ghost" onClick={onApprove}>
        <Check className="size-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={onReject}>
        <X className="size-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={onEdit}>
        <Pencil className="size-4" />
      </Button>
      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete}>
        <Trash2 className="size-4" />
      </Button>
      {r.review_status === "published" && r.published_course_id ? (
        <Button asChild size="sm" variant="ghost" title="Open in Course Finder">
          <Link to={`/course-finder?courseId=${r.published_course_id}`} target="_blank">
            <ExternalLink className="size-4" />
          </Link>
        </Button>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          title={r.review_status === "approved" ? "Publish to Course Finder" : "Approve this row first"}
          disabled={r.review_status !== "approved" && r.review_status !== "needs_update"}
          onClick={onPublish}
        >
          <Upload className="size-4" />
        </Button>
      )}
    </div>
  );
}

export function CourseReviewList({
  rows,
  loading,
  loadError,
  searchText,
  statusFilter,
  viewMode,
  visibleColumns,
  canEdit,
  selected,
  instName,
  instCountry,
  levelName,
  onToggle,
  onToggleAll,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  onPublish,
}: {
  rows: UpiCourseStaging[];
  loading: boolean;
  loadError: string | null;
  searchText: string;
  statusFilter: string;
  viewMode: "table" | "cards";
  visibleColumns: Set<ColumnId>;
  canEdit: boolean;
  selected: Set<string>;
  instName: (id: string | null) => string;
  instCountry: (id: string | null) => string | null;
  levelName: (id: string | null) => string;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (r: UpiCourseStaging) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
}) {
  const col = (id: ColumnId) => visibleColumns.has(id);
  const emptyMsg = loading
    ? "Loading courses…"
    : loadError
      ? "Could not load courses. Check permissions or try again."
      : searchText
        ? `No programs match "${searchText}".`
        : statusFilter === "published"
          ? 'Nothing published yet. Approve rows under "approved" status, then click Bulk Publish.'
          : "No programs match the current filters.";

  const renderCell = (id: ColumnId, r: UpiCourseStaging) => {
    switch (id) {
      case "course":
        return <span className="font-medium">{r.course_title}</span>;
      case "institution":
        return instName(r.institution_id);
      case "country":
        return instCountry(r.institution_id) ?? r.country_name ?? "—";
      case "level":
        return levelName(r.program_level_id);
      case "campus":
        return r.campus_name ?? "—";
      case "duration":
        return formatDuration(r);
      case "tuition":
        return r.tuition_fee ? `${r.tuition_fee} ${r.currency ?? ""}` : "—";
      case "intakes":
        return Array.isArray(r.intake_months) && r.intake_months.length ? r.intake_months.join(", ") : "—";
      case "ielts":
        return r.ielts_overall ?? "—";
      case "pte":
        return r.pte_overall ?? "—";
      case "toefl":
        return r.toefl_overall ?? "—";
      case "duolingo":
        return r.duolingo_overall ?? "—";
      case "pgwp":
        return <PgwpCell r={r} />;
      case "appFee":
        return r.application_fee ?? "—";
      case "delivery":
        return deliveryMode(r);
      case "status":
        return <StatusBadge status={r.review_status} />;
      case "confidence":
        return <ConfidenceBadge score={r.confidence_score} />;
      case "source":
        return r.source_url ? (
          <a className="text-primary inline-flex items-center gap-1" href={r.source_url} target="_blank" rel="noreferrer">
            link <ExternalLink className="size-3" />
          </a>
        ) : (
          "—"
        );
      default:
        return "—";
    }
  };

  const activeCols = (
    [
      "course",
      "institution",
      "country",
      "level",
      "campus",
      "duration",
      "tuition",
      "intakes",
      "ielts",
      "pte",
      "toefl",
      "duolingo",
      "pgwp",
      "appFee",
      "delivery",
      "status",
      "confidence",
      "source",
    ] as ColumnId[]
  ).filter(col);

  const labels: Record<ColumnId, string> = {
    course: "Course",
    institution: "Institution",
    country: "Country",
    level: "Level",
    campus: "Campus",
    duration: "Duration",
    tuition: "Tuition",
    intakes: "Intakes",
    ielts: "IELTS",
    pte: "PTE",
    toefl: "TOEFL",
    duolingo: "Duolingo",
    pgwp: "PGWP",
    appFee: "App fee",
    delivery: "Delivery",
    status: "Status",
    confidence: "Confidence",
    source: "Source",
  };

  if (viewMode === "cards") {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.length === 0 && (
          <Card className="p-8 col-span-full text-center text-muted-foreground text-sm">{emptyMsg}</Card>
        )}
        {rows.map((r) => (
          <Card key={r.id} className="p-4 space-y-3">
            <div className="flex items-start gap-2">
              {canEdit && <Checkbox checked={selected.has(r.id)} onCheckedChange={() => onToggle(r.id)} />}
              <div className="flex-1 min-w-0">
                <div className="font-medium leading-snug">{r.course_title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {instName(r.institution_id)}
                  {r.campus_name ? ` · ${r.campus_name}` : ""}
                </div>
              </div>
              <StatusBadge status={r.review_status} />
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <div>
                <span className="text-muted-foreground">Level </span>
                {levelName(r.program_level_id)}
              </div>
              <div>
                <span className="text-muted-foreground">Duration </span>
                {formatDuration(r)}
              </div>
              <div>
                <span className="text-muted-foreground">IELTS </span>
                {r.ielts_overall ?? "—"}
              </div>
              <div>
                <span className="text-muted-foreground">PTE </span>
                {r.pte_overall ?? "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Tuition </span>
                {r.tuition_fee ? `${r.tuition_fee} ${r.currency ?? ""}` : "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Confidence </span>
                <ConfidenceBadge score={r.confidence_score} />
              </div>
            </div>
            <RowActions
              r={r}
              canEdit={canEdit}
              onApprove={() => onApprove(r.id)}
              onReject={() => onReject(r.id)}
              onEdit={() => onEdit(r)}
              onDelete={() => onDelete(r.id)}
              onPublish={() => onPublish(r.id)}
            />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-2 border-b text-xs text-muted-foreground">
        Showing {rows.length} program{rows.length === 1 ? "" : "s"}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="p-3 w-10">
                {canEdit && (
                  <Checkbox
                    checked={selected.size > 0 && selected.size === rows.length && rows.length > 0}
                    onCheckedChange={onToggleAll}
                  />
                )}
              </th>
              {activeCols.map((id) => (
                <th key={id} className="p-3 whitespace-nowrap">
                  {labels[id]}
                </th>
              ))}
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={activeCols.length + 2} className="p-8 text-center text-muted-foreground">
                  {emptyMsg}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t hover:bg-accent/30">
                <td className="p-3">
                  {canEdit && <Checkbox checked={selected.has(r.id)} onCheckedChange={() => onToggle(r.id)} />}
                </td>
                {activeCols.map((id) => (
                  <td key={id} className={`p-3 ${id === "tuition" || id === "ielts" || id === "pte" ? "tabular-nums" : ""}`}>
                    {renderCell(id, r)}
                  </td>
                ))}
                <td className="p-3">
                  <RowActions
                    r={r}
                    canEdit={canEdit}
                    onApprove={() => onApprove(r.id)}
                    onReject={() => onReject(r.id)}
                    onEdit={() => onEdit(r)}
                    onDelete={() => onDelete(r.id)}
                    onPublish={() => onPublish(r.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
