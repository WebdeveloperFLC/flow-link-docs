import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { RichBlock } from "../../types/aiChat";

export default function ChatRichBlock({ block }: { block: RichBlock }) {
  if (block.kind === "table") {
    return (
      <Card className="overflow-hidden">
        {block.payload.caption && (
          <div className="px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b">
            {block.payload.caption}
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              {block.payload.columns.map((c) => (
                <TableHead key={c} className="h-9 text-xs">{c}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {block.payload.rows.map((row, ri) => (
              <TableRow key={ri}>
                {row.map((cell, ci) => (
                  <TableCell key={ci} className={cn("py-2 text-sm", typeof cell === "number" && "tabular-nums text-right")}>
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  }

  if (block.kind === "chart") {
    return (
      <Card className="p-4">
        {block.payload.title && <div className="text-xs font-semibold mb-2">{block.payload.title}</div>}
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={block.payload.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="x" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              />
              <Line type="monotone" dataKey="y" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  }

  if (block.kind === "metric") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {block.payload.items.map((m, i) => (
          <Card key={i} className="p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{m.label}</div>
            <div className="text-lg font-bold mt-1 tabular-nums">{m.value}</div>
            {m.delta && (
              <div className={cn(
                "text-[10px] mt-0.5",
                m.tone === "up" && "text-green-600 dark:text-green-400",
                m.tone === "down" && "text-red-500 dark:text-red-400",
                (!m.tone || m.tone === "neutral") && "text-muted-foreground",
              )}>{m.delta}</div>
            )}
          </Card>
        ))}
      </div>
    );
  }

  if (block.kind === "reportLink") {
    return (
      <Link to={block.payload.href} className="block">
        <Card className="p-3 hover:bg-accent transition-colors flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">{block.payload.label}</div>
            {block.payload.description && (
              <div className="text-xs text-muted-foreground mt-0.5 truncate">{block.payload.description}</div>
            )}
          </div>
          <ArrowRight className="size-4 text-muted-foreground flex-shrink-0" />
        </Card>
      </Link>
    );
  }

  return null;
}