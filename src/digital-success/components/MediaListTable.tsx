import { ExternalLink, Pin, Star, Archive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DshMedia } from "../lib/dshTypes";
import { CopyLinkButton } from "./CopyLinkButton";

function externalHref(m: DshMedia): string | null {
  return m.external_url ?? null;
}

export function MediaListTable({
  rows,
  loading,
  onNotify,
}: {
  rows: DshMedia[];
  loading?: boolean;
  onNotify?: (m: DshMedia) => void;
}) {
  if (loading) return <div className="text-sm text-muted-foreground p-6">Loading content…</div>;
  if (!rows.length) return <div className="text-sm text-muted-foreground p-6">No content yet.</div>;

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Scope</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Campaign</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((m) => {
            const url = externalHref(m);
            return (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {m.is_pinned && <Pin className="size-3.5 text-amber-500" />}
                    {m.is_google_review && <Star className="size-3.5 text-yellow-500" />}
                    {m.status === "archived" && <Archive className="size-3.5 text-muted-foreground" />}
                    <div>
                      <div className="font-medium">{m.title}</div>
                      {m.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1 max-w-md">
                          {m.description}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{m.content_scope}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{m.content_type}</Badge>
                </TableCell>
                <TableCell className="text-sm">{m.country_name ?? "—"}</TableCell>
                <TableCell className="text-sm">{m.service_master_key ?? "—"}</TableCell>
                <TableCell className="text-sm">{m.campaign_name ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <CopyLinkButton url={url} />
                    {url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="size-3.5 mr-1" /> Open
                        </a>
                      </Button>
                    )}
                    {onNotify && (
                      <Button variant="outline" size="sm" onClick={() => onNotify(m)}>
                        Notify
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}