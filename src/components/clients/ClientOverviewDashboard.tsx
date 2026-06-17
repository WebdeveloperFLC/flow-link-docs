import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, Receipt, UserCircle, ExternalLink, Loader2 } from "lucide-react";
import { countryFlagEmoji } from "@/lib/service-library/countryBadges";
import { listClientPrograms } from "@/lib/clientPrograms";
import type { ActiveServiceContext } from "@/lib/clientActiveServiceContext";

type ClientSnapshot = {
  id: string;
  full_name: string;
  date_of_birth?: string | null;
  phone?: string | null;
  email?: string | null;
  passport_number?: string | null;
  budget?: number | null;
  intake?: string | null;
  english_overall?: string | null;
  english_test?: string | null;
  assigned_counselor_id?: string | null;
  owner_id?: string | null;
  country?: string;
  application_type?: string;
};

type Props = {
  client: ClientSnapshot;
  serviceCtx: ActiveServiceContext;
  onOpenTab?: (tab: string) => void;
};

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="space-y-1">
    <div className="flc-field-label">{label}</div>
    <div className="flc-field-value">{value ?? <span className="text-muted-foreground font-normal">—</span>}</div>
  </div>
);

function fmtMoney(amount: number, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function ClientOverviewDashboard({ client, serviceCtx, onOpenTab }: Props) {
  const [loading, setLoading] = useState(true);
  const [counselorName, setCounselorName] = useState<string | null>(null);
  const [programLabel, setProgramLabel] = useState<string>("Pending selection");
  const [totalFee, setTotalFee] = useState<number | null>(null);
  const [collected, setCollected] = useState(0);
  const [currency, setCurrency] = useState("INR");

  const destination = serviceCtx.destinationCountry ?? client.country ?? "";
  const serviceLabel = serviceCtx.serviceLabel ?? client.application_type ?? "—";
  const english = client.english_overall
    ? client.english_overall
    : client.english_test
      ? client.english_test
      : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const tasks: Promise<void>[] = [];

        if (client.assigned_counselor_id || client.owner_id) {
          const uid = client.assigned_counselor_id ?? client.owner_id!;
          tasks.push(
            supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", uid)
              .maybeSingle()
              .then(({ data }) => {
                if (!cancelled && data) {
                  setCounselorName(data.full_name ?? data.email ?? null);
                }
              }),
          );
        } else {
          setCounselorName(null);
        }

        tasks.push(
          listClientPrograms(client.id).then((programs) => {
            if (cancelled) return;
            const primary = programs.find((p) => p.is_primary && p.status === "final");
            const finalP = programs.find((p) => p.status === "final");
            const shortlisted = programs.find((p) => p.status === "shortlisted");
            const pick = primary ?? finalP ?? shortlisted;
            if (pick) {
              setProgramLabel(`${pick.course.name} · ${pick.course.university.name}`);
            } else if (programs.length > 0) {
              setProgramLabel(`${programs.length} shortlisted — pick a primary`);
            } else {
              setProgramLabel("Pending selection");
            }
          }),
        );

        tasks.push(
          supabase
            .from("client_invoices")
            .select("amount, amount_paid, currency")
            .eq("client_id", client.id)
            .is("archived_at", null)
            .then(({ data }) => {
              if (cancelled) return;
              const rows = data ?? [];
              if (!rows.length) {
                setTotalFee(null);
                setCollected(0);
                return;
              }
              const cur = (rows[0]?.currency as string) || "INR";
              setCurrency(cur);
              setTotalFee(rows.reduce((s, r) => s + Number(r.amount || 0), 0));
              setCollected(rows.reduce((s, r) => s + Number(r.amount_paid || 0), 0));
            }),
        );

        await Promise.all(tasks);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client.id, client.assigned_counselor_id, client.owner_id]);

  const paymentPct = useMemo(() => {
    if (!totalFee || totalFee <= 0) return 0;
    return Math.min(100, Math.round((collected / totalFee) * 100));
  }, [totalFee, collected]);

  if (loading) {
    return (
      <div className="flc-premium-card p-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading overview…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flc-premium-card">
        <div className="flc-section-head">
          <UserCircle className="size-4 text-primary" />
          <span className="flc-section-head-title">Applicant profile</span>
          {onOpenTab && (
            <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => onOpenTab("profile")}>
              Edit profile <ExternalLink className="size-3 ml-1" />
            </Button>
          )}
        </div>
        <div className="p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
          <Field label="Full name" value={client.full_name} />
          <Field label="Date of birth" value={client.date_of_birth} />
          <Field label="Phone" value={client.phone} />
          <Field label="Email" value={client.email} />
          <Field label="Passport no." value={client.passport_number} />
          <Field
            label="Destination"
            value={
              destination ? (
                <span className="inline-flex items-center gap-1.5">
                  {countryFlagEmoji(destination) && <span>{countryFlagEmoji(destination)}</span>}
                  {destination}
                </span>
              ) : null
            }
          />
          <Field label="IELTS / English" value={english} />
          <Field label="Intended intake" value={client.intake} />
          <Field label="Budget" value={client.budget != null ? fmtMoney(client.budget, currency) : null} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="flc-premium-card">
          <div className="flc-section-head">
            <GraduationCap className="size-4 text-primary" />
            <span className="flc-section-head-title">Service & programme</span>
          </div>
          <div className="p-5 space-y-4">
            <Field label="Service" value={serviceLabel} />
            <Field label="Selected programme" value={programLabel} />
            <Field label="Primary user" value={counselorName ?? "Unassigned"} />
            {onOpenTab && (
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenTab("profile")}>
                  Programmes
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                  <Link to={`/course-finder?clientId=${client.id}`}>Course finder</Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flc-premium-card">
          <div className="flc-section-head">
            <Receipt className="size-4 text-primary" />
            <span className="flc-section-head-title">Financial</span>
          </div>
          <div className="p-5 space-y-4">
            <Field label="Total fee" value={totalFee != null ? fmtMoney(totalFee, currency) : null} />
            <Field
              label="Collected"
              value={
                <span className="text-emerald-600 dark:text-emerald-400">{fmtMoney(collected, currency)}</span>
              }
            />
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                <span>Collection progress</span>
                <span>{paymentPct}%</span>
              </div>
              <Progress value={paymentPct} className="h-2" />
            </div>
            {onOpenTab && (
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenTab("commercial")}>
                Open payments
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
