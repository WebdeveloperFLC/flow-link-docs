import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { listServicesWithCounts } from "../repositories/kcRepo";

export default function ServicesIndexPage() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listServicesWithCounts>>>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    listServicesWithCounts().then(setRows).finally(() => setLoading(false));
  }, []);

  const filtered = rows.filter((r) => !q || r.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <AppLayout>
      <PageHeader title="Services" description="Service-scoped knowledge hubs linked to the service library." />
      <div className="p-8 space-y-4">
        <Input placeholder="Filter services…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
        {loading ? (
          <Loader2 className="size-6 animate-spin" />
        ) : (
          <div className="grid gap-2">
            {filtered.map((s) => (
              <Link key={s.id} to={`/knowledge-centre/services/${s.id}`}>
                <Card className="p-4 hover:bg-muted/50 flex justify-between">
                  <span>{s.label}</span>
                  <span className="text-xs text-muted-foreground">{s.articleCount} topic(s)</span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
