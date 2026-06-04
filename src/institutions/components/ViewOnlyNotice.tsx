import { Card } from "@/components/ui/card";
import { Eye } from "lucide-react";

export function ViewOnlyNotice({ label = "Institutions" }: { label?: string }) {
  return (
    <Card className="p-3 border-amber-500/40 bg-amber-500/10 text-sm flex items-start gap-2">
      <Eye className="size-4 shrink-0 mt-0.5 text-amber-700" />
      <p>
        You have <strong>view-only</strong> access to {label}. Ask an admin to grant{" "}
        <strong>Edit</strong> in <b>Team &amp; roles → Permissions → {label}</b> to make changes.
      </p>
    </Card>
  );
}
