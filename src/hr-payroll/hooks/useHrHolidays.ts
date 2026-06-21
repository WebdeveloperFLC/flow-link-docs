import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HR_ORG_ID } from "../lib/constants";
import type { HolidayRow } from "../lib/types";

export function useHrHolidays() {
  return useQuery({
    queryKey: ["hr-holidays", HR_ORG_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holidays" as never)
        .select("*, branches(name, country)")
        .eq("org_id", HR_ORG_ID)
        .order("holiday_date");
      if (error) throw error;
      return (data ?? []) as HolidayRow[];
    },
  });
}
