import { Info } from "lucide-react";
import { COA_READONLY_BANNER } from "../../lib/coaUxHelpers";

export default function CoaReadOnlyBanner() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-blue-200/80 bg-blue-50/80 dark:border-blue-900/50 dark:bg-blue-950/30 px-4 py-3 text-sm text-blue-900 dark:text-blue-100">
      <Info className="size-4 shrink-0 mt-0.5" />
      <p>{COA_READONLY_BANNER}</p>
    </div>
  );
}
