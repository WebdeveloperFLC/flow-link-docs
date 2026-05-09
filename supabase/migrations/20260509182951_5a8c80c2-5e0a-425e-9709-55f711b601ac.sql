
-- ===== Client Portal Invitations =====
CREATE TABLE public.client_portal_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  invited_by uuid,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  used_at timestamptz,
  used_by uuid,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cpi_client ON public.client_portal_invites(client_id);
CREATE INDEX idx_cpi_token ON public.client_portal_invites(token);
ALTER TABLE public.client_portal_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invite_view" ON public.client_portal_invites FOR SELECT TO authenticated
USING (public.can_view_client(auth.uid(), client_id));
CREATE POLICY "invite_insert" ON public.client_portal_invites FOR INSERT TO authenticated
WITH CHECK (public.can_edit_client(auth.uid(), client_id) AND invited_by = auth.uid());
CREATE POLICY "invite_update" ON public.client_portal_invites FOR UPDATE TO authenticated
USING (invited_by = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

-- ===== Offer Groups =====
CREATE TABLE public.offer_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.offer_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ogroups_admin" ON public.offer_groups FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "ogroups_view" ON public.offer_groups FOR SELECT TO authenticated USING (true);

CREATE TABLE public.offer_group_members (
  group_id uuid NOT NULL REFERENCES public.offer_groups(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, client_id)
);
ALTER TABLE public.offer_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ogm_admin" ON public.offer_group_members FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "ogm_view" ON public.offer_group_members FOR SELECT TO authenticated USING (true);

-- ===== Extend offers with audience targeting =====
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'global'
  CHECK (audience IN ('global','group','individual'));

CREATE TABLE public.offer_audience_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.offer_groups(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  CHECK ((group_id IS NOT NULL) OR (client_id IS NOT NULL))
);
CREATE INDEX idx_oat_offer ON public.offer_audience_targets(offer_id);
ALTER TABLE public.offer_audience_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "oat_admin" ON public.offer_audience_targets FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "oat_view" ON public.offer_audience_targets FOR SELECT TO authenticated USING (true);

-- Function: can a portal user see this offer?
CREATE OR REPLACE FUNCTION public.user_can_see_offer(_uid uuid, _offer_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.offers o
     WHERE o.id = _offer_id
       AND o.is_active
       AND (o.valid_from IS NULL OR o.valid_from <= now())
       AND (o.valid_to IS NULL OR o.valid_to >= now())
       AND (
         o.audience = 'global'
         OR (o.audience = 'individual' AND EXISTS (
           SELECT 1 FROM public.offer_audience_targets t
            JOIN public.client_portal_links l ON l.client_id = t.client_id
           WHERE t.offer_id = o.id AND l.user_id = _uid
         ))
         OR (o.audience = 'group' AND EXISTS (
           SELECT 1 FROM public.offer_audience_targets t
            JOIN public.offer_group_members m ON m.group_id = t.group_id
            JOIN public.client_portal_links l ON l.client_id = m.client_id
           WHERE t.offer_id = o.id AND l.user_id = _uid
         ))
       )
  )
$$;

-- ===== Notification Preferences =====
CREATE TABLE public.client_notification_prefs (
  client_id uuid PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  email_status_updates boolean NOT NULL DEFAULT true,
  email_documents boolean NOT NULL DEFAULT true,
  email_payments boolean NOT NULL DEFAULT true,
  email_messages boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_cnp_updated BEFORE UPDATE ON public.client_notification_prefs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
ALTER TABLE public.client_notification_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cnp_rw" ON public.client_notification_prefs FOR ALL TO authenticated
USING (public.is_portal_user_for(auth.uid(), client_id) OR public.has_role(auth.uid(),'admin'::app_role) OR public.can_edit_client(auth.uid(), client_id))
WITH CHECK (public.is_portal_user_for(auth.uid(), client_id) OR public.has_role(auth.uid(),'admin'::app_role) OR public.can_edit_client(auth.uid(), client_id));

-- ===== Notify trigger on client status change =====
CREATE OR REPLACE FUNCTION public.fn_notify_client_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.status,'') <> COALESCE(NEW.status,'') THEN
    INSERT INTO public.client_notifications (client_id, type, title, body, link)
    VALUES (NEW.id, 'status_update', 'Application status updated',
      'Your status changed to: ' || COALESCE(NEW.status,'(none)'), '/portal');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_client_status ON public.clients;
CREATE TRIGGER trg_notify_client_status
AFTER UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_client_status_change();
