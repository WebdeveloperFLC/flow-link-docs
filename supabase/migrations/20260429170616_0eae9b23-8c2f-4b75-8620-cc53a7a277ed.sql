
CREATE TABLE public.document_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  client_id uuid,
  doc_type text,
  risk_score integer NOT NULL DEFAULT 0,
  risk_level text NOT NULL DEFAULT 'review',
  signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_summary text,
  reviewer_status text,
  reviewer_id uuid,
  reviewer_note text,
  reviewed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_doc_verifications_document ON public.document_verifications(document_id);
CREATE INDEX idx_doc_verifications_client ON public.document_verifications(client_id);
CREATE INDEX idx_doc_verifications_created ON public.document_verifications(created_at DESC);

ALTER TABLE public.document_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verifications readable by authenticated"
  ON public.document_verifications FOR SELECT TO authenticated USING (true);

CREATE POLICY "team creates verifications"
  ON public.document_verifications FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'counselor'::app_role) OR has_role(auth.uid(), 'documentation'::app_role));

CREATE POLICY "team updates verifications"
  ON public.document_verifications FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'counselor'::app_role) OR has_role(auth.uid(), 'documentation'::app_role));

CREATE POLICY "admins delete verifications"
  ON public.document_verifications FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_doc_verifications_updated_at
  BEFORE UPDATE ON public.document_verifications
  FOR EACH ROW EXECUTE FUNCTION public.touch_master_items_updated_at();

CREATE TABLE public.document_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  client_id uuid,
  sha256 text,
  phash text,
  page_count integer,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_doc_fp_sha ON public.document_fingerprints(sha256);
CREATE INDEX idx_doc_fp_phash ON public.document_fingerprints(phash);
CREATE INDEX idx_doc_fp_document ON public.document_fingerprints(document_id);

ALTER TABLE public.document_fingerprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fingerprints readable by authenticated"
  ON public.document_fingerprints FOR SELECT TO authenticated USING (true);

CREATE POLICY "team writes fingerprints"
  ON public.document_fingerprints FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'counselor'::app_role) OR has_role(auth.uid(), 'documentation'::app_role));

CREATE POLICY "admins delete fingerprints"
  ON public.document_fingerprints FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
