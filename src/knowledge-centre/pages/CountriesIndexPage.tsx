import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { listCountriesWithCounts } from "@/knowledge-centre/repositories/kcRepo";

export default function CountriesIndexPage() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listCountriesWithCounts>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCountriesWithCounts().then(setRows).finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <PageHeader title="Countries" description="Country-scoped counselling knowledge hubs." />
      <div className="p-8">
        {loading ? (
          <Loader2 className="size-6 animate-spin" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((c) => (
              <Link key={c.code} to={`/knowledge-centre/countries/${c.code}`}>
                <Card className="p-4 hover:bg-muted/50">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.articleCount} topic(s)</div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
