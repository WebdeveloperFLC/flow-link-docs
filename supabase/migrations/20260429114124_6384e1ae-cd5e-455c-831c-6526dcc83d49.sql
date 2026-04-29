alter table public.binders add column if not exists group_label text;
alter table public.workflow_templates add column if not exists groups jsonb;