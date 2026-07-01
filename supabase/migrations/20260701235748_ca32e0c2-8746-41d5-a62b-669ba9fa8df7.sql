DROP POLICY IF EXISTS ucr_storage_select ON storage.objects;
DROP POLICY IF EXISTS ucr_storage_insert ON storage.objects;
DROP POLICY IF EXISTS ucr_storage_delete ON storage.objects;

CREATE POLICY ucr_storage_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'upi-commission-receipts'
    AND (
      public.can_view_upi_confidential(auth.uid())
      OR public.is_accounting_user(auth.uid())
      OR public.is_commission_admin(auth.uid())
    )
  );

CREATE POLICY ucr_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'upi-commission-receipts'
    AND (
      public.can_view_upi_confidential(auth.uid())
      OR public.is_accounting_user(auth.uid())
      OR public.is_commission_admin(auth.uid())
    )
  );

CREATE POLICY ucr_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'upi-commission-receipts'
    AND (
      public.can_view_upi_confidential(auth.uid())
      OR public.is_accounting_admin(auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.fn_register_receipt_attachment(
  p_receipt_id uuid,
  p_attachment_type text,
  p_file_name text,
  p_storage_path text,
  p_mime_type text DEFAULT NULL,
  p_file_size_bytes bigint DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_status text;
BEGIN
  PERFORM public.fn_assert_commission_receipt_actor();

  SELECT status INTO v_status FROM public.upi_commission_receipts WHERE id = p_receipt_id;
  IF v_status IS NULL THEN RAISE EXCEPTION 'receipt not found'; END IF;
  IF v_status IN ('posted', 'voided') THEN
    RAISE EXCEPTION 'cannot attach files to % receipt', v_status;
  END IF;

  IF p_attachment_type NOT IN ('payment_advice', 'remittance', 'wire_confirmation', 'supporting') THEN
    RAISE EXCEPTION 'invalid attachment type';
  END IF;

  INSERT INTO public.upi_commission_receipt_attachments (
    receipt_id, attachment_type, file_name, storage_path, mime_type, file_size_bytes, uploaded_by
  ) VALUES (
    p_receipt_id, p_attachment_type, p_file_name, p_storage_path, p_mime_type, p_file_size_bytes, auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_register_receipt_attachment(uuid, text, text, text, text, bigint) TO authenticated;

COMMENT ON TABLE public.upi_commission_receipts IS
  'Phase 2A commission receipts. Posted rows immutable — void and recreate. No accounting_journal_id in 2A.';