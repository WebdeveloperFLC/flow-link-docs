import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HR_ORG_ID } from "../lib/constants";

export function useHrDashboardStats() {
  const today = new Date().toISOString().slice(0, 10);

  return useQuery({
    queryKey: ["hr-dashboard-stats", HR_ORG_ID, today],
    queryFn: async () => {
      const [
        empRes,
        attRes,
        leaveRes,
        lateRes,
        mispunchRes,
        birthdaysRes,
        anniversariesRes,
      ] = await Promise.all([
        supabase
          .from("employees" as never)
          .select("id", { count: "exact", head: true })
          .eq("org_id", HR_ORG_ID)
          .in("status", ["On Probation", "Confirmed", "On Notice"]),
        supabase
          .from("attendance" as never)
          .select("status")
          .eq("org_id", HR_ORG_ID)
          .eq("work_date", today),
        supabase
          .from("leave_requests" as never)
          .select("id", { count: "exact", head: true })
          .eq("org_id", HR_ORG_ID)
          .eq("status", "Approved")
          .lte("from_date", today)
          .gte("to_date", today),
        supabase
          .from("late_exemptions" as never)
          .select("id", { count: "exact", head: true })
          .eq("org_id", HR_ORG_ID)
          .eq("work_date", today),
        supabase
          .from("mispunch_requests" as never)
          .select("id", { count: "exact", head: true })
          .eq("org_id", HR_ORG_ID)
          .eq("work_date", today)
          .eq("status", "Pending"),
        supabase
          .from("employees" as never)
          .select("full_name, date_of_birth")
          .eq("org_id", HR_ORG_ID)
          .not("date_of_birth", "is", null),
        supabase
          .from("employees" as never)
          .select("full_name, date_of_joining")
          .eq("org_id", HR_ORG_ID)
          .not("date_of_joining", "is", null),
      ]);

      const attendance = (attRes.data ?? []) as { status: string }[];
      const present = attendance.filter((a) =>
        ["Present", "Half Day", "Late"].includes(a.status),
      ).length;
      const absent = attendance.filter((a) => a.status === "Absent").length;
      const onLeave = attendance.filter((a) => a.status === "Leave").length;

      const month = today.slice(5, 7);
      const day = today.slice(8, 10);

      const upcomingBirthdays = ((birthdaysRes.data ?? []) as { full_name: string; date_of_birth: string }[])
        .filter((e) => e.date_of_birth?.slice(5, 10) >= `${month}-${day}`)
        .slice(0, 5);

      const upcomingAnniversaries = (
        (anniversariesRes.data ?? []) as { full_name: string; date_of_joining: string }[]
      )
        .filter((e) => e.date_of_joining?.slice(5, 10) >= `${month}-${day}`)
        .slice(0, 5);

      return {
        totalEmployees: empRes.count ?? 0,
        presentToday: present,
        absentToday: absent,
        onLeaveToday: onLeave || (leaveRes.count ?? 0),
        lateToday: lateRes.count ?? 0,
        mispunchToday: mispunchRes.count ?? 0,
        upcomingBirthdays,
        upcomingAnniversaries,
      };
    },
    retry: false,
  });
}
