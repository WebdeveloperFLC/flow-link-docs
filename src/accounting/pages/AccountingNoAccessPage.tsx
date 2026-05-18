import { Link, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldOff } from "lucide-react";
import { ACCT_MODULE_BY_KEY } from "../lib/accountingModulePermissions";

export default function AccountingNoAccessPage() {
  const [params] = useSearchParams();
  const section = params.get("section") ?? "";
  const level = params.get("level") ?? "view";
  const label = ACCT_MODULE_BY_KEY[section]?.label ?? section;
  return (
    <AppLayout>
      <div className="p-8">
        <Card className="max-w-xl mx-auto p-8 text-center space-y-4 shadow-elev-sm">
          <div className="inline-flex items-center justify-center size-12 rounded-full bg-destructive/10 text-destructive mx-auto">
            <ShieldOff className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">No access</h1>
            <p className="text-sm text-muted-foreground mt-1">
              You don't have <b>{level}</b> access to <b>{label || "this section"}</b>.
              Ask your admin to grant access in <span className="font-mono text-xs">/accounting/access</span>.
            </p>
          </div>
          <div className="flex justify-center gap-2">
            <Button asChild variant="outline"><Link to="/accounting">Go to Accounting</Link></Button>
            <Button asChild><Link to="/">Home</Link></Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}