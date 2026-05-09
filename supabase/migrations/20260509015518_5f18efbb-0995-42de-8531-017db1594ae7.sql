
-- ===========================================================
-- PHASE 1: EMAIL INTEGRATION
-- ===========================================================

CREATE TABLE IF NOT EXISTS public.email_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  subject text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  message_count integer NOT NULL DEFAULT 0,
  last_message_at timestamptz,
  internal_only boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_threads_client ON public.email_threads(client_id, last_message_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS public.client_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.email_threads(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  from_address text NOT NULL,
  to_addresses text[] NOT NULL DEFAULT '{}',
  cc_addresses text[] NOT NULL DEFAULT '{}',
  bcc_addresses text[] NOT NULL DEFAULT '{}',
  subject text NOT NULL DEFAULT '',
  body_html text,
  body_text text,
  in_reply_to text,
  provider_message_id text,
  status text NOT NULL DEFAULT 'queued',
  error_message text,
  sent_at timestamptz,
  received_at timestamptz,
  sender_user_id uuid,
  internal_only boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_emails_thread ON public.client_emails(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_emails_client ON public.client_emails(client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.email_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid NOT NULL REFERENCES public.client_emails(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_attachments_email ON public.email_attachments(email_id);

CREATE TABLE IF NOT EXISTS public.email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid REFERENCES public.client_emails(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_events_email ON public.email_events(email_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.email_read_receipts (
  thread_id uuid NOT NULL REFERENCES public.email_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  scope text NOT NULL DEFAULT 'global',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view threads" ON public.email_threads FOR SELECT USING (public.can_view_client(auth.uid(), client_id));
CREATE POLICY "create threads" ON public.email_threads FOR INSERT WITH CHECK (public.can_edit_client(auth.uid(), client_id));
CREATE POLICY "update threads" ON public.email_threads FOR UPDATE USING (public.can_edit_client(auth.uid(), client_id));

CREATE POLICY "view emails" ON public.client_emails FOR SELECT USING (public.can_view_client(auth.uid(), client_id));
CREATE POLICY "create emails" ON public.client_emails FOR INSERT WITH CHECK (public.can_edit_client(auth.uid(), client_id));
CREATE POLICY "update emails" ON public.client_emails FOR UPDATE USING (public.can_edit_client(auth.uid(), client_id));

CREATE POLICY "view email attachments" ON public.email_attachments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.client_emails e WHERE e.id = email_attachments.email_id AND public.can_view_client(auth.uid(), e.client_id))
);
CREATE POLICY "create email attachments" ON public.email_attachments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.client_emails e WHERE e.id = email_attachments.email_id AND public.can_edit_client(auth.uid(), e.client_id))
);

CREATE POLICY "view email events" ON public.email_events FOR SELECT USING (
  email_id IS NULL OR EXISTS (SELECT 1 FROM public.client_emails e WHERE e.id = email_events.email_id AND public.can_view_client(auth.uid(), e.client_id))
);

CREATE POLICY "manage own receipts" ON public.email_read_receipts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "view templates" ON public.email_templates FOR SELECT USING (
  scope = 'global' OR created_by = auth.uid()
);
CREATE POLICY "manage own templates" ON public.email_templates FOR ALL USING (
  created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)
) WITH CHECK (
  created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Timeline trigger
CREATE OR REPLACE FUNCTION public.fn_log_email_to_timeline()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.client_timeline(client_id, event_type, actor_id, summary, metadata)
  VALUES (
    NEW.client_id, 'email', COALESCE(NEW.sender_user_id, auth.uid()),
    CASE NEW.direction WHEN 'outbound' THEN 'Sent: ' ELSE 'Received: ' END || COALESCE(NULLIF(NEW.subject,''), '(no subject)'),
    jsonb_build_object('email_id', NEW.id, 'thread_id', NEW.thread_id, 'direction', NEW.direction, 'status', NEW.status)
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_email_to_timeline ON public.client_emails;
CREATE TRIGGER trg_log_email_to_timeline AFTER INSERT ON public.client_emails
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_email_to_timeline();

-- Update thread metadata on email insert
CREATE OR REPLACE FUNCTION public.fn_touch_email_thread()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.email_threads
     SET message_count = message_count + 1,
         last_message_at = COALESCE(NEW.sent_at, NEW.received_at, NEW.created_at),
         updated_at = now()
   WHERE id = NEW.thread_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_touch_email_thread ON public.client_emails;
CREATE TRIGGER trg_touch_email_thread AFTER INSERT ON public.client_emails
  FOR EACH ROW EXECUTE FUNCTION public.fn_touch_email_thread();

-- ===========================================================
-- PHASE 2: VOICE NOTES
-- ===========================================================

CREATE TABLE IF NOT EXISTS public.voice_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  context_type text NOT NULL DEFAULT 'timeline',
  context_id uuid,
  author_id uuid,
  storage_path text NOT NULL,
  duration_ms integer,
  mime_type text,
  size_bytes bigint,
  status text NOT NULL DEFAULT 'ready',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_voice_notes_client ON public.voice_notes(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_notes_context ON public.voice_notes(context_type, context_id);

CREATE TABLE IF NOT EXISTS public.voice_note_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_note_id uuid NOT NULL REFERENCES public.voice_notes(id) ON DELETE CASCADE,
  language text DEFAULT 'en',
  text text NOT NULL DEFAULT '',
  model text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_note_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view voice notes" ON public.voice_notes FOR SELECT USING (public.can_view_client(auth.uid(), client_id));
CREATE POLICY "create voice notes" ON public.voice_notes FOR INSERT WITH CHECK (public.can_edit_client(auth.uid(), client_id) AND auth.uid() = author_id);
CREATE POLICY "delete own voice notes" ON public.voice_notes FOR DELETE USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "view transcripts" ON public.voice_note_transcripts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.voice_notes v WHERE v.id = voice_note_transcripts.voice_note_id AND public.can_view_client(auth.uid(), v.client_id))
);
CREATE POLICY "manage transcripts" ON public.voice_note_transcripts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.voice_notes v WHERE v.id = voice_note_transcripts.voice_note_id AND public.can_edit_client(auth.uid(), v.client_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.voice_notes v WHERE v.id = voice_note_transcripts.voice_note_id AND public.can_edit_client(auth.uid(), v.client_id))
);

-- Storage bucket for voice notes
INSERT INTO storage.buckets (id, name, public) VALUES ('voice-notes', 'voice-notes', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "voice notes read" ON storage.objects FOR SELECT USING (
  bucket_id = 'voice-notes'
  AND EXISTS (
    SELECT 1 FROM public.voice_notes v
     WHERE v.storage_path = storage.objects.name
       AND public.can_view_client(auth.uid(), v.client_id)
  )
);
CREATE POLICY "voice notes insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'voice-notes' AND auth.uid() IS NOT NULL
);
CREATE POLICY "voice notes delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'voice-notes' AND EXISTS (
    SELECT 1 FROM public.voice_notes v
     WHERE v.storage_path = storage.objects.name
       AND (v.author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Timeline trigger
CREATE OR REPLACE FUNCTION public.fn_log_voice_note_to_timeline()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.context_type IN ('timeline', 'remark') THEN
    INSERT INTO public.client_timeline(client_id, event_type, actor_id, summary, metadata)
    VALUES (NEW.client_id, 'voice', NEW.author_id, 'Voice note recorded',
      jsonb_build_object('voice_note_id', NEW.id, 'duration_ms', NEW.duration_ms, 'context_type', NEW.context_type));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_voice_note ON public.voice_notes;
CREATE TRIGGER trg_log_voice_note AFTER INSERT ON public.voice_notes
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_voice_note_to_timeline();

-- ===========================================================
-- PHASE 3: AI SUMMARIES
-- ===========================================================

CREATE TABLE IF NOT EXISTS public.ai_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'client_overview',
  source_id uuid,
  status text NOT NULL DEFAULT 'suggested',
  title text NOT NULL DEFAULT '',
  summary_md text NOT NULL DEFAULT '',
  key_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_action text,
  follow_up_role text,
  client_intent text,
  urgency text,
  generated_by_model text,
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_summaries_client ON public.ai_summaries(client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_summary_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_id uuid NOT NULL REFERENCES public.ai_summaries(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_summary_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_id uuid NOT NULL REFERENCES public.ai_summaries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_summary_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_summary_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view summaries" ON public.ai_summaries FOR SELECT USING (public.can_view_client(auth.uid(), client_id));
CREATE POLICY "create summaries" ON public.ai_summaries FOR INSERT WITH CHECK (public.can_edit_client(auth.uid(), client_id));
CREATE POLICY "update summaries" ON public.ai_summaries FOR UPDATE USING (public.can_edit_client(auth.uid(), client_id));
CREATE POLICY "delete summaries" ON public.ai_summaries FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "view sources" ON public.ai_summary_sources FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.ai_summaries s WHERE s.id = ai_summary_sources.summary_id AND public.can_view_client(auth.uid(), s.client_id))
);
CREATE POLICY "manage sources" ON public.ai_summary_sources FOR ALL USING (
  EXISTS (SELECT 1 FROM public.ai_summaries s WHERE s.id = ai_summary_sources.summary_id AND public.can_edit_client(auth.uid(), s.client_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.ai_summaries s WHERE s.id = ai_summary_sources.summary_id AND public.can_edit_client(auth.uid(), s.client_id))
);

CREATE POLICY "view feedback" ON public.ai_summary_feedback FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.ai_summaries s WHERE s.id = ai_summary_feedback.summary_id AND public.can_view_client(auth.uid(), s.client_id))
);
CREATE POLICY "create feedback" ON public.ai_summary_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Timeline trigger on summary status change
CREATE OR REPLACE FUNCTION public.fn_log_ai_summary()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.client_timeline(client_id, event_type, actor_id, summary, metadata)
    VALUES (NEW.client_id, 'ai_summary', NEW.created_by,
      'AI summary suggested: ' || COALESCE(NULLIF(NEW.title,''), NEW.scope),
      jsonb_build_object('summary_id', NEW.id, 'scope', NEW.scope, 'status', NEW.status));
  ELSIF (TG_OP = 'UPDATE' AND COALESCE(OLD.status,'') <> COALESCE(NEW.status,'')) THEN
    INSERT INTO public.client_timeline(client_id, event_type, actor_id, summary, metadata)
    VALUES (NEW.client_id, 'ai_summary', auth.uid(),
      'AI summary ' || NEW.status || ': ' || COALESCE(NULLIF(NEW.title,''), NEW.scope),
      jsonb_build_object('summary_id', NEW.id, 'status', NEW.status));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_ai_summary ON public.ai_summaries;
CREATE TRIGGER trg_log_ai_summary AFTER INSERT OR UPDATE ON public.ai_summaries
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_ai_summary();

-- ===========================================================
-- Realtime publication
-- ===========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_emails;
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_summaries;
