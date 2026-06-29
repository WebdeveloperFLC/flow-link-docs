/**
 * Pluggable notification channel registry — In-App, Email, WhatsApp (future), SMS (future).
 */
import { supabase } from "@/integrations/supabase/client";
import { notifyUsers } from "@/lib/appNotifications";
import type { NotificationChannel, NotificationRule } from "../types/notifications";

export type ChannelDispatchContext = {
  userIds: string[];
  rule: NotificationRule;
  title: string;
  body?: string;
  link?: string;
  dedupeKey?: string;
  eventKey: string;
  context: Record<string, unknown>;
  businessEventId?: string | null;
};

export type ChannelHandler = (ctx: ChannelDispatchContext) => Promise<void>;

const handlers = new Map<NotificationChannel, ChannelHandler>();

export function registerNotificationChannel(channel: NotificationChannel, handler: ChannelHandler): void {
  handlers.set(channel, handler);
}

async function dispatchInApp(ctx: ChannelDispatchContext): Promise<void> {
  await notifyUsers({
    userIds: ctx.userIds,
    category: "payment_received",
    severity: ctx.rule.severity ?? "info",
    title: ctx.title,
    body: ctx.body,
    link: ctx.link,
    entityType: "business_event",
    entityId: ctx.businessEventId ?? null,
    dedupeKey: ctx.dedupeKey ?? `${ctx.eventKey}:${ctx.context.paymentId ?? ""}`,
    metadata: { eventKey: ctx.eventKey, ...ctx.context },
  });
}

async function dispatchEmail(ctx: ChannelDispatchContext): Promise<void> {
  if (!ctx.context.paymentId) return;
  try {
    await supabase.functions.invoke("notifications-dispatch", {
      body: {
        event_type: ctx.eventKey.includes("cash") ? "payment_received" : "payment_received",
        payload: ctx.context,
      },
    });
  } catch (e) {
    console.warn("[platform-notify] email dispatch failed", e);
  }
}

async function dispatchWhatsAppStub(ctx: ChannelDispatchContext): Promise<void> {
  console.info("[platform-notify] whatsapp channel stub", ctx.eventKey, ctx.userIds.length);
}

async function dispatchSmsStub(ctx: ChannelDispatchContext): Promise<void> {
  console.info("[platform-notify] sms channel stub", ctx.eventKey, ctx.userIds.length);
}

/** Register built-in channels (idempotent). */
export function ensureDefaultNotificationChannels(): void {
  if (handlers.size > 0) return;
  registerNotificationChannel("in_app", dispatchInApp);
  registerNotificationChannel("email", dispatchEmail);
  registerNotificationChannel("whatsapp", dispatchWhatsAppStub);
  registerNotificationChannel("sms", dispatchSmsStub);
}

export async function dispatchToChannels(
  channels: NotificationChannel[],
  ctx: ChannelDispatchContext,
): Promise<void> {
  ensureDefaultNotificationChannels();
  for (const channel of channels) {
    const handler = handlers.get(channel);
    if (handler) await handler(ctx);
  }
}
