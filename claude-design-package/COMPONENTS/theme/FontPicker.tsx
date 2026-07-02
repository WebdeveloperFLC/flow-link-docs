import { cn } from '@/lib/utils';
import { useTheme } from './ThemeProvider';
import { ensureFontLoaded, ThemeConfig } from '@/lib/themeStore';
import { useEffect } from 'react';

const FONTS: { key: ThemeConfig['fontFamily']; label: string; stack: string }[] = [
  { key: 'inter', label: 'Inter', stack: "'Inter', sans-serif" },
  { key: 'poppins', label: 'Poppins', stack: "'Poppins', sans-serif" },
  { key: 'nunito', label: 'Nunito', stack: "'Nunito', sans-serif" },
  { key: 'roboto', label: 'Roboto', stack: "'Roboto', sans-serif" },
  { key: 'outfit', label: 'Outfit', stack: "'Outfit', sans-serif" },
  { key: 'plus-jakarta', label: 'Plus Jakarta', stack: "'Plus Jakarta Sans', sans-serif" },
];

export function FontPicker() {
  const { theme, setTheme } = useTheme();

  // Preload all preview fonts so the swatches actually render in their face
  useEffect(() => { FONTS.forEach((f) => ensureFontLoaded(f.key)); }, []);

  return (
    <div className="grid grid-cols-3 gap-2">
      {FONTS.map((f) => {
        const active = theme.fontFamily === f.key;
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => setTheme({ fontFamily: f.key })}
            className={cn(
              'rounded-lg border p-3 text-left transition-colors hover:bg-accent/40',
              active ? 'border-primary bg-primary/5' : 'border-border',
            )}
          >
            <div className="text-2xl leading-none" style={{ fontFamily: f.stack }}>Aa</div>
            <div className="text-[11px] text-muted-foreground mt-1">{f.label}</div>
          </button>
        );
      })}
    </div>
  );
}