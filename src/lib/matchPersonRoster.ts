import { matchPersonName, type NameMatchResult } from "@/lib/classifyDocument";
import type { CasePerson } from "@/lib/casePeople";

export interface RosterMatch {
  best?: CasePerson;
  score: number;
  ambiguous: boolean;       // top-2 within 0.1
  noNameDetected: boolean;
  results: { person: CasePerson; result: NameMatchResult }[];
}

/**
 * Match a detected document-owner name against a roster of people on a case.
 * Returns the best candidate, score, and whether the match is ambiguous.
 */
export function matchPersonRoster(detected: string | null | undefined, roster: CasePerson[]): RosterMatch {
  const noNameDetected = !detected || !detected.trim();
  const results = roster.map((person) => ({
    person,
    result: matchPersonName(detected, person.full_name),
  }));
  results.sort((a, b) => b.result.score - a.result.score);

  if (noNameDetected || roster.length === 0) {
    return { best: undefined, score: 0, ambiguous: false, noNameDetected, results };
  }

  const top = results[0];
  const second = results[1];
  const ambiguous = !!second && top.result.score - second.result.score < 0.1 && second.result.score >= 0.5;

  // Only consider it a "best" match when score is decent
  const best = top.result.score >= 0.6 ? top.person : undefined;

  return { best, score: top.result.score, ambiguous, noNameDetected, results };
}
