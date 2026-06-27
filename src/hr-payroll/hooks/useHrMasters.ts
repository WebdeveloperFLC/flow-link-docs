import { useQuery } from "@tanstack/react-query";
import { fetchHrMasters } from "./wpmsApi";

export function useHrMasters(domain: string, includeInactive = true) {
  return useQuery({
    queryKey: ["hr-masters", domain, includeInactive],
    queryFn: () => fetchHrMasters(domain, includeInactive),
  });
}
