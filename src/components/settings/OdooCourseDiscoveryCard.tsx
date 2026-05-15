import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, BookOpen, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type ModelRow = { id: number; model: string; name: string; modules?: string };
type FieldMeta = { string: string; type: string; required?: boolean; relation?: string };

export const OdooCourseDiscoveryCard = () => {
  const [scanning, setScanning] = useState(false);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [describing, setDescribing] = useState(false);
  const [fields, setFields] = useState<Record<string, FieldMeta> | null>(null);
  const [sample, setSample] = useState<unknown[]>([]);
  const [manualModel, setManualModel] = useState("");

  const scan = async () => {
    setScanning(true); setModels([]); setFields(null); setSample([]);
    try {
      const { data, error } = await supabase.functions.invoke("odoo-discover", {
        body: { action: "list_models" },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Discovery failed");
      setModels(data.models ?? []);
      toast.success(`Found ${data.count} candidate model(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scan failed");
    } finally { setScanning(false); }
  };

  const describe = async (model: string) => {
    setSelected(model); setDescribing(true); setFields(null); setSample([]);
    try {
      const { data, error } = await supabase.functions.invoke("odoo-discover", {
        body: { action: "describe_model", model },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Describe failed");
      setFields(data.fields ?? {});
      setSample(data.sample ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Describe failed");
    } finally { setDescribing(false); }
  };

  return (
    <Card className="p-5 shadow-elev-sm space-y-4">
      <div>
        <div className="font-semibold flex items-center gap-2">
          <BookOpen className="size-4 text-primary" /> Course Finder · Odoo discovery
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Step 1 — find which Odoo model holds your course catalogue. Once we identify it,
          the next step will sync those courses into Course Finder. Your existing
          <code className="mx-1">ODOO_API_KEY</code> is reused — nothing new to configure.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={scan} disabled={scanning}>
          {scanning ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Search className="size-3.5 mr-1.5" />}
          Scan Odoo for course models
        </Button>
        <span className="text-xs text-muted-foreground">
          Searches for models containing: course, program, education, university, faculty, student, op.*
        </span>
      </div>

      {models.length > 0 && (
        <div className="border rounded-md">
          <ScrollArea className="h-[220px]">
            <ul className="divide-y">
              {models.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => describe(m.model)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-muted/50 ${selected === m.model ? "bg-muted" : ""}`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-mono">{m.model}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {m.name}{m.modules ? ` · ${m.modules}` : ""}
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">Or inspect a specific model directly</Label>
        <div className="flex items-center gap-2">
          <Input
            placeholder="e.g. op.course, x_course, product.template"
            value={manualModel}
            onChange={(e) => setManualModel(e.target.value)}
          />
          <Button variant="outline" disabled={!manualModel || describing}
            onClick={() => describe(manualModel.trim())}>
            {describing ? <Loader2 className="size-3.5 animate-spin" /> : "Inspect"}
          </Button>
        </div>
      </div>

      {fields && (
        <div className="border rounded-md p-3 space-y-2">
          <div className="text-sm font-semibold">
            Model: <span className="font-mono">{selected}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {Object.keys(fields).length} fields · {sample.length} sample row(s).
            Copy the field names you want to map to Course Finder (name, university, country,
            level, duration, tuition, intake, IELTS, etc.) and paste them in chat.
          </div>
          <ScrollArea className="h-[260px] border rounded bg-muted/30">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background">
                <tr className="text-left">
                  <th className="px-2 py-1.5 font-medium">Field name</th>
                  <th className="px-2 py-1.5 font-medium">Label</th>
                  <th className="px-2 py-1.5 font-medium">Type</th>
                  <th className="px-2 py-1.5 font-medium">Relation</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(fields).map(([k, v]) => (
                  <tr key={k} className="border-t">
                    <td className="px-2 py-1 font-mono">{k}</td>
                    <td className="px-2 py-1">{v.string}</td>
                    <td className="px-2 py-1 text-muted-foreground">{v.type}</td>
                    <td className="px-2 py-1 font-mono text-muted-foreground">{v.relation ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
          {sample.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                Show 3 sample rows (raw JSON)
              </summary>
              <pre className="mt-2 p-2 bg-muted/50 rounded overflow-auto max-h-[260px] text-[11px] font-mono">
                {JSON.stringify(sample, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </Card>
  );
};

export default OdooCourseDiscoveryCard;