export type NavSectionKey =
  | 'crm'
  | 'calendar'
  | 'performance'
  | 'incentives'
  | 'wallet'
  | 'offers'
  | 'digital'
  | 'institution'
  | 'commissions'
  | 'hr_payroll'
  | 'knowledge_centre'
  | 'guide'
  | 'accounts'
  | 'admin';

export interface ThemeConfig {
  sidebarPosition: 'left' | 'right';
  sidebarCollapsed: boolean;
  sidebarWidth: 'compact' | 'normal' | 'wide';
  sidebarMode: 'full' | 'icons-only' | 'hidden';
  sidebarStyle: 'solid' | 'gradient';
  sidebarGradient: string;
  contentDensity: 'compact' | 'comfortable' | 'spacious';
  primaryColor: string;
  primaryForeground: string;
  primaryHover: string;
  primaryGlow: string;
  accentColor: string;
  accentForeground: string;
  secondaryColor: string;
  secondaryForeground: string;
  secondaryHover: string;
  successColor: string;
  successForeground: string;
  warningColor: string;
  warningForeground: string;
  destructiveColor: string;
  destructiveForeground: string;
  mutedColor: string;
  mutedForeground: string;
  foregroundColor: string;
  borderColor: string;
  backgroundColor: string;
  cardColor: string;
  sidebarColor: string;
  sidebarTextColor: string;
  toneClients: string;
  toneClientsSoft: string;
  toneDocuments: string;
  toneDocumentsSoft: string;
  toneBinders: string;
  toneBindersSoft: string;
  toneReview: string;
  toneReviewSoft: string;
  toneInstitutions: string;
  toneInstitutionsSoft: string;
  toneAi: string;
  toneAiSoft: string;
  gradientBrand: string;
  gradientAccent: string;
  gradientSubtle: string;
  navSectionColors: Record<NavSectionKey, string>;
  colorfulMode: boolean;
  fontFamily: 'inter' | 'poppins' | 'nunito' | 'roboto' | 'outfit' | 'plus-jakarta';
  fontSize: 'small' | 'medium' | 'large';
  fontWeight: 'light' | 'normal' | 'medium';
  borderRadius: 'none' | 'small' | 'medium' | 'large' | 'full';
  buttonStyle: 'filled' | 'soft' | 'outlined';
  buttonRadius: 'none' | 'small' | 'medium' | 'large' | 'full';
  mode: 'light' | 'dark' | 'system';
  cardStyle: 'solid' | 'glass' | 'flat';
  navActiveStyle: 'pill' | 'border-left' | 'glow' | 'underline';
}

/** Future Link Consultants logo palette (#005DAA · #E31E24) */
export const FLC_BRAND = {
  blue: '205 100% 33%',
  blueHover: '205 100% 28%',
  blueGlow: '205 85% 52%',
  bluePastel: '205 70% 94%',
  red: '358 82% 50%',
  redHover: '358 82% 42%',
  redPastel: '358 88% 96%',
  navy: '205 70% 16%',
  ink: '205 35% 12%',
  bg: '205 40% 98%',
  muted: '205 35% 96%',
  border: '205 25% 91%',
  sidebarGradient: 'linear-gradient(180deg, #005DAA 0%, #003d73 52%, #001f3d 100%)',
} as const;

export const DEFAULT_NAV_SECTION_COLORS: Record<NavSectionKey, string> = {
  crm: '205 85% 45%',
  calendar: '205 70% 48%',
  performance: '205 55% 42%',
  incentives: '358 75% 52%',
  wallet: '205 60% 40%',
  offers: '358 70% 48%',
  digital: '205 75% 46%',
  institution: '205 50% 38%',
  commissions: '205 65% 44%',
  hr_payroll: '205 80% 42%',
  knowledge_centre: '205 65% 44%',
  guide: '205 45% 40%',
  accounts: '205 30% 48%',
  admin: '205 100% 38%',
};

export const DEFAULT_THEME: ThemeConfig = {
  sidebarPosition: 'left',
  sidebarCollapsed: false,
  sidebarWidth: 'normal',
  sidebarMode: 'full',
  sidebarStyle: 'gradient',
  sidebarGradient: FLC_BRAND.sidebarGradient,
  contentDensity: 'comfortable',
  primaryColor: FLC_BRAND.blue,
  primaryForeground: '0 0% 100%',
  primaryHover: FLC_BRAND.blueHover,
  primaryGlow: FLC_BRAND.blueGlow,
  accentColor: FLC_BRAND.bluePastel,
  accentForeground: FLC_BRAND.blueHover,
  secondaryColor: FLC_BRAND.red,
  secondaryForeground: '0 0% 100%',
  secondaryHover: FLC_BRAND.redHover,
  successColor: '152 55% 38%',
  successForeground: '0 0% 100%',
  warningColor: '38 92% 50%',
  warningForeground: '0 0% 100%',
  destructiveColor: FLC_BRAND.red,
  destructiveForeground: '0 0% 100%',
  mutedColor: FLC_BRAND.muted,
  mutedForeground: '205 18% 42%',
  foregroundColor: FLC_BRAND.ink,
  borderColor: FLC_BRAND.border,
  backgroundColor: FLC_BRAND.bg,
  cardColor: '0 0% 100%',
  sidebarColor: FLC_BRAND.navy,
  sidebarTextColor: '0 0% 100%',
  toneClients: '205 85% 45%',
  toneClientsSoft: '205 80% 96%',
  toneDocuments: '205 65% 48%',
  toneDocumentsSoft: '205 60% 96%',
  toneBinders: '205 50% 40%',
  toneBindersSoft: '205 45% 95%',
  toneReview: '358 75% 52%',
  toneReviewSoft: '358 88% 96%',
  toneInstitutions: '205 55% 38%',
  toneInstitutionsSoft: '205 50% 94%',
  toneAi: '205 70% 46%',
  toneAiSoft: '205 65% 96%',
  gradientBrand: 'linear-gradient(135deg, hsl(205 100% 33%), hsl(205 85% 52%))',
  gradientAccent: 'linear-gradient(135deg, hsl(205 100% 33%) 0%, hsl(358 82% 50%) 100%)',
  gradientSubtle: 'linear-gradient(180deg, hsl(0 0% 100%), hsl(205 40% 97%))',
  navSectionColors: { ...DEFAULT_NAV_SECTION_COLORS },
  colorfulMode: false,
  fontFamily: 'inter',
  fontSize: 'medium',
  fontWeight: 'normal',
  borderRadius: 'medium',
  buttonStyle: 'filled',
  buttonRadius: 'medium',
  mode: 'light',
  cardStyle: 'solid',
  navActiveStyle: 'pill',
};

const VIBRANT_FL: ThemeConfig = {
  ...DEFAULT_THEME,
  colorfulMode: true,
  navActiveStyle: 'glow',
};

const RAINBOW_CRM: ThemeConfig = {
  ...DEFAULT_THEME,
  primaryColor: '262 83% 58%',
  primaryHover: '262 83% 48%',
  primaryGlow: '280 78% 56%',
  secondaryColor: '199 89% 48%',
  sidebarStyle: 'gradient',
  sidebarGradient: 'linear-gradient(180deg, #2d1b69 0%, #0f172a 100%)',
  sidebarColor: '260 30% 12%',
  colorfulMode: true,
  navSectionColors: {
    crm: '220 85% 55%',
    calendar: '262 78% 62%',
    performance: '173 58% 45%',
    incentives: '38 92% 55%',
    wallet: '158 64% 45%',
    offers: '346 77% 55%',
    digital: '280 78% 60%',
    institution: '24 95% 58%',
    commissions: '199 89% 52%',
    guide: '170 70% 48%',
    accounts: '215 25% 60%',
    admin: '221 83% 58%',
  },
};

const SUNSET_PRO: ThemeConfig = {
  ...DEFAULT_THEME,
  primaryColor: '24 95% 53%',
  primaryHover: '24 95% 45%',
  secondaryColor: '173 80% 40%',
  accentColor: '24 95% 96%',
  sidebarColor: '20 40% 12%',
  toneInstitutions: '24 95% 53%',
  colorfulMode: true,
  gradientBrand: 'linear-gradient(135deg, hsl(24 95% 53%), hsl(173 80% 40%))',
};

const NEON_DARK: ThemeConfig = {
  ...DEFAULT_THEME,
  mode: 'dark',
  primaryColor: '218 92% 56%',
  secondaryColor: '346 77% 55%',
  backgroundColor: '222 47% 6%',
  cardColor: '222 47% 8%',
  foregroundColor: '210 40% 98%',
  mutedColor: '222 35% 14%',
  mutedForeground: '215 20% 65%',
  borderColor: '222 35% 16%',
  sidebarStyle: 'gradient',
  sidebarGradient: 'linear-gradient(180deg, #1a1a2e 0%, #0a0a0f 100%)',
  colorfulMode: true,
};

export const THEME_PRESETS: { name: string; preview: string; config: ThemeConfig }[] = [
  { name: 'Future Link Premium', preview: '205 100% 33%', config: DEFAULT_THEME },
  { name: 'Future Link Vibrant', preview: '358 82% 50%', config: VIBRANT_FL },
  { name: 'Rainbow CRM', preview: '262 83% 58%', config: RAINBOW_CRM },
  { name: 'Sunset Professional', preview: '24 95% 53%', config: SUNSET_PRO },
  { name: 'Neon Dark', preview: '218 92% 56%', config: NEON_DARK },
  { name: 'Ocean Blue', preview: '199 89% 48%', config: { ...DEFAULT_THEME, primaryColor: '199 89% 48%', sidebarColor: '210 40% 15%' } },
  { name: 'Forest Green', preview: '142 71% 45%', config: { ...DEFAULT_THEME, primaryColor: '142 71% 45%', sidebarColor: '150 30% 12%' } },
  { name: 'Royal Purple', preview: '262 83% 58%', config: { ...DEFAULT_THEME, primaryColor: '262 83% 58%', sidebarColor: '260 30% 12%' } },
  { name: 'Sunset Orange', preview: '24 95% 53%', config: { ...DEFAULT_THEME, primaryColor: '24 95% 53%', sidebarColor: '20 40% 12%' } },
  { name: 'Rose Red', preview: '346 77% 49%', config: { ...DEFAULT_THEME, primaryColor: '346 77% 49%', sidebarColor: '340 30% 12%' } },
  { name: 'Slate Dark', preview: '215 25% 27%', config: { ...NEON_DARK, primaryColor: '215 25% 55%', sidebarGradient: 'linear-gradient(180deg, #2d3748 0%, #111111 100%)' } },
  { name: 'Minimal Light', preview: '0 0% 20%', config: { ...DEFAULT_THEME, primaryColor: '0 0% 20%', sidebarColor: '0 0% 98%', sidebarTextColor: '0 0% 10%', borderRadius: 'small' } },
];

export const SIDEBAR_GRADIENTS: { name: string; value: string }[] = [
  { name: 'FLC Blue → Navy', value: FLC_BRAND.sidebarGradient },
  { name: 'FLC Blue → Red accent', value: 'linear-gradient(180deg, #005DAA 0%, #003d73 70%, #5c1018 100%)' },
  { name: 'Navy → Black', value: 'linear-gradient(180deg, #1e3a5f 0%, #0f172a 100%)' },
  { name: 'Purple → Navy', value: 'linear-gradient(180deg, #2d1b69 0%, #0f172a 100%)' },
  { name: 'Forest', value: 'linear-gradient(180deg, #1a4731 0%, #0f1f16 100%)' },
  { name: 'Teal → Dark', value: 'linear-gradient(180deg, #0d4f4f 0%, #0a1f1f 100%)' },
  { name: 'Charcoal', value: 'linear-gradient(180deg, #2d2d2d 0%, #111111 100%)' },
  { name: 'Warm Dark', value: 'linear-gradient(180deg, #3d1f0f 0%, #1a0a00 100%)' },
  { name: 'Sunset', value: 'linear-gradient(180deg, #7c2d12 0%, #1a0a00 100%)' },
  { name: 'Aurora', value: 'linear-gradient(180deg, #312e81 0%, #0f172a 50%, #134e4a 100%)' },
];

const STORAGE_KEY = 'fl-theme-v2';
const STORAGE_KEY_V1 = 'fl-theme-v1';
export const THEME_PREFERENCE_KEY = 'fl-theme-preference';
const SAVED_THEMES_KEY = 'fl-saved-themes-v1';
export const MAX_SAVED_THEMES = 5;

export type ThemePreference = 'org' | 'custom';

export interface SavedTheme {
  name: string;
  config: ThemeConfig;
  savedAt: string;
}

export function normalizeTheme(partial: Partial<ThemeConfig>): ThemeConfig {
  return {
    ...DEFAULT_THEME,
    ...partial,
    navSectionColors: {
      ...DEFAULT_NAV_SECTION_COLORS,
      ...(partial.navSectionColors ?? {}),
    },
  };
}

export function loadThemePreference(): ThemePreference {
  try {
    const p = localStorage.getItem(THEME_PREFERENCE_KEY);
    if (p === 'org' || p === 'custom') return p;
  } catch {}
  return 'org';
}

export function saveThemePreference(pref: ThemePreference): void {
  try { localStorage.setItem(THEME_PREFERENCE_KEY, pref); } catch {}
}

export function loadTheme(): ThemeConfig {
  try {
    const v2 = localStorage.getItem(STORAGE_KEY);
    if (v2) return normalizeTheme(JSON.parse(v2));
    const v1 = localStorage.getItem(STORAGE_KEY_V1);
    if (v1) {
      const merged = normalizeTheme(JSON.parse(v1));
      saveTheme(merged);
      return merged;
    }
  } catch {}
  return DEFAULT_THEME;
}

export function saveTheme(config: ThemeConfig): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch {}
}

export function loadSavedThemes(): SavedTheme[] {
  try {
    const raw = localStorage.getItem(SAVED_THEMES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function persistSavedThemes(list: SavedTheme[]): void {
  try { localStorage.setItem(SAVED_THEMES_KEY, JSON.stringify(list.slice(0, MAX_SAVED_THEMES))); } catch {}
}

export function hexToHsl(hex: string): string {
  const m = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return '0 0% 0%';
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

export function hslToHex(hsl: string): string {
  const parts = hsl.trim().split(/\s+/);
  const h = (parseFloat(parts[0]) || 0) / 360;
  const s = (parseFloat(parts[1]) || 0) / 100;
  const l = (parseFloat(parts[2]) || 0) / 100;
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

/** Relative luminance contrast ratio (simplified WCAG). */
export function contrastRatio(hslFg: string, hslBg: string): number {
  const lum = (hsl: string) => {
    const l = (parseFloat(hsl.split(/\s+/)[2]) || 0) / 100;
    return l;
  };
  const l1 = lum(hslFg) + 0.05;
  const l2 = lum(hslBg) + 0.05;
  return l1 > l2 ? l1 / l2 : l2 / l1;
}

const FONT_MAP: Record<ThemeConfig['fontFamily'], string> = {
  inter: "'Inter', sans-serif",
  poppins: "'Poppins', sans-serif",
  nunito: "'Nunito', sans-serif",
  roboto: "'Roboto', sans-serif",
  outfit: "'Outfit', sans-serif",
  'plus-jakarta': "'Plus Jakarta Sans', sans-serif",
};

const GOOGLE_FONT_URLS: Record<ThemeConfig['fontFamily'], string | null> = {
  inter: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  poppins: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
  nunito: 'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700&display=swap',
  roboto: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap',
  outfit: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap',
  'plus-jakarta': 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap',
};

export function ensureFontLoaded(family: ThemeConfig['fontFamily']): void {
  if (typeof document === 'undefined') return;
  const url = GOOGLE_FONT_URLS[family];
  if (!url) return;
  const id = `fl-font-${family}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}

export function resolveThemeModeDark(mode: ThemeConfig['mode']): boolean {
  if (typeof window === 'undefined') return mode === 'dark';
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyTheme(config: ThemeConfig): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  root.style.setProperty('--primary', config.primaryColor);
  root.style.setProperty('--primary-foreground', config.primaryForeground);
  root.style.setProperty('--primary-hover', config.primaryHover);
  root.style.setProperty('--primary-glow', config.primaryGlow);
  root.style.setProperty('--secondary', config.secondaryColor);
  root.style.setProperty('--secondary-foreground', config.secondaryForeground);
  root.style.setProperty('--secondary-hover', config.secondaryHover);
  root.style.setProperty('--success', config.successColor);
  root.style.setProperty('--success-foreground', config.successForeground);
  root.style.setProperty('--warning', config.warningColor);
  root.style.setProperty('--warning-foreground', config.warningForeground);
  root.style.setProperty('--destructive', config.destructiveColor);
  root.style.setProperty('--destructive-foreground', config.destructiveForeground);
  root.style.setProperty('--muted', config.mutedColor);
  root.style.setProperty('--muted-foreground', config.mutedForeground);
  root.style.setProperty('--foreground', config.foregroundColor);
  root.style.setProperty('--border', config.borderColor);
  root.style.setProperty('--input', config.borderColor);
  root.style.setProperty('--ring', config.primaryColor);
  root.style.setProperty('--accent', config.accentColor);
  root.style.setProperty('--accent-foreground', config.accentForeground);
  root.style.setProperty('--background', config.backgroundColor);
  root.style.setProperty('--card', config.cardColor);
  root.style.setProperty('--card-foreground', config.foregroundColor);
  root.style.setProperty('--popover', config.cardColor);
  root.style.setProperty('--popover-foreground', config.foregroundColor);

  root.style.setProperty('--tone-clients', config.toneClients);
  root.style.setProperty('--tone-clients-soft', config.toneClientsSoft);
  root.style.setProperty('--tone-documents', config.toneDocuments);
  root.style.setProperty('--tone-documents-soft', config.toneDocumentsSoft);
  root.style.setProperty('--tone-binders', config.toneBinders);
  root.style.setProperty('--tone-binders-soft', config.toneBindersSoft);
  root.style.setProperty('--tone-review', config.toneReview);
  root.style.setProperty('--tone-review-soft', config.toneReviewSoft);
  root.style.setProperty('--tone-institutions', config.toneInstitutions);
  root.style.setProperty('--tone-institutions-soft', config.toneInstitutionsSoft);
  root.style.setProperty('--tone-ai', config.toneAi);
  root.style.setProperty('--tone-ai-soft', config.toneAiSoft);

  root.style.setProperty('--gradient-brand', config.gradientBrand);
  root.style.setProperty('--gradient-accent', config.gradientAccent);
  root.style.setProperty('--gradient-subtle', config.gradientSubtle);

  root.style.setProperty('--fl-sidebar-bg', config.sidebarColor);
  root.style.setProperty('--fl-sidebar-text', config.sidebarTextColor);
  root.style.setProperty('--sidebar-background', config.sidebarColor);
  const primaryHue = parseFloat(config.primaryColor.split(/\s+/)[0]) || 205;
  root.style.setProperty('--sidebar-foreground', `${primaryHue} 25% 88%`);
  root.style.setProperty('--sidebar-primary', config.primaryGlow);
  root.style.setProperty('--sidebar-primary-foreground', config.primaryForeground);
  root.style.setProperty('--sidebar-accent', `${primaryHue} 45% 22%`);
  root.style.setProperty('--sidebar-accent-foreground', config.sidebarTextColor);
  root.style.setProperty('--sidebar-border', `${primaryHue} 40% 24%`);
  root.style.setProperty('--sidebar-ring', config.primaryGlow);

  for (const [key, color] of Object.entries(config.navSectionColors)) {
    root.style.setProperty(`--nav-section-${key}`, color);
  }

  if (config.sidebarStyle === 'gradient') {
    root.style.setProperty('--fl-sidebar-gradient', config.sidebarGradient);
    root.style.setProperty('--fl-sidebar-background', config.sidebarGradient);
  } else {
    root.style.setProperty('--fl-sidebar-gradient', 'none');
    root.style.setProperty('--fl-sidebar-background', `hsl(${config.sidebarColor})`);
  }

  const radiusMap = { none: '0px', small: '4px', medium: '8px', large: '12px', full: '9999px' } as const;
  root.style.setProperty('--radius', radiusMap[config.borderRadius]);
  root.style.setProperty('--fl-button-radius', radiusMap[config.buttonRadius]);

  const fontSizeMap = { small: '13px', medium: '14px', large: '16px' } as const;
  root.style.setProperty('--fl-font-size', fontSizeMap[config.fontSize]);

  const weightMap = { light: '300', normal: '400', medium: '500' } as const;
  root.style.setProperty('--fl-font-weight', weightMap[config.fontWeight]);

  ensureFontLoaded(config.fontFamily);
  const fontStack = FONT_MAP[config.fontFamily];
  root.style.setProperty('--fl-font-family', fontStack);
  document.body.style.fontFamily = fontStack;
  document.body.style.fontSize = fontSizeMap[config.fontSize];

  const isDark = resolveThemeModeDark(config.mode);
  if (isDark) {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  }

  const densityMap = { compact: '0.5rem', comfortable: '1rem', spacious: '1.5rem' } as const;
  root.style.setProperty('--fl-spacing', densityMap[config.contentDensity]);

  const sidebarWidthMap = { compact: '14rem', normal: '16rem', wide: '18rem' } as const;
  const effectiveWidth =
    config.sidebarMode === 'icons-only' ? '3.5rem'
    : config.sidebarMode === 'hidden' ? '0rem'
    : sidebarWidthMap[config.sidebarWidth];
  root.style.setProperty('--fl-sidebar-width', effectiveWidth);

  root.setAttribute('data-fl-sidebar-position', config.sidebarPosition);
  root.setAttribute('data-fl-sidebar-mode', config.sidebarMode);
  root.setAttribute('data-fl-button-style', config.buttonStyle);
  root.setAttribute('data-fl-colorful', config.colorfulMode ? 'true' : 'false');

  if (config.cardStyle === 'glass' || config.cardStyle === 'flat') {
    document.body.setAttribute('data-card-style', config.cardStyle);
  } else {
    document.body.removeAttribute('data-card-style');
  }

  document.body.setAttribute('data-nav-style', config.navActiveStyle);
}

export function exportThemeJson(config: ThemeConfig): string {
  return JSON.stringify(config, null, 2);
}

export function importThemeJson(raw: string): ThemeConfig {
  return normalizeTheme(JSON.parse(raw) as Partial<ThemeConfig>);
}
