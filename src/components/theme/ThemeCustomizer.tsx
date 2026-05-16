import { useState } from 'react';
import { Paintbrush, Sun, Moon, Monitor } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from './ThemeProvider';
import { ColorSwatch } from './ColorSwatch';
import { FontPicker } from './FontPicker';
import { THEME_PRESETS, ThemeConfig } from '@/lib/themeStore';

// ---- Helpers --------------------------------------------------------------

function hexToHsl(hex: string): string {
  const m = hex.replace('#', '');
  const r = parseInt(m.substring(0, 2), 16) / 255;
  const g = parseInt(m.substring(2, 4), 16) / 255;
  const b = parseInt(m.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hslToHex(hsl: string): string {
  const parts = hsl.split(/\s+/);
  const h = parseFloat(parts[0]) / 360;
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  let r: number, g: number, b: number;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ---- Constants ------------------------------------------------------------

const PRIMARY_COLORS = [
  '#2563eb', '#4f46e5', '#7c3aed', '#db2777', '#dc2626',
  '#ea580c', '#d97706', '#16a34a', '#0d9488', '#0891b2',
];

const SIDEBAR_BG_COLORS = ['#0f172a', '#1e293b', '#1e1b4b', '#052e16', '#042f2e', '#ffffff'];
const SIDEBAR_TEXT_COLORS = ['#ffffff', '#e5e7eb', '#0f172a'];

const RADIUS_OPTIONS: { key: ThemeConfig['borderRadius']; label: string; px: string }[] = [
  { key: 'none', label: 'None', px: '0px' },
  { key: 'small', label: 'Small', px: '4px' },
  { key: 'medium', label: 'Medium', px: '8px' },
  { key: 'large', label: 'Large', px: '12px' },
  { key: 'full', label: 'Pill', px: '9999px' },
];

const DENSITY_OPTIONS: { key: ThemeConfig['contentDensity']; label: string; gap: string }[] = [
  { key: 'compact', label: 'Compact', gap: '4px' },
  { key: 'comfortable', label: 'Comfortable', gap: '8px' },
  { key: 'spacious', label: 'Spacious', gap: '14px' },
];

// ---- Component ------------------------------------------------------------

export function ThemeCustomizer() {
  const { user } = useAuth();
  const { theme, setTheme, resetTheme, applyPreset } = useTheme();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const primaryHex = (() => { try { return hslToHex(theme.primaryColor); } catch { return '#2563eb'; } })();
  const sidebarHex = (() => { try { return hslToHex(theme.sidebarColor); } catch { return '#0f172a'; } })();
  const sidebarTextHex = (() => { try { return hslToHex(theme.sidebarTextColor); } catch { return '#ffffff'; } })();

  return (
    <>
      <button
        type="button"
        aria-label="Customise appearance"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
      >
        <Paintbrush className="size-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[380px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Customise appearance</SheetTitle>
            <SheetDescription className="text-xs">
              Changes apply instantly and are saved to your browser.
            </SheetDescription>
          </SheetHeader>

          <div className="py-4 space-y-6">
            {/* 1. Presets */}
            <section>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Quick themes</div>
              <div className="grid grid-cols-4 gap-2">
                {THEME_PRESETS.map((p) => {
                  const active = theme.primaryColor === p.config.primaryColor && theme.sidebarColor === p.config.sidebarColor;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-colors hover:bg-accent/40',
                        active ? 'border-primary ring-1 ring-primary' : 'border-border',
                      )}
                    >
                      <span className="block w-5 h-5 rounded-full" style={{ background: `hsl(${p.preview})` }} />
                      <span className="text-[10px] leading-tight text-center text-muted-foreground">{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <Separator />

            {/* 2. Mode */}
            <section>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Appearance</div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: 'light', label: 'Light', icon: Sun },
                  { key: 'dark', label: 'Dark', icon: Moon },
                  { key: 'system', label: 'System', icon: Monitor },
                ] as const).map((m) => {
                  const active = theme.mode === m.key;
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setTheme({ mode: m.key })}
                      className={cn(
                        'flex flex-col items-center justify-center gap-1 py-2 rounded-lg border text-xs transition-colors',
                        active ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent/40',
                      )}
                    >
                      <Icon className="size-4" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <Separator />

            {/* 3. Sidebar */}
            <section className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sidebar</div>

              <div>
                <div className="text-xs mb-1.5">Position</div>
                <div className="grid grid-cols-2 gap-2">
                  {(['left', 'right'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setTheme({ sidebarPosition: p })}
                      className={cn(
                        'py-1.5 rounded-md border text-xs capitalize',
                        theme.sidebarPosition === p ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent/40',
                      )}
                    >{p}</button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs mb-1.5">Width</div>
                <div className="grid grid-cols-3 gap-2">
                  {(['compact', 'normal', 'wide'] as const).map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setTheme({ sidebarWidth: w })}
                      className={cn(
                        'py-1.5 rounded-md border text-xs capitalize',
                        theme.sidebarWidth === w ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent/40',
                      )}
                    >{w}</button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs mb-1.5">Sidebar color</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {SIDEBAR_BG_COLORS.map((c) => (
                    <ColorSwatch
                      key={c}
                      color={c}
                      selected={sidebarHex.toLowerCase() === c.toLowerCase()}
                      onClick={() => setTheme({ sidebarColor: hexToHsl(c) })}
                    />
                  ))}
                  <input
                    type="color"
                    value={sidebarHex}
                    onChange={(e) => setTheme({ sidebarColor: hexToHsl(e.target.value) })}
                    className="h-7 w-7 rounded-full border border-border cursor-pointer bg-transparent"
                    aria-label="Custom sidebar color"
                  />
                </div>
              </div>

              <div>
                <div className="text-xs mb-1.5">Text color</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {SIDEBAR_TEXT_COLORS.map((c) => (
                    <ColorSwatch
                      key={c}
                      color={c}
                      selected={sidebarTextHex.toLowerCase() === c.toLowerCase()}
                      onClick={() => setTheme({ sidebarTextColor: hexToHsl(c) })}
                    />
                  ))}
                  <input
                    type="color"
                    value={sidebarTextHex}
                    onChange={(e) => setTheme({ sidebarTextColor: hexToHsl(e.target.value) })}
                    className="h-7 w-7 rounded-full border border-border cursor-pointer bg-transparent"
                    aria-label="Custom sidebar text color"
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* 4. Primary color */}
            <section>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Primary color</div>
              <div className="text-xs text-muted-foreground mb-2">Used for buttons, links, and highlights</div>
              <div className="grid grid-cols-5 gap-2 mb-2">
                {PRIMARY_COLORS.map((c) => (
                  <ColorSwatch
                    key={c}
                    color={c}
                    size={32}
                    selected={primaryHex.toLowerCase() === c.toLowerCase()}
                    onClick={() => setTheme({ primaryColor: hexToHsl(c), accentColor: hexToHsl(c) })}
                  />
                ))}
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="color"
                  value={primaryHex}
                  onChange={(e) => setTheme({ primaryColor: hexToHsl(e.target.value), accentColor: hexToHsl(e.target.value) })}
                  className="h-7 w-7 rounded-full border border-border cursor-pointer bg-transparent"
                />
                Custom
              </label>
            </section>

            <Separator />

            {/* 5. Typography */}
            <section className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Font</div>
              <FontPicker />

              <div>
                <div className="text-xs mb-1.5">Size</div>
                <div className="grid grid-cols-3 gap-2">
                  {(['small', 'medium', 'large'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTheme({ fontSize: s })}
                      className={cn(
                        'py-1.5 rounded-md border text-xs',
                        theme.fontSize === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent/40',
                      )}
                    >{s === 'small' ? 'S' : s === 'medium' ? 'M' : 'L'}</button>
                  ))}
                </div>
              </div>
            </section>

            <Separator />

            {/* 6. Border radius */}
            <section>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Border radius</div>
              <div className="grid grid-cols-5 gap-2">
                {RADIUS_OPTIONS.map((r) => {
                  const active = theme.borderRadius === r.key;
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setTheme({ borderRadius: r.key, buttonRadius: r.key })}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2 rounded-md border transition-colors',
                        active ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/40',
                      )}
                    >
                      <span className="block w-8 h-5 bg-muted border border-border" style={{ borderRadius: r.px }} />
                      <span className="text-[10px] text-muted-foreground">{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <Separator />

            {/* 7. Density */}
            <section>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Spacing</div>
              <div className="grid grid-cols-3 gap-2">
                {DENSITY_OPTIONS.map((d) => {
                  const active = theme.contentDensity === d.key;
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setTheme({ contentDensity: d.key })}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2 rounded-md border transition-colors',
                        active ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/40',
                      )}
                    >
                      <span className="flex flex-col w-full" style={{ gap: d.gap }}>
                        <span className="h-1 bg-muted rounded" />
                        <span className="h-1 bg-muted rounded" />
                        <span className="h-1 bg-muted rounded" />
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-1">{d.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <Separator />

            {/* 8. Button style */}
            <section>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Button style</div>
              <div className="grid grid-cols-3 gap-2">
                {(['filled', 'soft', 'outlined'] as const).map((b) => {
                  const active = theme.buttonStyle === b;
                  const preview =
                    b === 'filled'
                      ? 'bg-primary text-primary-foreground'
                      : b === 'soft'
                      ? 'bg-primary/15 text-primary'
                      : 'border border-primary text-primary';
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setTheme({ buttonStyle: b })}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2 rounded-md border transition-colors',
                        active ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/40',
                      )}
                    >
                      <span className={cn('px-3 py-1 rounded text-[11px] font-medium', preview)}>Button</span>
                      <span className="text-[10px] text-muted-foreground capitalize">{b}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <SheetFooter className="flex-row justify-between gap-2 sm:justify-between border-t pt-3 mt-2">
            <Button variant="ghost" size="sm" onClick={resetTheme}>Reset to default</Button>
            <Button size="sm" onClick={() => setOpen(false)}>Close</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}