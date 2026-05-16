export interface ThemeConfig {
  sidebarPosition: 'left' | 'right';
  sidebarCollapsed: boolean;
  sidebarWidth: 'compact' | 'normal' | 'wide';
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
}

export const DEFAULT_THEME: ThemeConfig = {
  sidebarPosition: 'left',
  sidebarCollapsed: false,
  sidebarWidth: 'normal',
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

const STORAGE_KEY = 'fl-theme-v1';

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
  root.style.setProperty('--fl-sidebar-width', sidebarWidthMap[config.sidebarWidth]);

  root.setAttribute('data-fl-sidebar-position', config.sidebarPosition);
  root.setAttribute('data-fl-button-style', config.buttonStyle);
}