import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ExportFormat, ExportScope } from "@/lib/export";
import type { ExportDatasetProps } from "./useExportDataset";

const FORMAT_LABELS: Record<ExportFormat, string> = {
  csv: "CSV",
  xlsx: "Excel (.xlsx)",
  pdf: "PDF",
};

const FORMAT_ICONS: Record<ExportFormat, typeof FileText> = {
  csv: FileText,
  xlsx: FileSpreadsheet,
  pdf: FileText,
};

const SCOPE_LABELS: Record<ExportScope, (count: number) => string> = {
  filtered: (n) => `Current results (${n})`,
  selected: (n) => `Selected (${n})`,
  all: () => "Complete dataset",
};

export function ExportMenu({
  exportData,
  busy,
  formats,
  canExportAll,
  counts,
  disabled,
  label = "Export",
}: ExportDatasetProps & { disabled?: boolean; label?: string }) {
  const scopes: ExportScope[] = ["filtered", "selected"];
  if (canExportAll) scopes.push("all");

  const onExport = (format: ExportFormat, scope: ExportScope) => {
    void exportData(format, scope);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled || busy}>
          {busy ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Download className="size-4 mr-1" />}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export data</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {formats.map((format) => {
          const Icon = FORMAT_ICONS[format];
          return (
            <DropdownMenuSub key={format}>
              <DropdownMenuSubTrigger>
                <Icon className="size-4 mr-2" />
                {FORMAT_LABELS[format]}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {scopes.map((scope) => {
                  const count = scope === "filtered" ? counts.filtered : scope === "selected" ? counts.selected : null;
                  const scopeDisabled =
                    (scope === "selected" && counts.selected === 0) ||
                    (scope === "filtered" && counts.filtered === 0);
                  return (
                    <DropdownMenuItem
                      key={scope}
                      disabled={scopeDisabled}
                      onClick={() => onExport(format, scope)}
                    >
                      {SCOPE_LABELS[scope](count ?? 0)}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
