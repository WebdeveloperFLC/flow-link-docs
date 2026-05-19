
CREATE TABLE public.accounting_user_entity_scope (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accounting_user_id uuid NOT NULL REFERENCES public.accounting_users(id) ON DELETE CASCADE,
  scope_type text NOT NULL CHECK (scope_type IN ('country','entity')),
  country_code text,
  entity_id uuid REFERENCES public.accounting_entities(id) ON DELETE CASCADE,
  can_view boolean NOT NULL DEFAULT true,
  can_edit boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounting_user_entity_scope_shape CHECK (
    (scope_type = 'country' AND country_code IS NOT NULL AND entity_id IS NULL)
    OR
    (scope_type = 'entity' AND entity_id IS NOT NULL AND country_code IS NULL)
  )
);

CREATE UNIQUE INDEX accounting_user_entity_scope_uniq
  ON public.accounting_user_entity_scope (
    accounting_user_id,
    scope_type,
    COALESCE(country_code, ''),
    COALESCE(entity_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

CREATE INDEX accounting_user_entity_scope_user_idx
  ON public.accounting_user_entity_scope (accounting_user_id);

ALTER TABLE public.accounting_user_entity_scope ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accounting users can view scope rows"
  ON public.accounting_user_entity_scope
  FOR SELECT
  USING (public.is_accounting_user(auth.uid()));

CREATE POLICY "Accounting admins can insert scope rows"
  ON public.accounting_user_entity_scope
  FOR INSERT
  WITH CHECK (public.is_accounting_admin(auth.uid()));

CREATE POLICY "Accounting admins can update scope rows"
  ON public.accounting_user_entity_scope
  FOR UPDATE
  USING (public.is_accounting_admin(auth.uid()))
  WITH CHECK (public.is_accounting_admin(auth.uid()));

CREATE POLICY "Accounting admins can delete scope rows"
  ON public.accounting_user_entity_scope
  FOR DELETE
  USING (public.is_accounting_admin(auth.uid()));

-- Seed Balveer with India-only access
INSERT INTO public.accounting_user_entity_scope
  (accounting_user_id, scope_type, country_code, can_view, can_edit)
SELECT id, 'country', 'IN', true, true
FROM public.accounting_users
WHERE email = 'accounts@futurelinkconsultants.ca'
ON CONFLICT DO NOTHING;
