import { fetchEligibilityQuestions, prefillEligibilityFromClient } from "@/lib/service-eligibility/questions";
import { createStaffAssessmentSession } from "@/lib/service-eligibility/sessions";
import { assessmentRunPath } from "@/lib/service-eligibility/settleAbroadBridge";

export type StartClientAssessmentResult = {
  sessionId: string;
  path: string;
};

export async function startClientEligibilityAssessment(args: {
  libraryId: string;
  clientId: string;
}): Promise<StartClientAssessmentResult> {
  const qs = await fetchEligibilityQuestions(args.libraryId);
  const prefillAnswers = await prefillEligibilityFromClient(args.clientId, qs);
  const result = await createStaffAssessmentSession({
    libraryId: args.libraryId,
    clientId: args.clientId,
    prefillAnswers,
  });
  const path =
    result.runner === "settle_abroad"
      ? assessmentRunPath(result.sessionId, args.libraryId)
      : `/eligibility/run/${result.sessionId}`;
  return { sessionId: result.sessionId, path };
}
