import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Loader2, Workflow } from "lucide-react";
import { fetchWorkflowTemplatesForService } from "@/lib/service-library/matchWorkflowTemplate";
import type { Template } from "@/pages/Templates";

type Props = {
  libraryId: string;
  country: string | null;
};

export function ServiceBinderTab({ libraryId, country }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchWorkflowTemplatesForService(libraryId, country)
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, [libraryId, country]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!templates.length) {
    return (
      <Card className="p-8 text-center shadow-elev-sm">
        <Workflow className="size-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">No document binder configured</p>
        <p className="text-xs text-muted-foreground mt-1">
          Link a document binder template to this service in Service Library Admin, or ask your admin to seed
          checklist templates for this country.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {templates.map((t) => (
        <Card key={t.id} className="p-5 shadow-elev-sm space-y-3">
          <div>
            <h3 className="font-semibold">{t.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t.country} · v{t.version} · {t.items.length} documents
              {t.groups?.length ? ` · ${t.groups.length} sections` : ""}
            </p>
          </div>
          {t.groups && t.groups.length > 0 ? (
            <div className="space-y-3">
              {t.groups.map((g) => (
                <div key={g.id}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                    {g.label}
                  </div>
                  <ul className="space-y-1">
                    {g.item_ids.map((itemId, idx) => {
                      const item = t.items.find((i) => i.id === itemId);
                      if (!item) return null;
                      return (
                        <li key={itemId} className="text-sm flex gap-2 items-start">
                          <span className="text-muted-foreground tabular-nums shrink-0">{idx + 1}.</span>
                          <span>
                            {item.name}
                            {item.mandatory && (
                              <span className="text-secondary text-[10px] ml-1">required</span>
                            )}
                            {item.notes && (
                              <span className="block text-xs text-muted-foreground">{item.notes}</span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <ul className="space-y-1">
              {t.items.map((item, idx) => (
                <li key={item.id} className="text-sm flex gap-2">
                  <span className="text-muted-foreground tabular-nums shrink-0">{idx + 1}.</span>
                  <span>
                    {item.name}
                    {item.mandatory && (
                      <span className="text-secondary text-[10px] ml-1">required</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}
