/**
 * DB-backed platform configuration with code fallback.
 * Reusable across Money In, Vendor Payments, Payroll, etc.
 */
import { supabase } from "@/integrations/supabase/client";
import type { NotificationRule } from "../types/notifications";
import type { SodRule } from "../types/sod";
import type { WorkflowDefinition } from "../types/workflow";
import {
  DEFAULT_NOTIFICATION_RULES,
  DEFAULT_PAYMENT_METHOD_CONFIGS,
  DEFAULT_SOD_RULES,
  DEFAULT_WORKFLOW_DEFINITIONS,
  type PaymentMethodWorkflowConfig,
} from "./defaultWorkflowConfig";

export type PlatformConfigKey =
  | "payment_method_configs"
  | "workflow_definitions"
  | "notification_rules"
  | "sod_rules";

const CONFIG_KEYS: PlatformConfigKey[] = [
  "payment_method_configs",
  "workflow_definitions",
  "notification_rules",
  "sod_rules",
];

let cache: Partial<Record<PlatformConfigKey, unknown>> | null = null;
let hydratedAt: number | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

function fallbackFor<K extends PlatformConfigKey>(key: K): unknown {
  switch (key) {
    case "payment_method_configs":
      return DEFAULT_PAYMENT_METHOD_CONFIGS;
    case "workflow_definitions":
      return DEFAULT_WORKFLOW_DEFINITIONS;
    case "notification_rules":
      return DEFAULT_NOTIFICATION_RULES;
    case "sod_rules":
      return DEFAULT_SOD_RULES;
    default:
      return null;
  }
}

export function getCachedConfig<K extends PlatformConfigKey>(key: K): unknown {
  if (cache?.[key] != null) return cache[key];
  return fallbackFor(key);
}

export function invalidatePlatformConfigCache(): void {
  cache = null;
  hydratedAt = null;
}

/** Load active platform_config rows from DB (no-op when table absent). */
export async function hydratePlatformConfig(force = false): Promise<void> {
  if (!force && cache && hydratedAt && Date.now() - hydratedAt < CACHE_TTL_MS) return;

  const next: Partial<Record<PlatformConfigKey, unknown>> = {};
  try {
    const { data } = await supabase
      .from("platform_config" as never)
      .select("config_key, config_json")
      .eq("active", true as never)
      .in("config_key", CONFIG_KEYS as never);
    for (const row of (data ?? []) as { config_key: string; config_json: unknown }[]) {
      const key = row.config_key as PlatformConfigKey;
      if (CONFIG_KEYS.includes(key)) next[key] = row.config_json;
    }
  } catch {
    /* table pending migration */
  }

  cache = next;
  hydratedAt = Date.now();
}

function resolveConfigArray<T>(key: PlatformConfigKey, fallback: T[]): T[] {
  const cached = cache?.[key];
  if (Array.isArray(cached) && cached.length > 0) return cached as T[];
  return fallback;
}

export function getPaymentMethodConfig(methodCode: string): PaymentMethodWorkflowConfig {
  const configs = resolveConfigArray("payment_method_configs", DEFAULT_PAYMENT_METHOD_CONFIGS);
  const normalized = methodCode.toLowerCase().replace(/-/g, "_");
  return (
    configs.find((c) => c.methodCode === normalized) ??
    configs.find((c) => c.methodCode === "other") ??
    DEFAULT_PAYMENT_METHOD_CONFIGS.find((c) => c.methodCode === "other")!
  );
}

export function getWorkflowDefinition(id: string): WorkflowDefinition | undefined {
  const defs = resolveConfigArray("workflow_definitions", DEFAULT_WORKFLOW_DEFINITIONS);
  return defs.find((d) => d.id === id);
}

export function getNotificationRules(): NotificationRule[] {
  return resolveConfigArray("notification_rules", DEFAULT_NOTIFICATION_RULES);
}

export function getSodRulesFromConfig(): SodRule[] {
  return resolveConfigArray("sod_rules", DEFAULT_SOD_RULES);
}

export function listPaymentMethodOptionsFromConfig(): { value: string; label: string }[] {
  const configs = resolveConfigArray("payment_method_configs", DEFAULT_PAYMENT_METHOD_CONFIGS);
  return configs
    .filter((c) =>
      ["cash", "cheque", "bank_transfer", "wire", "upi", "card", "online_gateway", "etransfer", "other"].includes(
        c.methodCode,
      ),
    )
    .map((c) => ({ value: c.methodCode, label: c.label }));
}
