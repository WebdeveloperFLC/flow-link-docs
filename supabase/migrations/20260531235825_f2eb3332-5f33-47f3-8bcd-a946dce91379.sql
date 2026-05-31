
ALTER TABLE public.service_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_library_fee_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_library_attachments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_library TO authenticated;
GRANT ALL ON public.service_library TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_library_fee_items TO authenticated;
GRANT ALL ON public.service_library_fee_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_library_attachments TO authenticated;
GRANT ALL ON public.service_library_attachments TO service_role;

CREATE OR REPLACE FUNCTION public.can_manage_service_library(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','administrator','documentation')
  )
$$;

CREATE POLICY "sl view auth" ON public.service_library FOR SELECT TO authenticated USING (true);
CREATE POLICY "sl insert manage" ON public.service_library FOR INSERT TO authenticated WITH CHECK (public.can_manage_service_library(auth.uid()));
CREATE POLICY "sl update manage" ON public.service_library FOR UPDATE TO authenticated USING (public.can_manage_service_library(auth.uid()));
CREATE POLICY "sl delete manage" ON public.service_library FOR DELETE TO authenticated USING (public.can_manage_service_library(auth.uid()));

CREATE POLICY "sl_fee view auth" ON public.service_library_fee_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "sl_fee insert manage" ON public.service_library_fee_items FOR INSERT TO authenticated WITH CHECK (public.can_manage_service_library(auth.uid()));
CREATE POLICY "sl_fee update manage" ON public.service_library_fee_items FOR UPDATE TO authenticated USING (public.can_manage_service_library(auth.uid()));
CREATE POLICY "sl_fee delete manage" ON public.service_library_fee_items FOR DELETE TO authenticated USING (public.can_manage_service_library(auth.uid()));

CREATE POLICY "sl_att view auth" ON public.service_library_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "sl_att insert manage" ON public.service_library_attachments FOR INSERT TO authenticated WITH CHECK (public.can_manage_service_library(auth.uid()));
CREATE POLICY "sl_att update manage" ON public.service_library_attachments FOR UPDATE TO authenticated USING (public.can_manage_service_library(auth.uid()));
CREATE POLICY "sl_att delete manage" ON public.service_library_attachments FOR DELETE TO authenticated USING (public.can_manage_service_library(auth.uid()));

CREATE POLICY "service_lib_files read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'service-library-files');
CREATE POLICY "service_lib_files insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'service-library-files' AND public.can_manage_service_library(auth.uid()));
CREATE POLICY "service_lib_files update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'service-library-files' AND public.can_manage_service_library(auth.uid()));
CREATE POLICY "service_lib_files delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'service-library-files' AND public.can_manage_service_library(auth.uid()));

CREATE TRIGGER trg_sl_updated BEFORE UPDATE ON public.service_library FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_sl_fee_updated BEFORE UPDATE ON public.service_library_fee_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_sl_att_updated BEFORE UPDATE ON public.service_library_attachments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
