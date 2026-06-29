/**
 * Business Event service — minimal FOE correlation foundation.
 * Persists to foe_business_events when migration applied; local fallback otherwise.
 */
import { supabase } from "@/integrations/supabase/client";
import type { BusinessEvent, BusinessEventDomain } from "../types/businessEvent";

const LS_KEY = "platform:business_events:v1";

function readLocalEvents(): BusinessEvent[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(LS_KEY) ?? "[]") as BusinessEvent[];
  } catch {
    return [];
  }
}

function writeLocalEvents(events: BusinessEvent[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(events.slice(0, 500)));
  } catch {
    /* ignore */
  }
}

export function newBusinessEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function createBusinessEvent(input: {
  domain: BusinessEventDomain;
  eventType: string;
  sourceModule: string;
  sourceRecordId: string;
  entityId?: string | null;
  branchId?: string | null;
  createdBy?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<BusinessEvent> {
  const event: BusinessEvent = {
    id: newBusinessEventId(),
    domain: input.domain,
    eventType: input.eventType,
    entityId: input.entityId ?? null,
    branchId: input.branchId ?? null,
    sourceModule: input.sourceModule,
    sourceRecordId: input.sourceRecordId,
    createdBy: input.createdBy ?? null,
    createdAt: new Date().toISOString(),
    metadata: input.metadata ?? {},
  };

  try {
    const { data, error } = await supabase
      .from("foe_business_events" as never)
      .insert({
        id: event.id,
        domain: event.domain,
        event_type: event.eventType,
        entity_id: event.entityId,
        branch_id: event.branchId,
        source_module: event.sourceModule,
        source_record_id: event.sourceRecordId,
        created_by: event.createdBy,
        metadata: event.metadata,
      } as never)
      .select("id")
      .maybeSingle();
    if (!error && data) return event;
  } catch {
    /* table may not exist yet */
  }

  const local = readLocalEvents();
  local.unshift(event);
  writeLocalEvents(local);
  return event;
}

export async function getBusinessEventBySource(
  sourceModule: string,
  sourceRecordId: string,
): Promise<BusinessEvent | null> {
  try {
    const { data } = await supabase
      .from("foe_business_events" as never)
      .select("*")
      .eq("source_module", sourceModule)
      .eq("source_record_id", sourceRecordId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return mapDbEvent(data as Record<string, unknown>);
  } catch {
    /* fallback */
  }
  return readLocalEvents().find((e) => e.sourceModule === sourceModule && e.sourceRecordId === sourceRecordId) ?? null;
}

function mapDbEvent(row: Record<string, unknown>): BusinessEvent {
  return {
    id: String(row.id),
    domain: row.domain as BusinessEventDomain,
    eventType: String(row.event_type ?? row.eventType),
    entityId: (row.entity_id as string) ?? null,
    branchId: (row.branch_id as string) ?? null,
    sourceModule: String(row.source_module),
    sourceRecordId: String(row.source_record_id),
    createdBy: (row.created_by as string) ?? null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

import type { WorkflowInstance, WorkflowStepState } from "../types/workflow";

const WF_LS = "platform:workflow_instances:v1";

export async function persistWorkflowInstance(
  instance: WorkflowInstance,
  stepStates: WorkflowStepState[],
): Promise<void> {
  try {
    await supabase.from("platform_workflow_instances" as never).insert({
      id: instance.id,
      definition_id: instance.definitionId,
      business_event_id: instance.businessEventId,
      domain: instance.domain,
      status: instance.status,
      current_step_index: instance.currentStepIndex,
      context: instance.context,
      step_states: stepStates,
    } as never);
    return;
  } catch {
    /* fallback */
  }
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.parse(window.localStorage.getItem(WF_LS) ?? "[]") as unknown[];
    raw.unshift({ instance, stepStates });
    window.localStorage.setItem(WF_LS, JSON.stringify(raw.slice(0, 200)));
  } catch {
    /* ignore */
  }
}

export async function linkBusinessEventRecord(input: {
  businessEventId: string;
  linkType: string;
  recordId: string;
}): Promise<void> {
  try {
    await supabase.from("foe_business_event_links" as never).insert({
      business_event_id: input.businessEventId,
      link_type: input.linkType,
      record_id: input.recordId,
    } as never);
  } catch {
    /* optional table */
  }
}
