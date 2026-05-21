CREATE TABLE public.dsh_brand_assets (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('logo','reference')),
  title text not null,
  tags text[] not null default '{}',
  storage_path text not null,
  institution_id uuid,
  country text,
  is_default_brand boolean not null default false,
  uploaded_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE INDEX dsh_brand_assets_kind_idx ON public.dsh_brand_assets(kind);
CREATE UNIQUE INDEX dsh_brand_assets_one_default_logo ON public.dsh_brand_assets(is_default_brand) WHERE is_default_brand = true AND kind = 'logo';

ALTER TABLE public.dsh_brand_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read brand assets"
  ON public.dsh_brand_assets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert brand assets"
  ON public.dsh_brand_assets FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Owner or admin can update brand assets"
  ON public.dsh_brand_assets FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Owner or admin can delete brand assets"
  ON public.dsh_brand_assets FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_dsh_brand_assets_touch
  BEFORE UPDATE ON public.dsh_brand_assets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();