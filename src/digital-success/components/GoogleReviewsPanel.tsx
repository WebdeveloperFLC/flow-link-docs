import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, Star, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DshMedia } from "../lib/dshTypes";
import { useBranches, useTeamMembers } from "../hooks/useDshMedia";

function monthKey(d: string | null | undefined): string {
  if (!d) return "";
  return d.slice(0, 7); // YYYY-MM
}

async function openScreenshot(path: string) {
  const { data, error } = await supabase.storage.from("dsh-media").createSignedUrl(path, 60);
  if (error || !data?.signedUrl) {
    toast.error("Could not open screenshot");
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

export function GoogleReviewsPanel({ rows, loading }: { rows: DshMedia[]; loading?: boolean }) {
  const [month, setMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const { data: branches = [] } = useBranches();
  const { data: team = [] } = useTeamMembers();

  const branchName = (id: string | null) =>
    id ? (branches.find((b: any) => b.id === id)?.name ?? "—") : "—";
  const memberName = (id: string | null) => {
    if (!id) return "—";
    const m = team.find((u) => u.id === id);
    return m?.full_name ?? m?.email ?? id.slice(0, 8);
  };

  const monthlyRows = useMemo(
    () => rows.filter((r) => monthKey(r.review_received_at) === month),
    [rows, month],
  );

  const byCounselor = useMemo(() => {
    const map = new Map<string, { count: number; sum: number }>();
    for (const r of monthlyRows) {
      const key = r.credited_user_id ?? "_unknown";
      const e = map.get(key) ?? { count: 0, sum: 0 };
      e.count += 1;
      e.sum += r.google_review_rating ?? 0;
      map.set(key, e);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, name: memberName(id === "_unknown" ? null : id), ...v }))
      .sort((a, b) => b.count - a.count);
  }, [monthlyRows, team]);

  const byBranch = useMemo(() => {
    const map = new Map<string, { count: number; sum: number }>();
    for (const r of monthlyRows) {
      const key = r.branch_id ?? "_unknown";
      const e = map.get(key) ?? { count: 0, sum: 0 };
      e.count += 1;
      e.sum += r.google_review_rating ?? 0;
      map.set(key, e);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, name: branchName(id === "_unknown" ? null : id), ...v }))
      .sort((a, b) => b.count - a.count);
  }, [monthlyRows, branches]);

  const totalCount = monthlyRows.length;
  const avgRating = totalCount
    ? (monthlyRows.reduce((a, r) => a + (r.google_review_rating ?? 0), 0) / totalCount).toFixed(2)
    : "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-1">
          <label className="text-xs text-muted-foreground">Month</label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-[180px]" />
        </div>
        <div className="flex gap-2 text-sm">
          <Badge variant="secondary">Total: {totalCount}</Badge>
          <Badge variant="outline">Avg rating: {avgRating}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">By counselor / team member</CardTitle></CardHeader>
          <CardContent>
            {byCounselor.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews this month.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Member</TableHead><TableHead className="text-right">Reviews</TableHead><TableHead className="text-right">Avg ★</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {byCounselor.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.name}</TableCell>
                      <TableCell className="text-right font-medium">{r.count}</TableCell>
                      <TableCell className="text-right">{(r.sum / r.count).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">By branch</CardTitle></CardHeader>
          <CardContent>
            {byBranch.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews this month.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Branch</TableHead><TableHead className="text-right">Reviews</TableHead><TableHead className="text-right">Avg ★</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {byBranch.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.name}</TableCell>
                      <TableCell className="text-right font-medium">{r.count}</TableCell>
                      <TableCell className="text-right">{(r.sum / r.count).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border">
        {loading ? (
          <div className="text-sm text-muted-foreground p-6">Loading reviews…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground p-6">No Google reviews yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Counselor</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Received</TableHead>
                <TableHead className="text-right">Links</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="font-medium">{m.title}</div>
                    {m.google_review_text && (
                      <div className="text-xs text-muted-foreground line-clamp-2 max-w-md">{m.google_review_text}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1">
                      <Star className="size-3.5 text-yellow-500" />
                      {m.google_review_rating ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{memberName(m.credited_user_id)}</TableCell>
                  <TableCell className="text-sm">{branchName(m.branch_id)}</TableCell>
                  <TableCell className="text-sm">{m.country_name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{m.review_received_at ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {m.google_review_url && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={m.google_review_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="size-3.5 mr-1" /> Review
                          </a>
                        </Button>
                      )}
                      {m.google_review_screenshot_path && (
                        <Button variant="outline" size="sm" onClick={() => openScreenshot(m.google_review_screenshot_path!)}>
                          <ImageIcon className="size-3.5 mr-1" /> Screenshot
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}