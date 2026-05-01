import { supabase } from "@/integrations/supabase/client";

export type PersonRole = "applicant" | "co_applicant" | "dependant" | "sponsor" | "co_sponsor";

export interface CasePerson {
  id: string;
  client_id: string;
  role: PersonRole;
  full_name: string;
  relationship: string | null;
  date_of_birth: string | null;
  passport_number: string | null;
  gender: string | null;
  is_archived: boolean;
}

export const ROLE_LABEL: Record<PersonRole, string> = {
  applicant: "Applicant",
  co_applicant: "Co-applicant",
  dependant: "Dependant",
  sponsor: "Sponsor",
  co_sponsor: "Co-sponsor",
};

export const ROLE_SHORT: Record<PersonRole, string> = {
  applicant: "Applicant",
  co_applicant: "CoApplicant",
  dependant: "Dependant",
  sponsor: "Sponsor",
  co_sponsor: "CoSponsor",
};

export async function fetchCasePeople(clientId: string): Promise<CasePerson[]> {
  const { data, error } = await supabase
    .from("case_people")
    .select("*")
    .eq("client_id", clientId)
    .eq("is_archived", false)
    .order("role", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CasePerson[];
}

/** Sort applicant first, then co-applicants, dependants, sponsor, co-sponsor. */
export function sortRoster(roster: CasePerson[]): CasePerson[] {
  const order: Record<PersonRole, number> = {
    applicant: 0, co_applicant: 1, dependant: 2, sponsor: 3, co_sponsor: 4,
  };
  return [...roster].sort((a, b) => order[a.role] - order[b.role] || a.full_name.localeCompare(b.full_name));
}

/** Find applicant in roster (the principal). */
export function applicantOf(roster: CasePerson[]): CasePerson | undefined {
  return roster.find((p) => p.role === "applicant");
}
