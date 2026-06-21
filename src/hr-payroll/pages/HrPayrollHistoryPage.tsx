import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HR_ORG_ID } from "../lib/constants";
import { StatusBadge } from "../components/ui/StatusBadge";

export default function HrPayrollHistoryPage() {
  const { data: cycles = [], isLoading } = useQuery({
    queryKey: ["hr-payroll-history", HR_ORG_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_cycles" as never)
        .select("*")
        .eq("org_id", HR_ORG_ID)
        .order("start_date", { ascending: false })
        .limit(24);
      if (error) throw error;
      return data as {
        id: string;
        label: string;
        start_date: string;
        end_date: string;
        status: string;
        payroll_days: number;
      }[];
    },
  });

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card" style={{ background: "var(--wash)", borderColor: "var(--line)" }}>
        <div style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>
          Historical payroll cycles — Open → Process → Approve → Lock → Mark Paid. Select a cycle to
          view verification and register.
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <h3>Payroll History</h3>
        </div>
        {isLoading ? (
          <div className="empty">Loading cycles…</div>
        ) : cycles.length === 0 ? (
          <div className="empty">No payroll cycles recorded.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Cycle</th>
                <th>Period</th>
                <th>Days</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {cycles.map((c) => (
                <tr key={c.id}>
                  <td className="strong">{c.label}</td>
                  <td className="muted mono" style={{ fontSize: 12 }}>
                    {c.start_date} → {c.end_date}
                  </td>
                  <td>{c.payroll_days}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td>
                    <Link to={`/hr/payroll/verify/${c.id}`} className="btn btn-sm">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
