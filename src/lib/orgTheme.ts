import { supabase } from '@/integrations/supabase/client';
import { normalizeTheme, type ThemeConfig } from '@/lib/themeStore';

export async function fetchOrgTheme(): Promise<ThemeConfig | null> {
  const { data, error } = await supabase
    .from('firm_profile')
    .select('theme_config')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const raw = data?.theme_config;
  if (!raw || typeof raw !== 'object') return null;
  return normalizeTheme(raw as Partial<ThemeConfig>);
}

export async function saveOrgTheme(config: ThemeConfig): Promise<void> {
  const { data: row } = await supabase.from('firm_profile').select('id').limit(1).maybeSingle();
  if (!row?.id) throw new Error('No firm profile found. Create firm profile first.');
  const { error } = await supabase
    .from('firm_profile')
    .update({ theme_config: config })
    .eq('id', row.id);
  if (error) throw error;
}
