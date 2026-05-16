import { useState } from 'react';
import { Paintbrush, Sun, Moon, Monitor, Trash2, Save, PanelLeft, PanelLeftClose, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from './ThemeProvider';
import { ColorSwatch } from './ColorSwatch';
import { FontPicker } from './FontPicker';
import {
  THEME_PRESETS,
  SIDEBAR_GRADIENTS,
  ThemeConfig,
  hexToHsl,
  hslToHex,
  loadSavedThemes,
  persistSavedThemes,
  SavedTheme,
  MAX_SAVED_THEMES,
} from '@/lib/themeStore';

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

const RADIUS_PX: Record<ThemeConfig['borderRadius'], string> = {
  none: '0px', small: '4px', medium: '8px', large: '12px', full: '9999px',
};

// ---- Sub-components ------------------------------------------------------

function HexColorPicker({ value, onChange, label }: { value: string; onChange: (hsl: string) => void; label: string }) {
  const hex = (() => { try { return hslToHex(value); } catch { return '#000000'; } })();
  const [text, setText] = useState(hex);

  // Keep text in sync when external value changes
  if (text.toLowerCase() !== hex.toLowerCase() && document.activeElement?.getAttribute('data-hex-input') !== label) {
    // no-op; text is managed locally; we sync on blur and on swatch click via key change
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <input
        type="color"
        value={hex}
        onChange={(e) => { setText(e.target.value); onChange(hexToHsl(e.target.value)); }}
        className="h-9 w-12 rounded-md border border-border cursor-pointer bg-transparent p-0.5"
        aria-label={`${label} color picker`}
      />
      <Input
        data-hex-input={label}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const v = text.startsWith('#') ? text : `#${text}`;
          if (/^#[0-9a-fA-F]{6}$/.test(v)) { onChange(hexToHsl(v)); setText(v.toLowerCase()); }
          else setText(hex);
        }}
        placeholder="#000000"
        className="h-9 font-mono text-xs uppercase"
      />
    </div>
  );
}

function LivePreview({ theme }: { theme: ThemeConfig }) {
  const sidebarBg = theme.sidebarStyle === 'gradient' ? theme.sidebarGradient : `hsl(${theme.sidebarColor})`;
  const radius = RADIUS_PX[theme.borderRadius];
  return (
    <div className="w-full h-[120px] rounded-xl overflow-hidden border border-border flex shadow-sm">
      <div className="w-1/5 flex flex-col items-center gap-2 py-3" style={{ background: sidebarBg }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block w-5 h-5 rounded-full"
            style={{
              background: i === 0 ? `hsl(${theme.primaryColor})` : `hsl(${theme.sidebarTextColor} / 0.35)`,
            }}
          />
        ))}
      </div>
      <div className="flex-1 p-3 flex flex-col gap-2" style={{ background: `hsl(${theme.backgroundColor})` }}>
        <div
          className="flex-1 p-2 flex flex-col gap-1.5 border"
          style={{ background: `hsl(${theme.cardColor})`, borderRadius: radius, borderColor: 'hsl(var(--border))' }}
        >
          <div className="h-1.5 w-2/3 rounded-full" style={{ background: 'hsl(var(--muted-foreground) / 0.4)' }} />
          <div className="h-1.5 w-1/2 rounded-full" style={{ background: 'hsl(var(--muted-foreground) / 0.25)' }} />
          <div className="mt-auto">
            <span
              className="inline-block px-3 py-1 text-[10px] font-medium"
              style={{
                background: `hsl(${theme.primaryColor})`,
                color: `hsl(${theme.primaryForeground})`,
                borderRadius: RADIUS_PX[theme.buttonRadius],
              }}
            >Button</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Main component ------------------------------------------------------

export function ThemeCustomizer() {
  const { user } = useAuth();
  const { theme, setTheme, resetTheme, applyPreset } = useTheme();
  const [open, setOpen] = useState(false);
  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>(() => loadSavedThemes());
  const [newThemeName, setNewThemeName] = useState('');

  if (!user) return null;

  const handleSaveTheme = () => {
    const name = newThemeName.trim();
    if (!name) { toast.error('Please enter a theme name'); return; }
    if (savedThemes.length >= MAX_SAVED_THEMES) {
      toast.error(`Max ${MAX_SAVED_THEMES} themes. Delete one first.`); return;
    }
    if (savedThemes.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      toast.error('A theme with this name already exists'); return;
    }
    const next = [...savedThemes, { name, config: theme, savedAt: new Date().toISOString() }];
    setSavedThemes(next);
    persistSavedThemes(next);
    setNewThemeName('');
    toast.success(`Theme saved as "${name}"`);
  };

  const handleApplySaved = (t: SavedTheme) => {
    applyPreset({ name: t.name, preview: t.config.primaryColor, config: t.config });
    toast.success(`Applied "${t.name}"`);
  };

  const handleDeleteSaved = (name: string) => {
    const next = savedThemes.filter((t) => t.name !== name);
    setSavedThemes(next);
    persistSavedThemes(next);
  };

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
        <SheetContent side="right" className="w-full sm:max-w-[400px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Customise appearance</SheetTitle>
            <SheetDescription className="text-xs">
              Changes apply instantly and are saved to your browser.
            </SheetDescription>
          </SheetHeader>

          <div className="py-4 space-y-6">
            {/* 0. Live preview */}
            <LivePreview theme={theme} />

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

              {/* My themes */}
              {savedThemes.length > 0 && (
                <div className="mt-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">My themes</div>
                  <div className="space-y-1.5">
                    {savedThemes.map((t) => (
                      <div key={t.name} className="flex items-center gap-2 p-1.5 rounded-md border border-border">
                        <span className="block w-4 h-4 rounded-full shrink-0" style={{ background: `hsl(${t.config.primaryColor})` }} />
                        <span className="text-xs flex-1 truncate">{t.name}</span>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => handleApplySaved(t)}>Apply</Button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSaved(t.name)}
                          className="p-1 text-muted-foreground hover:text-destructive"
                          aria-label={`Delete ${t.name}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Save current theme */}
              <div className="mt-3 flex items-center gap-2">
                <Input
                  value={newThemeName}
                  onChange={(e) => setNewThemeName(e.target.value)}
                  placeholder="Name this theme..."
                  className="h-8 text-xs"
                  maxLength={30}
                />
                <Button size="sm" onClick={handleSaveTheme} className="h-8 shrink-0">
                  <Save className="size-3.5 mr-1" /> Save
                </Button>
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

              {/* Sidebar mode */}
              <div>
                <div className="text-xs mb-1.5">Mode</div>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'full', label: 'Full', icon: PanelLeft },
                    { key: 'icons-only', label: 'Icons', icon: PanelLeftClose },
                    { key: 'hidden', label: 'Hidden', icon: EyeOff },
                  ] as const).map((m) => {
                    const active = theme.sidebarMode === m.key;
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setTheme({ sidebarMode: m.key })}
                        className={cn(
                          'flex flex-col items-center justify-center gap-1 py-2 rounded-md border text-[11px] transition-colors',
                          active ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent/40',
                        )}
                      >
                        <Icon className="size-4" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

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

              {/* Sidebar style: solid / gradient */}
              <div>
                <div className="text-xs mb-1.5">Style</div>
                <div className="grid grid-cols-2 gap-2">
                  {(['solid', 'gradient'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTheme({ sidebarStyle: s })}
                      className={cn(
                        'py-1.5 rounded-md border text-xs capitalize',
                        theme.sidebarStyle === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent/40',
                      )}
                    >{s}</button>
                  ))}
                </div>
              </div>

              {theme.sidebarStyle === 'gradient' ? (
                <div>
                  <div className="text-xs mb-1.5">Gradient</div>
                  <div className="grid grid-cols-3 gap-2">
                    {SIDEBAR_GRADIENTS.map((g) => {
                      const active = theme.sidebarGradient === g.value;
                      return (
                        <button
                          key={g.name}
                          type="button"
                          onClick={() => setTheme({ sidebarGradient: g.value })}
                          title={g.name}
                          className={cn(
                            'h-12 rounded-md border transition-all',
                            active ? 'border-primary ring-2 ring-primary ring-offset-1 ring-offset-background' : 'border-border',
                          )}
                          style={{ background: g.value }}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <div className="text-xs mb-1.5">Sidebar color</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {SIDEBAR_BG_COLORS.map((c) => (
                        <ColorSwatch
                          key={c}
                          color={c}
                          selected={hslToHex(theme.sidebarColor).toLowerCase() === c.toLowerCase()}
                          onClick={() => setTheme({ sidebarColor: hexToHsl(c) })}
                        />
                      ))}
                    </div>
                    <HexColorPicker
                      key={`sb-${theme.sidebarColor}`}
                      value={theme.sidebarColor}
                      onChange={(hsl) => setTheme({ sidebarColor: hsl })}
                      label="sidebar"
                    />
                  </div>
                </>
              )}

              <div>
                <div className="text-xs mb-1.5">Text color</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {SIDEBAR_TEXT_COLORS.map((c) => (
                    <ColorSwatch
                      key={c}
                      color={c}
                      selected={hslToHex(theme.sidebarTextColor).toLowerCase() === c.toLowerCase()}
                      onClick={() => setTheme({ sidebarTextColor: hexToHsl(c) })}
                    />
                  ))}
                </div>
              </div>
            </section>

            <Separator />

            {/* 4. Primary color */}
            <section>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Primary color</div>
              <div className="text-xs text-muted-foreground mb-2">Used for buttons, links, and highlights</div>
              <div className="grid grid-cols-5 gap-2">
                {PRIMARY_COLORS.map((c) => (
                  <ColorSwatch
                    key={c}
                    color={c}
                    size={32}
                    selected={hslToHex(theme.primaryColor).toLowerCase() === c.toLowerCase()}
                    onClick={() => setTheme({ primaryColor: hexToHsl(c), accentColor: hexToHsl(c) })}
                  />
                ))}
              </div>
              <HexColorPicker
                key={`pri-${theme.primaryColor}`}
                value={theme.primaryColor}
                onChange={(hsl) => setTheme({ primaryColor: hsl, accentColor: hsl })}
                label="primary"
              />
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

            <Separator />

            {/* 9. Card style */}
            <section>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Card style</div>
              <div className="grid grid-cols-3 gap-2">
                {(['solid', 'glass', 'flat'] as const).map((c) => {
                  const active = theme.cardStyle === c;
                  const previewStyle =
                    c === 'solid'
                      ? 'bg-card border border-border shadow-sm'
                      : c === 'glass'
                      ? 'bg-card/60 border border-border/50 backdrop-blur'
                      : 'bg-transparent border border-border';
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setTheme({ cardStyle: c })}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2 rounded-md border transition-colors',
                        active ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/40',
                      )}
                    >
                      <span className={cn('rounded', previewStyle)} style={{ width: 60, height: 40 }} />
                      <span className="text-[10px] text-muted-foreground capitalize">{c}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <Separator />

            {/* 10. Nav active style */}
            <section>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Nav style</div>
              <div className="grid grid-cols-4 gap-2">
                {([
                  { key: 'pill', label: 'Pill' },
                  { key: 'border-left', label: 'Left' },
                  { key: 'glow', label: 'Glow' },
                  { key: 'underline', label: 'Under' },
                ] as const).map((s) => {
                  const active = theme.navActiveStyle === s.key;
                  const activeItemStyle =
                    s.key === 'pill'
                      ? { background: 'hsl(var(--primary) / 0.15)', borderRadius: 4 }
                      : s.key === 'border-left'
                      ? { background: 'hsl(var(--primary) / 0.1)', borderLeft: '2px solid hsl(var(--primary))' }
                      : s.key === 'glow'
                      ? { background: 'hsl(var(--primary) / 0.15)', boxShadow: '0 0 6px hsl(var(--primary) / 0.6)', borderRadius: 4 }
                      : { borderBottom: '2px solid hsl(var(--primary))' };
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setTheme({ navActiveStyle: s.key })}
                      className={cn(
                        'flex flex-col items-center gap-1 p-1.5 rounded-md border transition-colors',
                        active ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/40',
                      )}
                    >
                      <span className="flex flex-col gap-1 p-1 rounded bg-sidebar w-full" style={{ minHeight: 40 }}>
                        <span className="h-1.5 w-full rounded-sm" style={{ background: 'hsl(var(--sidebar-foreground) / 0.25)' }} />
                        <span className="h-1.5 w-full" style={activeItemStyle} />
                        <span className="h-1.5 w-full rounded-sm" style={{ background: 'hsl(var(--sidebar-foreground) / 0.25)' }} />
                      </span>
                      <span className="text-[10px] text-muted-foreground">{s.label}</span>
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
