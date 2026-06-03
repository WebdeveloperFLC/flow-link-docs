import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Paintbrush, Loader2, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  THEME_PRESETS,
  normalizeTheme,
  exportThemeJson,
  importThemeJson,
  contrastRatio,
  type ThemeConfig,
} from '@/lib/themeStore';
import { fetchOrgTheme, saveOrgTheme } from '@/lib/orgTheme';
import { useTheme } from '@/components/theme/ThemeProvider';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function CrmAppearanceCard() {
  const { theme, setFullTheme, applyPreset } = useTheme();
  const [draft, setDraft] = useState<ThemeConfig>(theme);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchOrgTheme()
      .then((org) => {
        if (org) setDraft(org);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const applyDraft = (config: ThemeConfig) => {
    const next = normalizeTheme(config);
    setDraft(next);
    setFullTheme(next);
  };

  const saveAsCompanyDefault = async () => {
    setSaving(true);
    try {
      await saveOrgTheme(draft);
      toast.success('Company CRM theme saved for all staff');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save theme');
    } finally {
      setSaving(false);
    }
  };

  const contrast = contrastRatio(draft.primaryForeground, draft.primaryColor);
  const lowContrast = contrast < 4.5;

  const onImport = () => {
    const raw = window.prompt('Paste theme JSON');
    if (!raw) return;
    try {
      applyDraft(importThemeJson(raw));
      toast.success('Theme imported');
    } catch {
      toast.error('Invalid theme JSON');
    }
  };

  if (loading) {
    return (
      <Card className="p-8 grid place-items-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-4 shadow-elev-sm">
      <div className="flex items-start gap-3">
        <Paintbrush className="size-5 text-primary shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold">CRM appearance (company default)</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Sets the default colorful theme for all counselors. Staff can still personalize via the paintbrush
            button.
          </p>
        </div>
      </div>

      {lowContrast && (
        <p className="text-xs text-warning bg-warning/10 border border-warning/20 rounded-md px-3 py-2">
          Primary text contrast is low ({contrast.toFixed(1)}:1). Consider adjusting primary or foreground colors.
        </p>
      )}

      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Presets</div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {THEME_PRESETS.slice(0, 8).map((p) => {
            const active =
              draft.primaryColor === p.config.primaryColor &&
              draft.colorfulMode === p.config.colorfulMode;
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => applyDraft(p.config)}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 rounded-lg border text-[10px] transition-colors hover:bg-accent/40',
                  active ? 'border-primary ring-1 ring-primary' : 'border-border',
                )}
              >
                <span
                  className="block w-6 h-6 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, hsl(${p.config.primaryColor}), hsl(${p.config.secondaryColor}))`,
                  }}
                />
                <span className="text-center text-muted-foreground leading-tight">{p.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label htmlFor="colorful-mode-admin" className="text-sm font-medium">
            Colorful mode
          </Label>
          <p className="text-xs text-muted-foreground">Multi-color sidebar sections and gradient page background</p>
        </div>
        <Switch
          id="colorful-mode-admin"
          checked={draft.colorfulMode}
          onCheckedChange={(v) => applyDraft({ ...draft, colorfulMode: v })}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={saveAsCompanyDefault} disabled={saving}>
          {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null}
          Save as company default
        </Button>
        <Button variant="outline" size="sm" onClick={() => applyPreset({ name: 'Preview', preview: draft.primaryColor, config: draft })}>
          Preview on my screen
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const blob = new Blob([exportThemeJson(draft)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'crm-theme.json';
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="size-4 mr-1" />
          Export
        </Button>
        <Button variant="outline" size="sm" onClick={onImport}>
          <Upload className="size-4 mr-1" />
          Import
        </Button>
      </div>
    </Card>
  );
}
