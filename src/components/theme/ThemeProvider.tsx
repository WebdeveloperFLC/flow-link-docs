import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import {
  ThemeConfig,
  DEFAULT_THEME,
  THEME_PRESETS,
  loadTheme,
  saveTheme,
  applyTheme,
} from '@/lib/themeStore';

export interface ThemeContextValue {
  theme: ThemeConfig;
  setTheme: (patch: Partial<ThemeConfig>) => void;
  resetTheme: () => void;
  applyPreset: (preset: (typeof THEME_PRESETS)[number]) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Apply theme synchronously on module load so there is no flash.
if (typeof window !== 'undefined') {
  try { applyTheme(loadTheme()); } catch {}
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeConfig>(() => loadTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // React to OS color-scheme changes when mode === 'system'
  useEffect(() => {
    if (theme.mode !== 'system' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme(theme);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, [theme]);

  const setTheme = useCallback((patch: Partial<ThemeConfig>) => {
    setThemeState((prev) => {
      const next = { ...prev, ...patch };
      saveTheme(next);
      return next;
    });
  }, []);

  const resetTheme = useCallback(() => {
    saveTheme(DEFAULT_THEME);
    setThemeState(DEFAULT_THEME);
  }, []);

  const applyPreset = useCallback((preset: (typeof THEME_PRESETS)[number]) => {
    saveTheme(preset.config);
    setThemeState(preset.config);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resetTheme, applyPreset }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Safe fallback so components don't crash if mounted outside provider
    return {
      theme: DEFAULT_THEME,
      setTheme: () => {},
      resetTheme: () => {},
      applyPreset: () => {},
    };
  }
  return ctx;
}