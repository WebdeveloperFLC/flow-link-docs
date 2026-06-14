export type AutoApplyEntityType = "service" | "country" | "institution" | "program" | "intake";
export type AutoApplyPolicy = "auto_include" | "require_opt_in" | "inherit_parent";

export interface AutoApplyEntityConfig {
  entityType: AutoApplyEntityType;
  title: string;
  hint: string;
  allowedPolicies: AutoApplyPolicy[];
}

export interface AutoApplyPolicyRow {
  entityType: AutoApplyEntityType;
  policy: AutoApplyPolicy;
  title: string;
  hint: string;
  policyLabel: string;
}

export interface CrmEntityCard {
  key: string;
  label: string;
  count: number;
}

export interface CrmHealthCheck {
  key: string;
  label: string;
  status: "ok" | "warn" | "error";
  detail?: string;
}

export const AUTOAPPLY_ENTITIES: AutoApplyEntityConfig[] = [
  {
    entityType: "country",
    title: "New countries",
    hint: "Auto-include in active wallets",
    allowedPolicies: ["auto_include", "require_opt_in"],
  },
  {
    entityType: "service",
    title: "New services",
    hint: "Require explicit opt-in",
    allowedPolicies: ["auto_include", "require_opt_in"],
  },
  {
    entityType: "institution",
    title: "New institutions",
    hint: "Auto-include in commissions",
    allowedPolicies: ["auto_include", "require_opt_in"],
  },
  {
    entityType: "program",
    title: "New programs",
    hint: "Inherit parent service rules",
    allowedPolicies: ["inherit_parent", "auto_include", "require_opt_in"],
  },
  {
    entityType: "intake",
    title: "New intakes",
    hint: "Auto-include in offers",
    allowedPolicies: ["auto_include", "require_opt_in"],
  },
];

export const POLICY_LABELS: Record<AutoApplyPolicy, string> = {
  auto_include: "Auto-include",
  require_opt_in: "Require opt-in",
  inherit_parent: "Inherit parent rules",
};

export function mergeAutoApplyRows(
  dbRows: { entity_type: string; policy: string }[],
): AutoApplyPolicyRow[] {
  const map = new Map(dbRows.map((r) => [r.entity_type, r.policy as AutoApplyPolicy]));
  return AUTOAPPLY_ENTITIES.map((cfg) => {
    const policy = map.get(cfg.entityType) ?? cfg.allowedPolicies[0];
    return {
      entityType: cfg.entityType,
      policy,
      title: cfg.title,
      hint: cfg.hint,
      policyLabel: POLICY_LABELS[policy] ?? policy,
    };
  });
}

export function parseCrmHealth(raw: unknown): {
  entities: CrmEntityCard[];
  checks: CrmHealthCheck[];
  syncStatus: string;
} {
  const j = (raw ?? {}) as {
    sync_status?: string;
    entities?: { key: string; label: string; count: number }[];
    checks?: { key: string; label: string; status: string; detail?: string }[];
  };
  return {
    syncStatus: j.sync_status ?? "unknown",
    entities: (j.entities ?? []).map((e) => ({
      key: e.key,
      label: e.label,
      count: Number(e.count ?? 0),
    })),
    checks: (j.checks ?? []).map((c) => ({
      key: c.key,
      label: c.label,
      status: (c.status === "warn" || c.status === "error" ? c.status : "ok") as CrmHealthCheck["status"],
      detail: c.detail,
    })),
  };
}
