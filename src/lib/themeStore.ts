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
  accentColor: string;
  backgroundColor: string;
  cardColor: string;
  sidebarColor: string;
  sidebarTextColor: string;
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

export const DEFAULT_THEME: ThemeConfig = {
  sidebarPosition: 'left',
  sidebarCollapsed: false,
  sidebarWidth: 'normal',
  sidebarMode: 'full',
  sidebarStyle: 'solid',
  sidebarGradient: 'linear-gradient(180deg, #1e3a5f 0%, #0f172a 100%)',
  contentDensity: 'comfortable',
  primaryColor: '221 83% 53%',
  primaryForeground: '0 0% 100%',
  accentColor: '221 83% 53%',
  backgroundColor: '0 0% 100%',
  cardColor: '0 0% 100%',
  sidebarColor: '222 47% 11%',
  sidebarTextColor: '0 0% 100%',
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

export const THEME_PRESETS: { name: string; preview: string; config: ThemeConfig }[] = [
  { name: 'Future Link (Default)', preview: '221 83% 53%', config: DEFAULT_THEME },
  { name: 'Ocean Blue', preview: '199 89% 48%', config: { ...DEFAULT_THEME, primaryColor: '199 89% 48%', sidebarColor: '210 40% 15%' } },
  { name: 'Forest Green', preview: '142 71% 45%', config: { ...DEFAULT_THEME, primaryColor: '142 71% 45%', sidebarColor: '150 30% 12%' } },
  { name: 'Royal Purple', preview: '262 83% 58%', config: { ...DEFAULT_THEME, primaryColor: '262 83% 58%', sidebarColor: '260 30% 12%' } },
  { name: 'Sunset Orange', preview: '24 95% 53%', config: { ...DEFAULT_THEME, primaryColor: '24 95% 53%', sidebarColor: '20 40% 12%' } },
  { name: 'Rose Red', preview: '346 77% 49%', config: { ...DEFAULT_THEME, primaryColor: '346 77% 49%', sidebarColor: '340 30% 12%' } },
  { name: 'Slate Dark', preview: '215 25% 27%', config: { ...DEFAULT_THEME, primaryColor: '215 25% 55%', sidebarColor: '215 28% 17%', backgroundColor: '215 28% 12%', cardColor: '215 25% 16%', mode: 'dark' } },
  { name: 'Minimal Light', preview: '0 0% 20%', config: { ...DEFAULT_THEME, primaryColor: '0 0% 20%', sidebarColor: '0 0% 98%', sidebarTextColor: '0 0% 10%', borderRadius: 'small' } },
];

export const SIDEBAR_GRADIENTS: { name: string; value: string }[] = [
  { name: 'Navy → Black', value: 'linear-gradient(180deg, #1e3a5f 0%, #0f172a 100%)' },
  { name: 'Purple → Navy', value: 'linear-gradient(180deg, #2d1b69 0%, #0f172a 100%)' },
  { name: 'Forest', value: 'linear-gradient(180deg, #1a4731 0%, #0f1f16 100%)' },
  { name: 'Teal → Dark', value: 'linear-gradient(180deg, #0d4f4f 0%, #0a1f1f 100%)' },
  { name: 'Charcoal', value: 'linear-gradient(180deg, #2d2d2d 0%, #111111 100%)' },
  { name: 'Warm Dark', value: 'linear-gradient(180deg, #3d1f0f 0%, #1a0a00 100%)' },
];

const STORAGE_KEY = 'fl-theme-v1';
const SAVED_THEMES_KEY = 'fl-saved-themes-v1';
export const MAX_SAVED_THEMES = 5;

export interface SavedTheme {
  name: string;
  config: ThemeConfig;
  savedAt: string;
}

export function loadTheme(): ThemeConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_THEME, ...JSON.parse(raw) };
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

// ---- Color conversion helpers --------------------------------------------

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

export function applyTheme(config: ThemeConfig): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  root.style.setProperty('--primary', config.primaryColor);
  root.style.setProperty('--primary-foreground', config.primaryForeground);
  root.style.setProperty('--accent', config.accentColor);
  root.style.setProperty('--background', config.backgroundColor);
  root.style.setProperty('--card', config.cardColor);
  root.style.setProperty('--fl-sidebar-bg', config.sidebarColor);
  root.style.setProperty('--fl-sidebar-text', config.sidebarTextColor);

  // Sidebar background (solid or gradient)
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

  if (config.mode === 'dark') {
    root.classList.add('dark');
  } else if (config.mode === 'light') {
    root.classList.remove('dark');
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
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

  // Card style (solid removes attribute so default card styles apply)
  if (config.cardStyle === 'glass' || config.cardStyle === 'flat') {
    document.body.setAttribute('data-card-style', config.cardStyle);
  } else {
    document.body.removeAttribute('data-card-style');
  }

  // Sidebar active item style
  document.body.setAttribute('data-nav-style', config.navActiveStyle);
}
