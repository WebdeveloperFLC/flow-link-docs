/**
 * Generic notification router — configuration-driven recipients and channels.
 */
import { getNotificationRules } from "../config/platformConfigService";
import type { NotificationDispatchInput, NotificationRecipientSpec, NotificationRule } from "../types/notifications";
import { resolveApproverUserIds } from "../ewe/approvalEngine";
import { dispatchToChannels } from "./notificationChannelRegistry";

function getRules(custom?: NotificationRule[]): NotificationRule[] {
  return custom ?? getNotificationRules();
}

function interpolate(template: string, ctx: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(ctx[key] ?? ""));
}

async function resolveRecipients(
  spec: NotificationRecipientSpec,
  ctx: Record<string, unknown>,
): Promise<string[]> {
  switch (spec.kind) {
    case "role": {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.from("user_roles").select("user_id").eq("role", spec.role as never);
      return ((data ?? []) as { user_id: string }[]).map((r) => r.user_id);
    }
    case "permission_group":
      return resolveApproverUserIds(
        { kind: "permission_group", group: spec.group },
        { branchId: ctx.branchId as string, entityId: ctx.entityId as string },
      );
    case "department":
      return resolveApproverUserIds({ kind: "department", department: spec.department });
    case "accounting_active_users":
      return resolveApproverUserIds({ kind: "permission_group", group: "payment_verifier" });
    case "branch_managers":
      return resolveApproverUserIds(
        { kind: "permission_group", group: "branch_manager" },
        { branchId: spec.branchId ?? (ctx.branchId as string) },
      );
    case "workflow_approvers":
      return resolveApproverUserIds({ kind: "permission_group", group: "payment_verifier" });
    case "any_of": {
      const batches = await Promise.all(spec.specs.map((s) => resolveRecipients(s, ctx)));
      return Array.from(new Set(batches.flat()));
    }
    default:
      return [];
  }
}

export async function dispatchPlatformNotification(
  input: NotificationDispatchInput,
  rules?: NotificationRule[],
): Promise<void> {
  const rule = getRules(rules).find((r) => r.eventKey === input.eventKey);
  if (!rule) {
    console.info("[platform-notify] no rule for", input.eventKey);
    return;
  }

  const ctx = { ...input.context, businessEventId: input.businessEventId };
  const recipientSpec =
    rule.recipients.length === 1
      ? rule.recipients[0]!
      : { kind: "any_of" as const, specs: rule.recipients };
  const userIds = await resolveRecipients(recipientSpec, ctx);

  const title = interpolate(rule.titleTemplate, ctx);
  const body = rule.bodyTemplate ? interpolate(rule.bodyTemplate, ctx) : undefined;
  const link = rule.linkTemplate ? interpolate(rule.linkTemplate, ctx) : undefined;

  await dispatchToChannels(rule.channels, {
    userIds,
    rule,
    title,
    body,
    link,
    dedupeKey: input.dedupeKey ?? `${input.eventKey}:${input.context.paymentId ?? ""}`,
    eventKey: input.eventKey,
    context: ctx,
    businessEventId: input.businessEventId,
  });
}
