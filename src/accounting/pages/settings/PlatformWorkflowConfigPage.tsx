import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import AccountingPageHeader from "../../components/shared/AccountingPageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Settings2 } from "lucide-react";
import {
  hydratePlatformConfig,
  invalidatePlatformConfigCache,
  getCachedConfig,
  type PlatformConfigKey,
} from "@/platform/config/platformConfigService";
import {
  DEFAULT_PAYMENT_METHOD_CONFIGS,
  DEFAULT_WORKFLOW_DEFINITIONS,
  DEFAULT_NOTIFICATION_RULES,
  DEFAULT_SOD_RULES,
} from "@/platform/config/defaultWorkflowConfig";

const CONFIG_SECTIONS: { key: PlatformConfigKey; label: string; description: string }[] = [
  {
    key: "payment_method_configs",
    label: "Payment method workflows",
    description: "Per-method verification, receipt, and journal rules for Money Coming In.",
  },
  {
    key: "workflow_definitions",
    label: "Workflow definitions",
    description: "Sequential / parallel approval steps — reusable across domains.",
  },
  {
    key: "notification_rules",
    label: "Notification rules",
    description: "Event keys, channels (in-app, email, WhatsApp, SMS), and recipient groups.",
  },
  {
    key: "sod_rules",
    label: "Separation of duties",
    description: "Generic SoD rules for payments, payroll, banking, and future workflows.",
  },
];

function effectiveConfig(key: PlatformConfigKey): unknown {
  const cached = getCachedConfig(key);
  const isEmptyArray = Array.isArray(cached) && cached.length === 0;
  if (isEmptyArray) {
    switch (key) {
      case "payment_method_configs":
        return DEFAULT_PAYMENT_METHOD_CONFIGS;
      case "workflow_definitions":
        return DEFAULT_WORKFLOW_DEFINITIONS;
      case "notification_rules":
        return DEFAULT_NOTIFICATION_RULES;
      case "sod_rules":
        return DEFAULT_SOD_RULES;
    }
  }
  return cached;
}

export default function PlatformWorkflowConfigPage() {
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"code" | "database">("code");

  const load = async () => {
    setLoading(true);
    invalidatePlatformConfigCache();
    await hydratePlatformConfig(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("platform_config" as never)
        .select("config_key, config_json")
        .eq("active", true as never);
      const hasData = ((data ?? []) as { config_json: unknown }[]).some(
        (r) => Array.isArray(r.config_json) && r.config_json.length > 0,
      );
      setSource(hasData ? "database" : "code");
    } catch {
      setSource("code");
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <AppLayout>
      <div className="p-6 max-w-[1200px] mx-auto space-y-6">
        <AccountingPageHeader
          title="Platform workflow configuration"
          subtitle="EWE + FOE — DB-driven rules with code fallback"
          actions={
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`size-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          }
        />

        <Card className="p-4 flex items-center gap-3">
          <Settings2 className="size-5 text-muted-foreground" />
          <div className="flex-1 text-sm">
            Active source:{" "}
            <Badge variant={source === "database" ? "default" : "secondary"}>
              {source === "database" ? "Database (platform_config)" : "Code defaults"}
            </Badge>
            <p className="text-muted-foreground mt-1 text-xs">
              Edit rows in <code className="text-xs">platform_config</code> after Lovable Publish. Empty JSON
              arrays inherit code defaults.
            </p>
          </div>
        </Card>

        {CONFIG_SECTIONS.map((section) => {
          const data = effectiveConfig(section.key);
          const count = Array.isArray(data) ? data.length : 0;
          return (
            <Card key={section.key} className="p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h2 className="font-semibold">{section.label}</h2>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </div>
                <Badge variant="outline">{count} entries</Badge>
              </div>
              <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-auto max-h-[280px]">
                {JSON.stringify(data, null, 2)}
              </pre>
            </Card>
          );
        })}
      </div>
    </AppLayout>
  );
}
