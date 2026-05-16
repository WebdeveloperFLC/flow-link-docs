import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getFields, groupBy, type Scope, type FieldDefinition } from "../mock/fieldDefinitions";

interface Props {
  scope: Scope;
  values: Record<string, any>;
  onChange?: (next: Record<string, any>) => void;
  readOnly?: boolean;
}

export function DynamicFieldGroup({ scope, values, onChange, readOnly }: Props) {
  const fields = getFields(scope);
  const groups = groupBy(fields);

  const set = (key: string, v: any) => onChange?.({ ...values, [key]: v });

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([groupName, defs]) => (
        <div key={groupName} className="space-y-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            {groupName}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {defs
              .filter((d) => !d.visibleIf || d.visibleIf(values))
              .map((def) => (
                <FieldControl key={def.key} def={def} value={values[def.key]} onChange={(v) => set(def.key, v)} readOnly={readOnly} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FieldControl({
  def,
  value,
  onChange,
  readOnly,
}: {
  def: FieldDefinition;
  value: any;
  onChange: (v: any) => void;
  readOnly?: boolean;
}) {
  const id = `dyn-${def.key}`;
  const common = { id, disabled: readOnly };

  if (def.type === "boolean") {
    return (
      <div className="flex items-center gap-3">
        <Switch checked={!!value} onCheckedChange={onChange} disabled={readOnly} />
        <Label htmlFor={id} className="text-sm">{def.label}</Label>
      </div>
    );
  }

  if (def.type === "textarea") {
    return (
      <div className="space-y-1 md:col-span-2">
        <Label htmlFor={id} className="text-xs text-muted-foreground">{def.label}</Label>
        <Textarea {...common} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  }

  if (def.type === "select") {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{def.label}</Label>
        <Select value={value ?? ""} onValueChange={onChange} disabled={readOnly}>
          <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
          <SelectContent>
            {(def.options ?? []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (def.type === "multiselect") {
    const arr: string[] = Array.isArray(value) ? value : [];
    const toggle = (o: string) =>
      onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o]);
    return (
      <div className="space-y-1 md:col-span-2">
        <Label className="text-xs text-muted-foreground">{def.label}</Label>
        <div className="flex flex-wrap gap-1">
          {(def.options ?? []).map((o) => (
            <Button
              key={o}
              type="button"
              size="sm"
              variant={arr.includes(o) ? "default" : "outline"}
              onClick={() => !readOnly && toggle(o)}
              disabled={readOnly}
              className="h-7 text-xs"
            >
              {o}
            </Button>
          ))}
        </div>
        {arr.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {arr.map((v) => <Badge key={v} variant="secondary">{v}</Badge>)}
          </div>
        )}
      </div>
    );
  }

  const inputType =
    def.type === "number" || def.type === "percent" || def.type === "currency"
      ? "number"
      : def.type === "date"
      ? "date"
      : "text";

  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {def.label}
        {def.type === "percent" && " (%)"}
        {def.type === "currency" && " (CAD)"}
      </Label>
      <Input
        {...common}
        type={inputType}
        value={value ?? ""}
        onChange={(e) => onChange(inputType === "number" ? Number(e.target.value) : e.target.value)}
      />
      {def.helpText && <div className="text-[10px] text-muted-foreground">{def.helpText}</div>}
    </div>
  );
}