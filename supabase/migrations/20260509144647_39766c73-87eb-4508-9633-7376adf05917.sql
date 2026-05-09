
-- 1. client_portal_links FIRST so functions can reference it
CREATE TABLE public.client_portal_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  relation text NOT NULL DEFAULT 'self',
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id)
);
ALTER TABLE public.client_portal_links ENABLE ROW LEVEL SECURITY;

-- 2. Helper
CREATE OR REPLACE FUNCTION public.is_portal_user_for(_uid uuid, _cid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_portal_links
    WHERE user_id = _uid AND client_id = _cid
  )
$$;

CREATE POLICY "portal_links_self_select" ON public.client_portal_links
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "portal_links_admin_write" ON public.client_portal_links
  FOR ALL USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'counselor'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'counselor'::app_role));

-- 3. client_files
CREATE TABLE public.client_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text,
  file_path text,
  status text NOT NULL DEFAULT 'not_uploaded' CHECK (status IN ('verified','pending','action_required','rejected','not_uploaded')),
  remarks text,
  version int NOT NULL DEFAULT 1,
  uploaded_by uuid,
  uploaded_at timestamptz,
  verified_by uuid,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_client_files_client ON public.client_files(client_id);
ALTER TABLE public.client_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cf_view" ON public.client_files FOR SELECT
  USING (public.is_portal_user_for(auth.uid(), client_id) OR public.can_view_client(auth.uid(), client_id));
CREATE POLICY "cf_insert" ON public.client_files FOR INSERT
  WITH CHECK (public.is_portal_user_for(auth.uid(), client_id) OR public.can_upload_client(auth.uid(), client_id));
CREATE POLICY "cf_update" ON public.client_files FOR UPDATE
  USING (public.is_portal_user_for(auth.uid(), client_id) OR public.can_edit_client(auth.uid(), client_id));
CREATE POLICY "cf_delete" ON public.client_files FOR DELETE
  USING (public.can_edit_client(auth.uid(), client_id));
CREATE TRIGGER trg_cf_touch BEFORE UPDATE ON public.client_files
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. offers (master)
CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage','flat')),
  discount_value numeric NOT NULL DEFAULT 0,
  max_discount_amount numeric,
  promo_code text UNIQUE,
  valid_from timestamptz,
  valid_to timestamptz,
  applicable_services text[] DEFAULT '{}',
  terms_conditions text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offers_select" ON public.offers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "offers_admin" ON public.offers FOR ALL
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_offers_touch BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5. client_offers
CREATE TABLE public.client_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','used','expired')),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, offer_id)
);
ALTER TABLE public.client_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co_view" ON public.client_offers FOR SELECT
  USING (public.is_portal_user_for(auth.uid(), client_id) OR public.can_view_client(auth.uid(), client_id));
CREATE POLICY "co_write" ON public.client_offers FOR ALL
  USING (public.can_edit_client(auth.uid(), client_id))
  WITH CHECK (public.can_edit_client(auth.uid(), client_id));

-- 6. referrals
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  friend_name text,
  friend_email text,
  friend_phone text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('joined','pending','invalid')),
  points_earned int NOT NULL DEFAULT 0,
  joined_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ref_view" ON public.referrals FOR SELECT
  USING (public.is_portal_user_for(auth.uid(), referrer_client_id) OR public.can_view_client(auth.uid(), referrer_client_id));
CREATE POLICY "ref_insert" ON public.referrals FOR INSERT
  WITH CHECK (public.is_portal_user_for(auth.uid(), referrer_client_id) OR public.can_edit_client(auth.uid(), referrer_client_id));
CREATE POLICY "ref_update" ON public.referrals FOR UPDATE
  USING (public.can_edit_client(auth.uid(), referrer_client_id));

-- 7. credit_wallet
CREATE TABLE public.credit_wallet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  total_points numeric NOT NULL DEFAULT 0,
  available_points numeric NOT NULL DEFAULT 0,
  points_value_rate numeric NOT NULL DEFAULT 1.0,
  last_updated timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_wallet ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cw_view" ON public.credit_wallet FOR SELECT
  USING (public.is_portal_user_for(auth.uid(), client_id) OR public.can_view_client(auth.uid(), client_id));
CREATE POLICY "cw_write" ON public.credit_wallet FOR ALL
  USING (public.can_edit_client(auth.uid(), client_id))
  WITH CHECK (public.can_edit_client(auth.uid(), client_id));

-- 8. point_transactions
CREATE TABLE public.point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('earned','redeemed','expired','adjusted')),
  points numeric NOT NULL,
  points_value_rate numeric NOT NULL DEFAULT 1.0,
  description text,
  reference_id uuid,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pt_client ON public.point_transactions(client_id);
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pt_view" ON public.point_transactions FOR SELECT
  USING (public.is_portal_user_for(auth.uid(), client_id) OR public.can_view_client(auth.uid(), client_id));
CREATE POLICY "pt_write" ON public.point_transactions FOR ALL
  USING (public.can_edit_client(auth.uid(), client_id))
  WITH CHECK (public.can_edit_client(auth.uid(), client_id));

-- 9. point_redemptions
CREATE TABLE public.point_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  points_redeemed numeric NOT NULL,
  usd_value numeric NOT NULL,
  service_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.point_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pr_view" ON public.point_redemptions FOR SELECT
  USING (public.is_portal_user_for(auth.uid(), client_id) OR public.can_view_client(auth.uid(), client_id));
CREATE POLICY "pr_insert" ON public.point_redemptions FOR INSERT
  WITH CHECK (public.is_portal_user_for(auth.uid(), client_id) OR public.can_edit_client(auth.uid(), client_id));
CREATE POLICY "pr_update" ON public.point_redemptions FOR UPDATE
  USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE FUNCTION public.validate_redemption()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.points_redeemed < 50 THEN RAISE EXCEPTION 'Minimum redemption is 50 points'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validate_redemp BEFORE INSERT ON public.point_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.validate_redemption();

-- 10. client_appointments
CREATE TABLE public.client_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_min int NOT NULL DEFAULT 30,
  mode text NOT NULL DEFAULT 'video' CHECK (mode IN ('in_person','video','phone')),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','confirmed','completed','cancelled')),
  with_user_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ca_view" ON public.client_appointments FOR SELECT
  USING (public.is_portal_user_for(auth.uid(), client_id) OR public.can_view_client(auth.uid(), client_id));
CREATE POLICY "ca_insert" ON public.client_appointments FOR INSERT
  WITH CHECK (public.is_portal_user_for(auth.uid(), client_id) OR public.can_edit_client(auth.uid(), client_id));
CREATE POLICY "ca_update" ON public.client_appointments FOR UPDATE
  USING (public.can_edit_client(auth.uid(), client_id));
CREATE TRIGGER trg_ca_touch BEFORE UPDATE ON public.client_appointments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 11. client_invoices
CREATE TABLE public.client_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  invoice_number text NOT NULL UNIQUE,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue','cancelled')),
  due_date date,
  paid_at timestamptz,
  points_redeemed numeric NOT NULL DEFAULT 0,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ci_view" ON public.client_invoices FOR SELECT
  USING (public.is_portal_user_for(auth.uid(), client_id) OR public.can_view_client(auth.uid(), client_id));
CREATE POLICY "ci_write" ON public.client_invoices FOR ALL
  USING (public.can_edit_client(auth.uid(), client_id))
  WITH CHECK (public.can_edit_client(auth.uid(), client_id));
CREATE TRIGGER trg_ci_touch BEFORE UPDATE ON public.client_invoices
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 12. client_notifications
CREATE TABLE public.client_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cn_client ON public.client_notifications(client_id);
ALTER TABLE public.client_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cn_view" ON public.client_notifications FOR SELECT
  USING (public.is_portal_user_for(auth.uid(), client_id) OR public.can_view_client(auth.uid(), client_id));
CREATE POLICY "cn_update" ON public.client_notifications FOR UPDATE
  USING (public.is_portal_user_for(auth.uid(), client_id) OR public.can_edit_client(auth.uid(), client_id));
CREATE POLICY "cn_insert" ON public.client_notifications FOR INSERT
  WITH CHECK (public.can_edit_client(auth.uid(), client_id));

-- 13. Auto-create wallet on link
CREATE OR REPLACE FUNCTION public.fn_create_wallet_on_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.credit_wallet (client_id) VALUES (NEW.client_id) ON CONFLICT (client_id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_wallet_on_link AFTER INSERT ON public.client_portal_links
  FOR EACH ROW EXECUTE FUNCTION public.fn_create_wallet_on_link();

-- 14. Wallet recompute
CREATE OR REPLACE FUNCTION public.fn_recompute_wallet()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid;
BEGIN
  cid := COALESCE(NEW.client_id, OLD.client_id);
  INSERT INTO public.credit_wallet (client_id) VALUES (cid) ON CONFLICT (client_id) DO NOTHING;
  UPDATE public.credit_wallet w SET
    total_points = COALESCE((SELECT SUM(CASE WHEN type='earned' THEN points ELSE 0 END) FROM public.point_transactions WHERE client_id=cid),0),
    available_points = COALESCE((SELECT SUM(CASE
      WHEN type='earned' AND (expires_at IS NULL OR expires_at > now()) THEN points
      WHEN type IN ('redeemed','expired') THEN -points
      WHEN type='adjusted' THEN points ELSE 0 END) FROM public.point_transactions WHERE client_id=cid),0),
    last_updated = now()
  WHERE w.client_id = cid;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_recompute_wallet AFTER INSERT OR UPDATE OR DELETE ON public.point_transactions
  FOR EACH ROW EXECUTE FUNCTION public.fn_recompute_wallet();

-- 15. File status notification
CREATE OR REPLACE FUNCTION public.fn_notify_file_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.status,'') <> COALESCE(NEW.status,'') THEN
    INSERT INTO public.client_notifications (client_id, type, title, body, link)
    VALUES (NEW.client_id, 'file_status',
      'Document ' || NEW.status, NEW.document_type || ': ' || NEW.status, '/portal/files');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_file_status AFTER UPDATE ON public.client_files
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_file_status();

-- 16. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_notifications;

-- 17. handle_new_user respects signup_role metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  any_admin boolean;
  signup_role text := COALESCE(new.raw_user_meta_data->>'signup_role','');
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email)
  on conflict (id) do nothing;

  if signup_role = 'client' then
    insert into public.user_roles (user_id, role) values (new.id, 'client'::app_role)
      on conflict do nothing;
    return new;
  end if;

  select exists(select 1 from public.user_roles where role='admin'::app_role) into any_admin;
  if not any_admin then
    insert into public.user_roles (user_id, role) values (new.id, 'admin'::app_role)
      on conflict do nothing;
  else
    insert into public.user_roles (user_id, role) values (new.id, 'viewer'::app_role)
      on conflict do nothing;
  end if;
  return new;
end;
$$;
