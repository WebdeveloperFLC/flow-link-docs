
-- ======== client_tasks ========
CREATE TABLE IF NOT EXISTS public.client_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'task' CHECK (kind IN ('task','callback','reminder')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done','cancelled')),
  due_at timestamptz,
  assigned_to uuid,
  created_by uuid,
  completed_by uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS client_tasks_client_idx ON public.client_tasks(client_id, due_at);
CREATE INDEX IF NOT EXISTS client_tasks_assignee_idx ON public.client_tasks(assigned_to, status);
ALTER TABLE public.client_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks view scoped" ON public.client_tasks FOR SELECT TO authenticated
  USING (public.can_view_client(auth.uid(), client_id) OR assigned_to = auth.uid() OR created_by = auth.uid());
CREATE POLICY "tasks insert scoped" ON public.client_tasks FOR INSERT TO authenticated
  WITH CHECK (public.can_view_client(auth.uid(), client_id) AND (created_by IS NULL OR created_by = auth.uid()));
CREATE POLICY "tasks update scoped" ON public.client_tasks FOR UPDATE TO authenticated
  USING (public.can_edit_client(auth.uid(), client_id) OR assigned_to = auth.uid() OR created_by = auth.uid());
CREATE POLICY "tasks delete admin or creator" ON public.client_tasks FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR created_by = auth.uid());

CREATE TRIGGER trg_client_tasks_updated BEFORE UPDATE ON public.client_tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ======== chat extensions ========
CREATE TABLE IF NOT EXISTS public.chat_message_meta (
  message_id uuid PRIMARY KEY,
  parent_id uuid,
  pinned boolean NOT NULL DEFAULT false,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_message_meta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meta read via message" ON public.chat_message_meta FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_messages m WHERE m.id = chat_message_meta.message_id));
CREATE POLICY "meta upsert by sender or admin" ON public.chat_message_meta FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.chat_messages m WHERE m.id = chat_message_meta.message_id AND (m.sender_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role))));
CREATE POLICY "meta update by sender or admin" ON public.chat_message_meta FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_messages m WHERE m.id = chat_message_meta.message_id AND (m.sender_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role))));

CREATE TABLE IF NOT EXISTS public.chat_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reactions read all" ON public.chat_message_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "reactions write own" ON public.chat_message_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "reactions delete own" ON public.chat_message_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.chat_message_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  mentioned_user_id uuid NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, mentioned_user_id)
);
ALTER TABLE public.chat_message_mentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mentions read self" ON public.chat_message_mentions FOR SELECT TO authenticated
  USING (mentioned_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.chat_messages m WHERE m.id = chat_message_mentions.message_id AND m.sender_id = auth.uid()));
CREATE POLICY "mentions insert by sender" ON public.chat_message_mentions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.chat_messages m WHERE m.id = chat_message_mentions.message_id AND m.sender_id = auth.uid()));
CREATE POLICY "mentions update self read" ON public.chat_message_mentions FOR UPDATE TO authenticated
  USING (mentioned_user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.chat_message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_message_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attachments read via message" ON public.chat_message_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "attachments insert by sender" ON public.chat_message_attachments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.chat_messages m WHERE m.id = chat_message_attachments.message_id AND m.sender_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.chat_read_receipts (
  user_id uuid NOT NULL,
  channel_key text NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, channel_key)
);
ALTER TABLE public.chat_read_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receipts own" ON public.chat_read_receipts FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ======== lead_handoffs status ========
ALTER TABLE public.lead_handoffs ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.lead_handoffs ADD COLUMN IF NOT EXISTS responded_at timestamptz;

-- ======== timeline triggers ========
CREATE OR REPLACE FUNCTION public.fn_log_call_session_to_timeline()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.client_id IS NULL THEN RETURN NEW; END IF;
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND COALESCE(OLD.status::text,'') <> COALESCE(NEW.status::text,'')) THEN
    INSERT INTO public.client_timeline(client_id, event_type, actor_id, summary, metadata)
    VALUES (NEW.client_id, 'call', COALESCE(NEW.created_by, NEW.agent_id),
      concat_ws(' · ', NEW.direction::text, NEW.status::text, COALESCE(NEW.disposition,''),
        CASE WHEN NEW.duration_seconds IS NOT NULL THEN (NEW.duration_seconds::text || 's') END),
      jsonb_build_object('session_id', NEW.id, 'recording_url', NEW.recording_url, 'disposition', NEW.disposition));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_log_call_session ON public.call_sessions;
CREATE TRIGGER trg_log_call_session AFTER INSERT OR UPDATE ON public.call_sessions
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_call_session_to_timeline();

CREATE OR REPLACE FUNCTION public.fn_log_document_to_timeline()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.client_timeline(client_id, event_type, actor_id, summary, metadata)
  VALUES (NEW.client_id, 'file', NEW.uploaded_by,
    'Uploaded: ' || NEW.file_name,
    jsonb_build_object('document_id', NEW.id, 'document_type', NEW.document_type));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_log_document ON public.client_documents;
CREATE TRIGGER trg_log_document AFTER INSERT ON public.client_documents
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_document_to_timeline();

CREATE OR REPLACE FUNCTION public.fn_log_task_to_timeline()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.client_timeline(client_id, event_type, actor_id, summary, metadata)
    VALUES (NEW.client_id, 'task', NEW.created_by,
      'Created ' || NEW.kind || ': ' || NEW.title,
      jsonb_build_object('task_id', NEW.id, 'kind', NEW.kind, 'priority', NEW.priority, 'due_at', NEW.due_at, 'assigned_to', NEW.assigned_to));
  ELSIF (TG_OP = 'UPDATE' AND OLD.status <> NEW.status AND NEW.status = 'done') THEN
    INSERT INTO public.client_timeline(client_id, event_type, actor_id, summary, metadata)
    VALUES (NEW.client_id, 'task', NEW.completed_by,
      'Completed ' || NEW.kind || ': ' || NEW.title,
      jsonb_build_object('task_id', NEW.id));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_log_task ON public.client_tasks;
CREATE TRIGGER trg_log_task AFTER INSERT OR UPDATE ON public.client_tasks
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_task_to_timeline();

CREATE OR REPLACE FUNCTION public.fn_log_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.status,'') <> COALESCE(NEW.status,'') THEN
    INSERT INTO public.client_timeline(client_id, event_type, actor_id, summary, metadata)
    VALUES (NEW.id, 'status_change', auth.uid(),
      'Status: ' || COALESCE(OLD.status,'?') || ' → ' || COALESCE(NEW.status,'?'),
      jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_log_status_change ON public.clients;
CREATE TRIGGER trg_log_status_change AFTER UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_status_change();

CREATE OR REPLACE FUNCTION public.fn_log_access_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.client_timeline(client_id, event_type, actor_id, summary, metadata)
  VALUES (NEW.client_id, 'assignment', NEW.granted_by,
    'Access granted (' || NEW.permission::text || ')',
    jsonb_build_object('user_id', NEW.user_id, 'team_id', NEW.team_id, 'permission', NEW.permission));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_log_access ON public.client_access;
CREATE TRIGGER trg_log_access AFTER INSERT ON public.client_access
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_access_change();

-- ======== realtime publication ========
DO $$
BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='client_tasks';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.client_tasks; END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='chat_message_reactions';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reactions; END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='chat_message_mentions';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_mentions; END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='chat_message_meta';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_meta; END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='chat_message_attachments';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_attachments; END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='lead_handoffs';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_handoffs; END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='client_timeline';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.client_timeline; END IF;
END $$;
