/**
 * Client 360 section registry — scaffolding for Phase C shell.
 * Aggregates existing CRM modules without renaming or moving them.
 */

export type Client360SectionId =
  | "profile"
  | "services"
  | "documents"
  | "forms"
  | "payments"
  | "comms"
  | "tasks"
  | "team"
  | "activity";

export type Client360SectionPhase = 1 | 2;

export interface Client360SectionDefinition {
  id: Client360SectionId;
  /** Matches ClientDetail tab label where applicable */
  label: string;
  phase: Client360SectionPhase;
  /** CRM tab id for deep-link (Phase C) */
  detailTabId?: string;
  /** Read-only in Client 360 */
  readOnly: true;
}

/** Phase 1 sections — profile block uses summarizeProfileFor360(vm). */
export const CLIENT_360_SECTIONS: readonly Client360SectionDefinition[] = [
  { id: "profile", label: "Profile", phase: 1, detailTabId: "profile", readOnly: true },
  { id: "services", label: "Client Services", phase: 1, detailTabId: "client-services", readOnly: true },
  { id: "documents", label: "Documents", phase: 1, detailTabId: "documents", readOnly: true },
  { id: "forms", label: "Forms & Letters", phase: 1, detailTabId: "forms", readOnly: true },
  { id: "payments", label: "Payments", phase: 1, detailTabId: "commercial", readOnly: true },
  { id: "comms", label: "Comms", phase: 1, detailTabId: "communications", readOnly: true },
  { id: "tasks", label: "Tasks", phase: 1, detailTabId: "tasks", readOnly: true },
  { id: "team", label: "Team & Access", phase: 1, detailTabId: "team", readOnly: true },
  { id: "activity", label: "Activity Log", phase: 1, detailTabId: "activity-log", readOnly: true },
] as const;

export function getClient360Sections(phase?: Client360SectionPhase): Client360SectionDefinition[] {
  if (!phase) return [...CLIENT_360_SECTIONS];
  return CLIENT_360_SECTIONS.filter((s) => s.phase === phase);
}

export function getClient360Section(id: Client360SectionId): Client360SectionDefinition | undefined {
  return CLIENT_360_SECTIONS.find((s) => s.id === id);
}
