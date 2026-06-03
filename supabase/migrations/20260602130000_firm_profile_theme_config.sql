-- Organization-wide CRM theme default (admin-managed in Settings)
ALTER TABLE public.firm_profile
  ADD COLUMN IF NOT EXISTS theme_config jsonb;
