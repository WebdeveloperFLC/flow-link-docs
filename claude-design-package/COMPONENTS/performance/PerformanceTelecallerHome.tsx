import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PerformanceHubHeader } from "@/components/performance/PerformanceHubHeader";
import { PerformanceMetricCard } from "@/components/performance/PerformanceMetricCard";
import { usePerformanceTelecallerHome } from "@/hooks/usePerformanceTelecallerHome";
import { formatInr } from "@/lib/performanceHubTheme";
import { Headphones } from "lucide-react";

interface PerformanceTelecallerHomeProps {
  userId: string;
  profileName?: string;
  branchName?: string | null;
}

export function PerformanceTelecallerHome({
  userId,
  profileName,
  branchName,
}: PerformanceTelecallerHomeProps) {
  const data = usePerformanceTelecallerHome(userId);
  const targetPct = data.target > 0 ? Math.min(100, (data.conversions / data.target) * 100) : 0;

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <PerformanceHubHeader
        title="My performance"
        subtitle={`Telecaller conversions · count-based plan · ${data.period}`}
        profileName={profileName}
        branchName={branchName}
        period={data.period}
        showModuleLegend={false}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PerformanceMetricCard
          module="cash"
          label="Conversions"
          value={data.loading ? "…" : String(data.conversions)}
          detail={
            data.target > 0
              ? `of ${data.target} target (${Math.round(targetPct)}%)`
              : "No conversion target set — contact admin"
          }
        />
        <PerformanceMetricCard
          module="cash"
          label={data.hasLockedRun ? "Cash incentive (locked)" : "Cash incentive (projected)"}
          value={data.loading ? "…" : formatInr(data.hasLockedRun ? data.lockedCash : data.projectedCash)}
          detail={
            data.perConversion > 0
              ? `${formatInr(data.perConversion)} per conversion · lead_converted events`
              : undefined
          }
        />
        <PerformanceMetricCard
          module="offers"
          label="Conversion rate"
          value={data.loading ? "…" : `${data.conversionRate}%`}
          detail={
            data.assignedLeads > 0
              ? `${data.conversions} conversions from ${data.assignedLeads} assigned leads`
              : "No assigned leads this period yet"
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Recent lead_converted events</h2>
          {data.recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Conversions appear here when leads you attributed convert to clients.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.recentEvents.map((ev, i) => (
                <li
                  key={`${ev.client_id ?? i}-${ev.event_date}`}
                  className="flex flex-wrap items-center gap-2 text-sm py-2 border-b last:border-0"
                >
                  <span className="text-muted-foreground w-20 shrink-0">
                    {new Date(ev.event_date).toLocaleDateString()}
                  </span>
                  <span className="flex-1 min-w-0 truncate">
                    {ev.client_name ?? "Client"}
                    {ev.client_id && (
                      <Link to={`/clients/${ev.client_id}`} className="text-primary hover:underline ml-1">
                        →
                      </Link>
                    )}
                  </span>
                  <Badge variant="outline" className="shrink-0 capitalize">
                    {ev.status_label}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Attributed via converted_by on client record · emits qualifying events for telecaller plans.
          </p>
        </Card>

        <Card className="p-5 bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <Headphones className="size-5 text-primary" />
            <h2 className="font-semibold">No discount wallet</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Telecaller incentives are count-based — conversions, demo bookings and qualified handovers. Discount
            wallets apply to counselors on the Give discount screen.
          </p>
          <Link to="/telecaller" className="text-sm text-primary hover:underline mt-4 inline-block">
            Open telecaller queue →
          </Link>
        </Card>
      </div>
    </div>
  );
}
