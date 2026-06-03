import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import {
  ThemeConfig,
  DEFAULT_THEME,
  THEME_PRESETS,
  loadTheme,
  saveTheme,
  applyTheme,
  loadThemePreference,
  saveThemePreference,
  normalizeTheme,
  type ThemePreference,
} from '@/lib/themeStore';
import { fetchOrgTheme } from '@/lib/orgTheme';

export interface ThemeContextValue {
  theme: ThemeConfig;
  orgTheme: ThemeConfig | null;
  preference: ThemePreference;
  setTheme: (patch: Partial<ThemeConfig>) => void;
  setFullTheme: (config: ThemeConfig) => void;
  resetTheme: () => void;
  applyPreset: (preset: (typeof THEME_PRESETS)[number]) => void;
  useOrgTheme: () => void;
  usePersonalTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

if (typeof window !== 'undefined') {
  try {
    const pref = loadThemePreference();
    applyTheme(pref === 'custom' ? loadTheme() : DEFAULT_THEME);
  } catch {}
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [orgTheme, setOrgTheme] = useState<ThemeConfig | null>(null);
  const [preference, setPreference] = useState<ThemePreference>(() => loadThemePreference());
  const [theme, setThemeState] = useState<ThemeConfig>(() => {
    if (loadThemePreference() === 'custom') return loadTheme();
    return DEFAULT_THEME;
  });

  useEffect(() => {
    let cancelled = false;
    fetchOrgTheme()
      .then((org) => {
        if (cancelled) return;
        setOrgTheme(org);
        const pref = loadThemePreference();
        if (pref === 'org') {
          const next = org ?? DEFAULT_THEME;
          setThemeState(next);
          applyTheme(next);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (theme.mode !== 'system' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme(theme);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, [theme]);

  const setFullTheme = useCallback((config: ThemeConfig) => {
    const next = normalizeTheme(config);
    saveTheme(next);
    saveThemePreference('custom');
    setPreference('custom');
    setThemeState(next);
  }, []);

  const setTheme = useCallback((patch: Partial<ThemeConfig>) => {
    setThemeState((prev) => {
      const next = normalizeTheme({ ...prev, ...patch });
      saveTheme(next);
      saveThemePreference('custom');
      setPreference('custom');
      return next;
    });
  }, []);

  const resetTheme = useCallback(() => {
    const next = orgTheme ?? DEFAULT_THEME;
    saveThemePreference('org');
    setPreference('org');
    setThemeState(next);
    applyTheme(next);
  }, [orgTheme]);

  const applyPreset = useCallback((preset: (typeof THEME_PRESETS)[number]) => {
    const next = normalizeTheme(preset.config);
    saveTheme(next);
    saveThemePreference('custom');
    setPreference('custom');
    setThemeState(next);
  }, []);

  const useOrgTheme = useCallback(() => {
    const next = orgTheme ?? DEFAULT_THEME;
    saveThemePreference('org');
    setPreference('org');
    setThemeState(next);
    applyTheme(next);
  }, [orgTheme]);

  const usePersonalTheme = useCallback(() => {
    const next = loadTheme();
    saveThemePreference('custom');
    setPreference('custom');
    setThemeState(next);
    applyTheme(next);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        orgTheme,
        preference,
        setTheme,
        setFullTheme,
        resetTheme,
        applyPreset,
        useOrgTheme,
        usePersonalTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: DEFAULT_THEME,
      orgTheme: null,
      preference: 'org',
      setTheme: () => {},
      setFullTheme: () => {},
      resetTheme: () => {},
      applyPreset: () => {},
      useOrgTheme: () => {},
      usePersonalTheme: () => {},
    };
  }
  return ctx;
}
