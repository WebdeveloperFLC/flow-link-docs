/** Internal sub-status options keyed by pipeline stage key (staff-only). */

export const STAGE_SUBSTATUSES: Record<string, string[]> = {
  enrolled: ["Awaiting agreement", "Agreement signed", "On hold"],
  payment_pending: ["Invoice sent", "Partial payment", "Follow-up scheduled"],
  payment_received: ["Receipt issued", "Ready for docs"],
  docs_collection: ["Checklist sent", "Partial docs received", "Chasing client"],
  docs_complete: ["QA pending", "QA passed", "Ready for LOA"],
  offer_letter: ["University applied", "Conditional offer", "Unconditional LOA"],
  tuition_paid: ["Deposit receipt pending", "GIC initiated", "Funds verified"],
  visa_preparation: ["Forms in progress", "SOP review", "QA review"],
  visa_lodged: ["Awaiting BIL", "Biometrics booked", "Medical pending", "IRCC processing"],
  biometrics_medical: ["Biometrics done", "Medical done", "Awaiting results"],
  visa_approved: ["Passport request sent", "Travel briefing done"],
  visa_refused: ["Reviewing refusal", "Resubmission planned", "Alt country planned", "Case closed"],
  application_submitted: ["Awaiting BIL", "IRCC processing"],
  decision_received: ["Approved", "Refused", "Further action"],
  job_offer_lmia: ["LMIA in progress", "Job offer received", "Employer docs pending"],
  relationship_verified: ["Sponsor docs verified", "Relationship proof complete", "Awaiting lodgement"],
  profile_eoi: ["CRS calculated", "EOI in pool", "Awaiting ITA"],
  invitation_ita: ["ITA received", "PNP nomination", "Deadline tracking"],
};

export function subStatusesForStageKey(stageKey: string | null | undefined): string[] {
  if (!stageKey) return [];
  return STAGE_SUBSTATUSES[stageKey] ?? ["In progress", "On hold", "Escalated"];
}
