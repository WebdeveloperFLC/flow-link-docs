-- Stage pipelines for Service Library auto-assignment (keyword match on name + service_category).
-- Upserts on (country, service_category). Stages upsert by key — never deletes (client_stage_history FK).
-- Regenerate: node scripts/generate-stage-pipeline-sql.mjs

-- Australia · Australia Skilled Migration · Skilled Migration
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-b4a59eba022e'::uuid, 'Australia Skilled Migration', 'Australia', 'Skilled Migration', true, 'Auto-seeded pipeline for australia-skilled-migration')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Australia · Australia Spouse Visa · Spouse Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-498b3bd9ebf0'::uuid, 'Australia Spouse Visa', 'Australia', 'Spouse Visa', true, 'Auto-seeded pipeline for australia-spouse-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Australia · Australia Student Visa · Study Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-f172d14c0284'::uuid, 'Australia Student Visa', 'Australia', 'Study Visa', true, 'Auto-seeded pipeline for australia-student-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'LOA / offer secured',
    client_label = 'Offer letter received',
    sort_order = 60,
    color = '#8b5cf6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'offer_letter';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'offer_letter', 'LOA / offer secured', 'Offer letter received', 60, '#8b5cf6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'offer_letter'
  );
  UPDATE public.pipeline_stages SET
    label = 'Tuition deposit paid',
    client_label = 'Tuition payment confirmed',
    sort_order = 65,
    color = '#a855f7',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'tuition_paid';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'tuition_paid', 'Tuition deposit paid', 'Tuition payment confirmed', 65, '#a855f7', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'tuition_paid'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa file preparation',
    client_label = 'Preparing visa application',
    sort_order = 70,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_preparation';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_preparation', 'Visa file preparation', 'Preparing visa application', 70, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_preparation'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa application lodged',
    client_label = 'Visa application submitted',
    sort_order = 75,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_lodged';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_lodged', 'Visa application lodged', 'Visa application submitted', 75, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_lodged'
  );
  UPDATE public.pipeline_stages SET
    label = 'Biometrics / medical',
    client_label = 'Biometrics or medical in progress',
    sort_order = 80,
    color = '#14b8a6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'biometrics_medical';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'biometrics_medical'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa approved',
    client_label = 'Visa approved',
    sort_order = 85,
    color = '#22c55e',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_approved';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_approved'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa refused',
    client_label = 'Application outcome received',
    sort_order = 90,
    color = '#ef4444',
    notify_client = true,
    is_client_visible = false
  WHERE pipeline_id = pid AND key = 'visa_refused';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_refused'
  );
END $$;

-- Australia · Australia Subclass 485 · Subclass 485
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-2f6b9b4357ff'::uuid, 'Australia Subclass 485', 'Australia', 'Subclass 485', true, 'Auto-seeded pipeline for australia-subclass-485')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Australia · Australia Visitor Visa Subclass 600 · Visitor Visa Subclass 600
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-8547f32cebf2'::uuid, 'Australia Visitor Visa Subclass 600', 'Australia', 'Visitor Visa Subclass 600', true, 'Auto-seeded pipeline for australia-visitor-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Australia · Australia Work Holiday · Work Holiday
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-7653fcf8fc54'::uuid, 'Australia Work Holiday', 'Australia', 'Work Holiday', true, 'Auto-seeded pipeline for australia-work-holiday')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Austria · Austria Student Visa · Study Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-12610088f80a'::uuid, 'Austria Student Visa', 'Austria', 'Study Visa', true, 'Auto-seeded pipeline for austria-student-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'LOA / offer secured',
    client_label = 'Offer letter received',
    sort_order = 60,
    color = '#8b5cf6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'offer_letter';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'offer_letter', 'LOA / offer secured', 'Offer letter received', 60, '#8b5cf6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'offer_letter'
  );
  UPDATE public.pipeline_stages SET
    label = 'Tuition deposit paid',
    client_label = 'Tuition payment confirmed',
    sort_order = 65,
    color = '#a855f7',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'tuition_paid';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'tuition_paid', 'Tuition deposit paid', 'Tuition payment confirmed', 65, '#a855f7', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'tuition_paid'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa file preparation',
    client_label = 'Preparing visa application',
    sort_order = 70,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_preparation';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_preparation', 'Visa file preparation', 'Preparing visa application', 70, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_preparation'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa application lodged',
    client_label = 'Visa application submitted',
    sort_order = 75,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_lodged';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_lodged', 'Visa application lodged', 'Visa application submitted', 75, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_lodged'
  );
  UPDATE public.pipeline_stages SET
    label = 'Biometrics / medical',
    client_label = 'Biometrics or medical in progress',
    sort_order = 80,
    color = '#14b8a6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'biometrics_medical';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'biometrics_medical'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa approved',
    client_label = 'Visa approved',
    sort_order = 85,
    color = '#22c55e',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_approved';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_approved'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa refused',
    client_label = 'Application outcome received',
    sort_order = 90,
    color = '#ef4444',
    notify_client = true,
    is_client_visible = false
  WHERE pipeline_id = pid AND key = 'visa_refused';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_refused'
  );
END $$;

-- Austria · Austria Visitor Visa · Visitor Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-9b7cad660e4d'::uuid, 'Austria Visitor Visa', 'Austria', 'Visitor Visa', true, 'Auto-seeded pipeline for austria-visitor-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Belgium · Belgium Student Visa · Study Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-31b2cc238db0'::uuid, 'Belgium Student Visa', 'Belgium', 'Study Visa', true, 'Auto-seeded pipeline for belgium-student-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'LOA / offer secured',
    client_label = 'Offer letter received',
    sort_order = 60,
    color = '#8b5cf6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'offer_letter';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'offer_letter', 'LOA / offer secured', 'Offer letter received', 60, '#8b5cf6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'offer_letter'
  );
  UPDATE public.pipeline_stages SET
    label = 'Tuition deposit paid',
    client_label = 'Tuition payment confirmed',
    sort_order = 65,
    color = '#a855f7',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'tuition_paid';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'tuition_paid', 'Tuition deposit paid', 'Tuition payment confirmed', 65, '#a855f7', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'tuition_paid'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa file preparation',
    client_label = 'Preparing visa application',
    sort_order = 70,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_preparation';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_preparation', 'Visa file preparation', 'Preparing visa application', 70, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_preparation'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa application lodged',
    client_label = 'Visa application submitted',
    sort_order = 75,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_lodged';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_lodged', 'Visa application lodged', 'Visa application submitted', 75, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_lodged'
  );
  UPDATE public.pipeline_stages SET
    label = 'Biometrics / medical',
    client_label = 'Biometrics or medical in progress',
    sort_order = 80,
    color = '#14b8a6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'biometrics_medical';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'biometrics_medical'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa approved',
    client_label = 'Visa approved',
    sort_order = 85,
    color = '#22c55e',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_approved';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_approved'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa refused',
    client_label = 'Application outcome received',
    sort_order = 90,
    color = '#ef4444',
    notify_client = true,
    is_client_visible = false
  WHERE pipeline_id = pid AND key = 'visa_refused';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_refused'
  );
END $$;

-- Belgium · Belgium Visitor Visa · Visitor Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-dfbdb57e837a'::uuid, 'Belgium Visitor Visa', 'Belgium', 'Visitor Visa', true, 'Auto-seeded pipeline for belgium-visitor-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Canada · Canada BOWP Work Permit · BOWP Work Permit
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-24b0107a4079'::uuid, 'Canada BOWP Work Permit', 'Canada', 'BOWP Work Permit', true, 'Auto-seeded pipeline for canada-bowp')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Canada · Canada Caips Notes · Caips Notes
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-2b8d6d51235c'::uuid, 'Canada Caips Notes', 'Canada', 'Caips Notes', true, 'Auto-seeded pipeline for canada-caips-notes')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Canada · Canada Express Entry PR · Express Entry PR
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-92607e42d49f'::uuid, 'Canada Express Entry PR', 'Canada', 'Express Entry PR', true, 'Auto-seeded pipeline for canada-express-entry-pr')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Canada · Canada Oinp · Oinp
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-b1d816691de6'::uuid, 'Canada Oinp', 'Canada', 'Oinp', true, 'Auto-seeded pipeline for canada-oinp')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Canada · Canada PGWP Work Permit · PGWP Work Permit
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-3de895181eb7'::uuid, 'Canada PGWP Work Permit', 'Canada', 'PGWP Work Permit', true, 'Auto-seeded pipeline for canada-pgwp')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Canada · Canada Pnp Program · Pnp Program
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-7e7cb8afe5b8'::uuid, 'Canada Pnp Program', 'Canada', 'Pnp Program', true, 'Auto-seeded pipeline for canada-pnp-program')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Canada · Canada Spouse Dependent Extension · Spouse Dependent Extension
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-2bde27c4b952'::uuid, 'Canada Spouse Dependent Extension', 'Canada', 'Spouse Dependent Extension', true, 'Auto-seeded pipeline for canada-spouse-dependent-extension')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Canada · Canada Spouse Dependent OWP · Spouse Dependent OWP
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-46947a072690'::uuid, 'Canada Spouse Dependent OWP', 'Canada', 'Spouse Dependent OWP', true, 'Auto-seeded pipeline for canada-spouse-dependent-owp')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Canada · Canada Spouse Dependent Visitor · Spouse Dependent Visitor
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-118ed7a96e6e'::uuid, 'Canada Spouse Dependent Visitor', 'Canada', 'Spouse Dependent Visitor', true, 'Auto-seeded pipeline for canada-spouse-dependent-visitor')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Canada · Canada Spouse Visa · Spouse Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-cd8de6a126a3'::uuid, 'Canada Spouse Visa', 'Canada', 'Spouse Visa', true, 'Auto-seeded pipeline for canada-spouse-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Canada · Canada Study Permit Extension · Study Permit Extension
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-89b05dd02056'::uuid, 'Canada Study Permit Extension', 'Canada', 'Study Permit Extension', true, 'Auto-seeded pipeline for canada-study-permit-extension')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Canada · Canada Study Visa · Study Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-f69c28e543f3'::uuid, 'Canada Study Visa', 'Canada', 'Study Visa', true, 'Auto-seeded pipeline for canada-student-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'LOA / offer secured',
    client_label = 'Offer letter received',
    sort_order = 60,
    color = '#8b5cf6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'offer_letter';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'offer_letter', 'LOA / offer secured', 'Offer letter received', 60, '#8b5cf6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'offer_letter'
  );
  UPDATE public.pipeline_stages SET
    label = 'Tuition deposit paid',
    client_label = 'Tuition payment confirmed',
    sort_order = 65,
    color = '#a855f7',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'tuition_paid';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'tuition_paid', 'Tuition deposit paid', 'Tuition payment confirmed', 65, '#a855f7', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'tuition_paid'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa file preparation',
    client_label = 'Preparing visa application',
    sort_order = 70,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_preparation';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_preparation', 'Visa file preparation', 'Preparing visa application', 70, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_preparation'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa application lodged',
    client_label = 'Visa application submitted',
    sort_order = 75,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_lodged';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_lodged', 'Visa application lodged', 'Visa application submitted', 75, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_lodged'
  );
  UPDATE public.pipeline_stages SET
    label = 'Biometrics / medical',
    client_label = 'Biometrics or medical in progress',
    sort_order = 80,
    color = '#14b8a6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'biometrics_medical';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'biometrics_medical'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa approved',
    client_label = 'Visa approved',
    sort_order = 85,
    color = '#22c55e',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_approved';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_approved'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa refused',
    client_label = 'Application outcome received',
    sort_order = 90,
    color = '#ef4444',
    notify_client = true,
    is_client_visible = false
  WHERE pipeline_id = pid AND key = 'visa_refused';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_refused'
  );
END $$;

-- Canada · Canada Super Visa · Super Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-cef35ea4bff6'::uuid, 'Canada Super Visa', 'Canada', 'Super Visa', true, 'Auto-seeded pipeline for canada-super-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Canada · Canada Tr To Pr · Tr To Pr
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-6f463efb0364'::uuid, 'Canada Tr To Pr', 'Canada', 'Tr To Pr', true, 'Auto-seeded pipeline for canada-tr-to-pr')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Canada · Canada Visitor Record · Visitor Record
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-84842603e37f'::uuid, 'Canada Visitor Record', 'Canada', 'Visitor Record', true, 'Auto-seeded pipeline for canada-visitor-record')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Canada · Canada Visitor Visa · Visitor Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-4adb58e63483'::uuid, 'Canada Visitor Visa', 'Canada', 'Visitor Visa', true, 'Auto-seeded pipeline for canada-visitor-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Canada · Canada Work Permit · Work Permit
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-0b49c35ebc3f'::uuid, 'Canada Work Permit', 'Canada', 'Work Permit', true, 'Auto-seeded pipeline for canada-work-permit')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Cyprus · Cyprus Student Visa · Study Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-5b1b11981819'::uuid, 'Cyprus Student Visa', 'Cyprus', 'Study Visa', true, 'Auto-seeded pipeline for cyprus-student-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'LOA / offer secured',
    client_label = 'Offer letter received',
    sort_order = 60,
    color = '#8b5cf6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'offer_letter';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'offer_letter', 'LOA / offer secured', 'Offer letter received', 60, '#8b5cf6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'offer_letter'
  );
  UPDATE public.pipeline_stages SET
    label = 'Tuition deposit paid',
    client_label = 'Tuition payment confirmed',
    sort_order = 65,
    color = '#a855f7',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'tuition_paid';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'tuition_paid', 'Tuition deposit paid', 'Tuition payment confirmed', 65, '#a855f7', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'tuition_paid'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa file preparation',
    client_label = 'Preparing visa application',
    sort_order = 70,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_preparation';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_preparation', 'Visa file preparation', 'Preparing visa application', 70, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_preparation'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa application lodged',
    client_label = 'Visa application submitted',
    sort_order = 75,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_lodged';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_lodged', 'Visa application lodged', 'Visa application submitted', 75, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_lodged'
  );
  UPDATE public.pipeline_stages SET
    label = 'Biometrics / medical',
    client_label = 'Biometrics or medical in progress',
    sort_order = 80,
    color = '#14b8a6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'biometrics_medical';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'biometrics_medical'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa approved',
    client_label = 'Visa approved',
    sort_order = 85,
    color = '#22c55e',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_approved';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_approved'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa refused',
    client_label = 'Application outcome received',
    sort_order = 90,
    color = '#ef4444',
    notify_client = true,
    is_client_visible = false
  WHERE pipeline_id = pid AND key = 'visa_refused';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_refused'
  );
END $$;

-- Cyprus · Cyprus Visitor Visa · Visitor Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-c716aa338fdd'::uuid, 'Cyprus Visitor Visa', 'Cyprus', 'Visitor Visa', true, 'Auto-seeded pipeline for cyprus-visitor-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Denmark · Denmark Student Visa · Study Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-2e131941e1cf'::uuid, 'Denmark Student Visa', 'Denmark', 'Study Visa', true, 'Auto-seeded pipeline for denmark-student-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'LOA / offer secured',
    client_label = 'Offer letter received',
    sort_order = 60,
    color = '#8b5cf6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'offer_letter';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'offer_letter', 'LOA / offer secured', 'Offer letter received', 60, '#8b5cf6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'offer_letter'
  );
  UPDATE public.pipeline_stages SET
    label = 'Tuition deposit paid',
    client_label = 'Tuition payment confirmed',
    sort_order = 65,
    color = '#a855f7',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'tuition_paid';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'tuition_paid', 'Tuition deposit paid', 'Tuition payment confirmed', 65, '#a855f7', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'tuition_paid'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa file preparation',
    client_label = 'Preparing visa application',
    sort_order = 70,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_preparation';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_preparation', 'Visa file preparation', 'Preparing visa application', 70, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_preparation'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa application lodged',
    client_label = 'Visa application submitted',
    sort_order = 75,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_lodged';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_lodged', 'Visa application lodged', 'Visa application submitted', 75, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_lodged'
  );
  UPDATE public.pipeline_stages SET
    label = 'Biometrics / medical',
    client_label = 'Biometrics or medical in progress',
    sort_order = 80,
    color = '#14b8a6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'biometrics_medical';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'biometrics_medical'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa approved',
    client_label = 'Visa approved',
    sort_order = 85,
    color = '#22c55e',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_approved';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_approved'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa refused',
    client_label = 'Application outcome received',
    sort_order = 90,
    color = '#ef4444',
    notify_client = true,
    is_client_visible = false
  WHERE pipeline_id = pid AND key = 'visa_refused';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_refused'
  );
END $$;

-- Denmark · Denmark Visitor Visa · Visitor Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-f21fb131616e'::uuid, 'Denmark Visitor Visa', 'Denmark', 'Visitor Visa', true, 'Auto-seeded pipeline for denmark-visitor-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Finland · Finland Spouse Visa · Spouse Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-dd44cabc7670'::uuid, 'Finland Spouse Visa', 'Finland', 'Spouse Visa', true, 'Auto-seeded pipeline for finland-spouse-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Finland · Finland Student Visa · Study Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-c8b2e039e39d'::uuid, 'Finland Student Visa', 'Finland', 'Study Visa', true, 'Auto-seeded pipeline for finland-student-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'LOA / offer secured',
    client_label = 'Offer letter received',
    sort_order = 60,
    color = '#8b5cf6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'offer_letter';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'offer_letter', 'LOA / offer secured', 'Offer letter received', 60, '#8b5cf6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'offer_letter'
  );
  UPDATE public.pipeline_stages SET
    label = 'Tuition deposit paid',
    client_label = 'Tuition payment confirmed',
    sort_order = 65,
    color = '#a855f7',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'tuition_paid';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'tuition_paid', 'Tuition deposit paid', 'Tuition payment confirmed', 65, '#a855f7', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'tuition_paid'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa file preparation',
    client_label = 'Preparing visa application',
    sort_order = 70,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_preparation';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_preparation', 'Visa file preparation', 'Preparing visa application', 70, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_preparation'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa application lodged',
    client_label = 'Visa application submitted',
    sort_order = 75,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_lodged';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_lodged', 'Visa application lodged', 'Visa application submitted', 75, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_lodged'
  );
  UPDATE public.pipeline_stages SET
    label = 'Biometrics / medical',
    client_label = 'Biometrics or medical in progress',
    sort_order = 80,
    color = '#14b8a6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'biometrics_medical';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'biometrics_medical'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa approved',
    client_label = 'Visa approved',
    sort_order = 85,
    color = '#22c55e',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_approved';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_approved'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa refused',
    client_label = 'Application outcome received',
    sort_order = 90,
    color = '#ef4444',
    notify_client = true,
    is_client_visible = false
  WHERE pipeline_id = pid AND key = 'visa_refused';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_refused'
  );
END $$;

-- Finland · Finland Visitor Visa · Visitor Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-a0f9880b007b'::uuid, 'Finland Visitor Visa', 'Finland', 'Visitor Visa', true, 'Auto-seeded pipeline for finland-visitor-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- France · France Student Visa · Study Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-97adfeb00724'::uuid, 'France Student Visa', 'France', 'Study Visa', true, 'Auto-seeded pipeline for france-student-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'LOA / offer secured',
    client_label = 'Offer letter received',
    sort_order = 60,
    color = '#8b5cf6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'offer_letter';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'offer_letter', 'LOA / offer secured', 'Offer letter received', 60, '#8b5cf6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'offer_letter'
  );
  UPDATE public.pipeline_stages SET
    label = 'Tuition deposit paid',
    client_label = 'Tuition payment confirmed',
    sort_order = 65,
    color = '#a855f7',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'tuition_paid';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'tuition_paid', 'Tuition deposit paid', 'Tuition payment confirmed', 65, '#a855f7', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'tuition_paid'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa file preparation',
    client_label = 'Preparing visa application',
    sort_order = 70,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_preparation';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_preparation', 'Visa file preparation', 'Preparing visa application', 70, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_preparation'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa application lodged',
    client_label = 'Visa application submitted',
    sort_order = 75,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_lodged';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_lodged', 'Visa application lodged', 'Visa application submitted', 75, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_lodged'
  );
  UPDATE public.pipeline_stages SET
    label = 'Biometrics / medical',
    client_label = 'Biometrics or medical in progress',
    sort_order = 80,
    color = '#14b8a6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'biometrics_medical';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'biometrics_medical'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa approved',
    client_label = 'Visa approved',
    sort_order = 85,
    color = '#22c55e',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_approved';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_approved'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa refused',
    client_label = 'Application outcome received',
    sort_order = 90,
    color = '#ef4444',
    notify_client = true,
    is_client_visible = false
  WHERE pipeline_id = pid AND key = 'visa_refused';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_refused'
  );
END $$;

-- France · France Visitor Visa · Visitor Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-42ac8ee02fad'::uuid, 'France Visitor Visa', 'France', 'Visitor Visa', true, 'Auto-seeded pipeline for france-visitor-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Germany · Germany Ausbildung · Ausbildung
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-b508f5d64eb5'::uuid, 'Germany Ausbildung', 'Germany', 'Ausbildung', true, 'Auto-seeded pipeline for germany-ausbildung')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Germany · Germany Blue Card · Blue Card
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-a8fdaa3935ef'::uuid, 'Germany Blue Card', 'Germany', 'Blue Card', true, 'Auto-seeded pipeline for germany-blue-card')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Germany · Germany Job Seeker · Job Seeker
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-b246599b87d9'::uuid, 'Germany Job Seeker', 'Germany', 'Job Seeker', true, 'Auto-seeded pipeline for germany-job-seeker')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Germany · Germany Opportunity Card Chancenkarte · Opportunity Card Chancenkarte
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-bcbf129579de'::uuid, 'Germany Opportunity Card Chancenkarte', 'Germany', 'Opportunity Card Chancenkarte', true, 'Auto-seeded pipeline for germany-opportunity-card')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Germany · Germany Skilled Worker · Skilled Worker
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-732b5fa2fd07'::uuid, 'Germany Skilled Worker', 'Germany', 'Skilled Worker', true, 'Auto-seeded pipeline for germany-skilled-worker')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Germany · Germany Spouse Visa · Spouse Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-89897f58d153'::uuid, 'Germany Spouse Visa', 'Germany', 'Spouse Visa', true, 'Auto-seeded pipeline for germany-spouse-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Germany · Germany Student Visa · Study Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-f038f294bf21'::uuid, 'Germany Student Visa', 'Germany', 'Study Visa', true, 'Auto-seeded pipeline for germany-student-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'LOA / offer secured',
    client_label = 'Offer letter received',
    sort_order = 60,
    color = '#8b5cf6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'offer_letter';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'offer_letter', 'LOA / offer secured', 'Offer letter received', 60, '#8b5cf6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'offer_letter'
  );
  UPDATE public.pipeline_stages SET
    label = 'Tuition deposit paid',
    client_label = 'Tuition payment confirmed',
    sort_order = 65,
    color = '#a855f7',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'tuition_paid';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'tuition_paid', 'Tuition deposit paid', 'Tuition payment confirmed', 65, '#a855f7', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'tuition_paid'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa file preparation',
    client_label = 'Preparing visa application',
    sort_order = 70,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_preparation';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_preparation', 'Visa file preparation', 'Preparing visa application', 70, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_preparation'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa application lodged',
    client_label = 'Visa application submitted',
    sort_order = 75,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_lodged';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_lodged', 'Visa application lodged', 'Visa application submitted', 75, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_lodged'
  );
  UPDATE public.pipeline_stages SET
    label = 'Biometrics / medical',
    client_label = 'Biometrics or medical in progress',
    sort_order = 80,
    color = '#14b8a6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'biometrics_medical';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'biometrics_medical'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa approved',
    client_label = 'Visa approved',
    sort_order = 85,
    color = '#22c55e',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_approved';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_approved'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa refused',
    client_label = 'Application outcome received',
    sort_order = 90,
    color = '#ef4444',
    notify_client = true,
    is_client_visible = false
  WHERE pipeline_id = pid AND key = 'visa_refused';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_refused'
  );
END $$;

-- Germany · Germany Visitor Visa · Visitor Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-4340a4250a7d'::uuid, 'Germany Visitor Visa', 'Germany', 'Visitor Visa', true, 'Auto-seeded pipeline for germany-visitor-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Hungary · Hungary Spouse Visa · Spouse Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-1119027f73b4'::uuid, 'Hungary Spouse Visa', 'Hungary', 'Spouse Visa', true, 'Auto-seeded pipeline for hungary-spouse-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Hungary · Hungary Student Visa · Study Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-7cba8a6f58c5'::uuid, 'Hungary Student Visa', 'Hungary', 'Study Visa', true, 'Auto-seeded pipeline for hungary-student-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'LOA / offer secured',
    client_label = 'Offer letter received',
    sort_order = 60,
    color = '#8b5cf6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'offer_letter';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'offer_letter', 'LOA / offer secured', 'Offer letter received', 60, '#8b5cf6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'offer_letter'
  );
  UPDATE public.pipeline_stages SET
    label = 'Tuition deposit paid',
    client_label = 'Tuition payment confirmed',
    sort_order = 65,
    color = '#a855f7',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'tuition_paid';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'tuition_paid', 'Tuition deposit paid', 'Tuition payment confirmed', 65, '#a855f7', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'tuition_paid'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa file preparation',
    client_label = 'Preparing visa application',
    sort_order = 70,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_preparation';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_preparation', 'Visa file preparation', 'Preparing visa application', 70, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_preparation'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa application lodged',
    client_label = 'Visa application submitted',
    sort_order = 75,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_lodged';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_lodged', 'Visa application lodged', 'Visa application submitted', 75, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_lodged'
  );
  UPDATE public.pipeline_stages SET
    label = 'Biometrics / medical',
    client_label = 'Biometrics or medical in progress',
    sort_order = 80,
    color = '#14b8a6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'biometrics_medical';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'biometrics_medical'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa approved',
    client_label = 'Visa approved',
    sort_order = 85,
    color = '#22c55e',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_approved';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_approved'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa refused',
    client_label = 'Application outcome received',
    sort_order = 90,
    color = '#ef4444',
    notify_client = true,
    is_client_visible = false
  WHERE pipeline_id = pid AND key = 'visa_refused';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_refused'
  );
END $$;

-- Hungary · Hungary Visitor Visa · Visitor Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-86a27e72c002'::uuid, 'Hungary Visitor Visa', 'Hungary', 'Visitor Visa', true, 'Auto-seeded pipeline for hungary-visitor-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Hungary · Hungary Work Permit · Work Permit
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-4de9cfa97c45'::uuid, 'Hungary Work Permit', 'Hungary', 'Work Permit', true, 'Auto-seeded pipeline for hungary-work-permit')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Ireland · Ireland Student Visa · Study Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-86578c82d6eb'::uuid, 'Ireland Student Visa', 'Ireland', 'Study Visa', true, 'Auto-seeded pipeline for ireland-student-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'LOA / offer secured',
    client_label = 'Offer letter received',
    sort_order = 60,
    color = '#8b5cf6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'offer_letter';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'offer_letter', 'LOA / offer secured', 'Offer letter received', 60, '#8b5cf6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'offer_letter'
  );
  UPDATE public.pipeline_stages SET
    label = 'Tuition deposit paid',
    client_label = 'Tuition payment confirmed',
    sort_order = 65,
    color = '#a855f7',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'tuition_paid';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'tuition_paid', 'Tuition deposit paid', 'Tuition payment confirmed', 65, '#a855f7', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'tuition_paid'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa file preparation',
    client_label = 'Preparing visa application',
    sort_order = 70,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_preparation';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_preparation', 'Visa file preparation', 'Preparing visa application', 70, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_preparation'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa application lodged',
    client_label = 'Visa application submitted',
    sort_order = 75,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_lodged';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_lodged', 'Visa application lodged', 'Visa application submitted', 75, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_lodged'
  );
  UPDATE public.pipeline_stages SET
    label = 'Biometrics / medical',
    client_label = 'Biometrics or medical in progress',
    sort_order = 80,
    color = '#14b8a6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'biometrics_medical';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'biometrics_medical'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa approved',
    client_label = 'Visa approved',
    sort_order = 85,
    color = '#22c55e',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_approved';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_approved'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa refused',
    client_label = 'Application outcome received',
    sort_order = 90,
    color = '#ef4444',
    notify_client = true,
    is_client_visible = false
  WHERE pipeline_id = pid AND key = 'visa_refused';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_refused'
  );
END $$;

-- Ireland · Ireland Visitor Visa · Visitor Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-792c56c706a8'::uuid, 'Ireland Visitor Visa', 'Ireland', 'Visitor Visa', true, 'Auto-seeded pipeline for ireland-visitor-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Italy · Italy Student Visa · Study Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-457f9fcc4810'::uuid, 'Italy Student Visa', 'Italy', 'Study Visa', true, 'Auto-seeded pipeline for italy-student-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'LOA / offer secured',
    client_label = 'Offer letter received',
    sort_order = 60,
    color = '#8b5cf6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'offer_letter';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'offer_letter', 'LOA / offer secured', 'Offer letter received', 60, '#8b5cf6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'offer_letter'
  );
  UPDATE public.pipeline_stages SET
    label = 'Tuition deposit paid',
    client_label = 'Tuition payment confirmed',
    sort_order = 65,
    color = '#a855f7',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'tuition_paid';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'tuition_paid', 'Tuition deposit paid', 'Tuition payment confirmed', 65, '#a855f7', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'tuition_paid'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa file preparation',
    client_label = 'Preparing visa application',
    sort_order = 70,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_preparation';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_preparation', 'Visa file preparation', 'Preparing visa application', 70, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_preparation'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa application lodged',
    client_label = 'Visa application submitted',
    sort_order = 75,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_lodged';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_lodged', 'Visa application lodged', 'Visa application submitted', 75, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_lodged'
  );
  UPDATE public.pipeline_stages SET
    label = 'Biometrics / medical',
    client_label = 'Biometrics or medical in progress',
    sort_order = 80,
    color = '#14b8a6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'biometrics_medical';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'biometrics_medical'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa approved',
    client_label = 'Visa approved',
    sort_order = 85,
    color = '#22c55e',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_approved';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_approved'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa refused',
    client_label = 'Application outcome received',
    sort_order = 90,
    color = '#ef4444',
    notify_client = true,
    is_client_visible = false
  WHERE pipeline_id = pid AND key = 'visa_refused';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_refused'
  );
END $$;

-- Italy · Italy Visitor Visa · Visitor Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-d8f5c1280c64'::uuid, 'Italy Visitor Visa', 'Italy', 'Visitor Visa', true, 'Auto-seeded pipeline for italy-visitor-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Latvia · Latvia Spouse Visa · Spouse Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-4ff5883a7b0e'::uuid, 'Latvia Spouse Visa', 'Latvia', 'Spouse Visa', true, 'Auto-seeded pipeline for latvia-spouse-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Latvia · Latvia Student Visa · Study Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-a71c0e915b5a'::uuid, 'Latvia Student Visa', 'Latvia', 'Study Visa', true, 'Auto-seeded pipeline for latvia-student-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'LOA / offer secured',
    client_label = 'Offer letter received',
    sort_order = 60,
    color = '#8b5cf6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'offer_letter';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'offer_letter', 'LOA / offer secured', 'Offer letter received', 60, '#8b5cf6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'offer_letter'
  );
  UPDATE public.pipeline_stages SET
    label = 'Tuition deposit paid',
    client_label = 'Tuition payment confirmed',
    sort_order = 65,
    color = '#a855f7',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'tuition_paid';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'tuition_paid', 'Tuition deposit paid', 'Tuition payment confirmed', 65, '#a855f7', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'tuition_paid'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa file preparation',
    client_label = 'Preparing visa application',
    sort_order = 70,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_preparation';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_preparation', 'Visa file preparation', 'Preparing visa application', 70, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_preparation'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa application lodged',
    client_label = 'Visa application submitted',
    sort_order = 75,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_lodged';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_lodged', 'Visa application lodged', 'Visa application submitted', 75, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_lodged'
  );
  UPDATE public.pipeline_stages SET
    label = 'Biometrics / medical',
    client_label = 'Biometrics or medical in progress',
    sort_order = 80,
    color = '#14b8a6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'biometrics_medical';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'biometrics_medical'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa approved',
    client_label = 'Visa approved',
    sort_order = 85,
    color = '#22c55e',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_approved';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_approved'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa refused',
    client_label = 'Application outcome received',
    sort_order = 90,
    color = '#ef4444',
    notify_client = true,
    is_client_visible = false
  WHERE pipeline_id = pid AND key = 'visa_refused';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_refused'
  );
END $$;

-- Latvia · Latvia Visitor Visa · Visitor Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-b7f11836fda9'::uuid, 'Latvia Visitor Visa', 'Latvia', 'Visitor Visa', true, 'Auto-seeded pipeline for latvia-visitor-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Lithuania · Lithuania Student Visa · Study Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-e94b030f2c53'::uuid, 'Lithuania Student Visa', 'Lithuania', 'Study Visa', true, 'Auto-seeded pipeline for lithuania-student-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'LOA / offer secured',
    client_label = 'Offer letter received',
    sort_order = 60,
    color = '#8b5cf6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'offer_letter';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'offer_letter', 'LOA / offer secured', 'Offer letter received', 60, '#8b5cf6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'offer_letter'
  );
  UPDATE public.pipeline_stages SET
    label = 'Tuition deposit paid',
    client_label = 'Tuition payment confirmed',
    sort_order = 65,
    color = '#a855f7',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'tuition_paid';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'tuition_paid', 'Tuition deposit paid', 'Tuition payment confirmed', 65, '#a855f7', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'tuition_paid'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa file preparation',
    client_label = 'Preparing visa application',
    sort_order = 70,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_preparation';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_preparation', 'Visa file preparation', 'Preparing visa application', 70, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_preparation'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa application lodged',
    client_label = 'Visa application submitted',
    sort_order = 75,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_lodged';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_lodged', 'Visa application lodged', 'Visa application submitted', 75, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_lodged'
  );
  UPDATE public.pipeline_stages SET
    label = 'Biometrics / medical',
    client_label = 'Biometrics or medical in progress',
    sort_order = 80,
    color = '#14b8a6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'biometrics_medical';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'biometrics_medical'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa approved',
    client_label = 'Visa approved',
    sort_order = 85,
    color = '#22c55e',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_approved';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_approved'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa refused',
    client_label = 'Application outcome received',
    sort_order = 90,
    color = '#ef4444',
    notify_client = true,
    is_client_visible = false
  WHERE pipeline_id = pid AND key = 'visa_refused';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_refused'
  );
END $$;

-- Lithuania · Lithuania Visitor Visa · Visitor Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-f6f31670be0f'::uuid, 'Lithuania Visitor Visa', 'Lithuania', 'Visitor Visa', true, 'Auto-seeded pipeline for lithuania-visitor-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Malta · Malta Student Visa · Study Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-87892ea66380'::uuid, 'Malta Student Visa', 'Malta', 'Study Visa', true, 'Auto-seeded pipeline for malta-student-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'LOA / offer secured',
    client_label = 'Offer letter received',
    sort_order = 60,
    color = '#8b5cf6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'offer_letter';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'offer_letter', 'LOA / offer secured', 'Offer letter received', 60, '#8b5cf6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'offer_letter'
  );
  UPDATE public.pipeline_stages SET
    label = 'Tuition deposit paid',
    client_label = 'Tuition payment confirmed',
    sort_order = 65,
    color = '#a855f7',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'tuition_paid';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'tuition_paid', 'Tuition deposit paid', 'Tuition payment confirmed', 65, '#a855f7', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'tuition_paid'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa file preparation',
    client_label = 'Preparing visa application',
    sort_order = 70,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_preparation';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_preparation', 'Visa file preparation', 'Preparing visa application', 70, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_preparation'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa application lodged',
    client_label = 'Visa application submitted',
    sort_order = 75,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_lodged';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_lodged', 'Visa application lodged', 'Visa application submitted', 75, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_lodged'
  );
  UPDATE public.pipeline_stages SET
    label = 'Biometrics / medical',
    client_label = 'Biometrics or medical in progress',
    sort_order = 80,
    color = '#14b8a6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'biometrics_medical';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'biometrics_medical'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa approved',
    client_label = 'Visa approved',
    sort_order = 85,
    color = '#22c55e',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_approved';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_approved'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa refused',
    client_label = 'Application outcome received',
    sort_order = 90,
    color = '#ef4444',
    notify_client = true,
    is_client_visible = false
  WHERE pipeline_id = pid AND key = 'visa_refused';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_refused'
  );
END $$;

-- Malta · Malta Visitor Visa · Visitor Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-9eb931b37690'::uuid, 'Malta Visitor Visa', 'Malta', 'Visitor Visa', true, 'Auto-seeded pipeline for malta-visitor-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Netherlands · Netherlands Student Visa · Study Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-ea32312e37f5'::uuid, 'Netherlands Student Visa', 'Netherlands', 'Study Visa', true, 'Auto-seeded pipeline for netherlands-student-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'LOA / offer secured',
    client_label = 'Offer letter received',
    sort_order = 60,
    color = '#8b5cf6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'offer_letter';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'offer_letter', 'LOA / offer secured', 'Offer letter received', 60, '#8b5cf6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'offer_letter'
  );
  UPDATE public.pipeline_stages SET
    label = 'Tuition deposit paid',
    client_label = 'Tuition payment confirmed',
    sort_order = 65,
    color = '#a855f7',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'tuition_paid';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'tuition_paid', 'Tuition deposit paid', 'Tuition payment confirmed', 65, '#a855f7', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'tuition_paid'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa file preparation',
    client_label = 'Preparing visa application',
    sort_order = 70,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_preparation';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_preparation', 'Visa file preparation', 'Preparing visa application', 70, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_preparation'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa application lodged',
    client_label = 'Visa application submitted',
    sort_order = 75,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_lodged';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_lodged', 'Visa application lodged', 'Visa application submitted', 75, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_lodged'
  );
  UPDATE public.pipeline_stages SET
    label = 'Biometrics / medical',
    client_label = 'Biometrics or medical in progress',
    sort_order = 80,
    color = '#14b8a6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'biometrics_medical';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'biometrics_medical'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa approved',
    client_label = 'Visa approved',
    sort_order = 85,
    color = '#22c55e',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_approved';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_approved'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa refused',
    client_label = 'Application outcome received',
    sort_order = 90,
    color = '#ef4444',
    notify_client = true,
    is_client_visible = false
  WHERE pipeline_id = pid AND key = 'visa_refused';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_refused'
  );
END $$;

-- Netherlands · Netherlands Visitor Visa · Visitor Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-ab03fb2e1445'::uuid, 'Netherlands Visitor Visa', 'Netherlands', 'Visitor Visa', true, 'Auto-seeded pipeline for netherlands-visitor-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- New Zealand · New Zealand Post Study Work · Post Study Work
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-e25265de7bb0'::uuid, 'New Zealand Post Study Work', 'New Zealand', 'Post Study Work', true, 'Auto-seeded pipeline for nz-post-study-work')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- New Zealand · New Zealand Skilled Migrant · Skilled Migrant
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-c878214ccba1'::uuid, 'New Zealand Skilled Migrant', 'New Zealand', 'Skilled Migrant', true, 'Auto-seeded pipeline for nz-skilled-migrant')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- New Zealand · New Zealand Spouse Visa · Spouse Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-ea2ce2f0c4a0'::uuid, 'New Zealand Spouse Visa', 'New Zealand', 'Spouse Visa', true, 'Auto-seeded pipeline for nz-spouse-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- New Zealand · New Zealand Student Visa · Study Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-696aaa823939'::uuid, 'New Zealand Student Visa', 'New Zealand', 'Study Visa', true, 'Auto-seeded pipeline for nz-student-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'LOA / offer secured',
    client_label = 'Offer letter received',
    sort_order = 60,
    color = '#8b5cf6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'offer_letter';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'offer_letter', 'LOA / offer secured', 'Offer letter received', 60, '#8b5cf6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'offer_letter'
  );
  UPDATE public.pipeline_stages SET
    label = 'Tuition deposit paid',
    client_label = 'Tuition payment confirmed',
    sort_order = 65,
    color = '#a855f7',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'tuition_paid';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'tuition_paid', 'Tuition deposit paid', 'Tuition payment confirmed', 65, '#a855f7', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'tuition_paid'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa file preparation',
    client_label = 'Preparing visa application',
    sort_order = 70,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_preparation';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_preparation', 'Visa file preparation', 'Preparing visa application', 70, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_preparation'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa application lodged',
    client_label = 'Visa application submitted',
    sort_order = 75,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_lodged';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_lodged', 'Visa application lodged', 'Visa application submitted', 75, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_lodged'
  );
  UPDATE public.pipeline_stages SET
    label = 'Biometrics / medical',
    client_label = 'Biometrics or medical in progress',
    sort_order = 80,
    color = '#14b8a6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'biometrics_medical';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'biometrics_medical'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa approved',
    client_label = 'Visa approved',
    sort_order = 85,
    color = '#22c55e',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_approved';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_approved'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa refused',
    client_label = 'Application outcome received',
    sort_order = 90,
    color = '#ef4444',
    notify_client = true,
    is_client_visible = false
  WHERE pipeline_id = pid AND key = 'visa_refused';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_refused'
  );
END $$;

-- New Zealand · New Zealand Visitor Visa · Visitor Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-a3a1728d09d1'::uuid, 'New Zealand Visitor Visa', 'New Zealand', 'Visitor Visa', true, 'Auto-seeded pipeline for nz-visitor-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Poland · Poland Eu Blue Card · Eu Blue Card
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-c1e0aa7af21b'::uuid, 'Poland Eu Blue Card', 'Poland', 'Eu Blue Card', true, 'Auto-seeded pipeline for poland-eu-blue-card')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Poland · Poland Spouse Visa · Spouse Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-b1c9d7d60d3f'::uuid, 'Poland Spouse Visa', 'Poland', 'Spouse Visa', true, 'Auto-seeded pipeline for poland-spouse-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Poland · Poland Student Visa · Study Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-827974da9502'::uuid, 'Poland Student Visa', 'Poland', 'Study Visa', true, 'Auto-seeded pipeline for poland-student-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'LOA / offer secured',
    client_label = 'Offer letter received',
    sort_order = 60,
    color = '#8b5cf6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'offer_letter';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'offer_letter', 'LOA / offer secured', 'Offer letter received', 60, '#8b5cf6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'offer_letter'
  );
  UPDATE public.pipeline_stages SET
    label = 'Tuition deposit paid',
    client_label = 'Tuition payment confirmed',
    sort_order = 65,
    color = '#a855f7',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'tuition_paid';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'tuition_paid', 'Tuition deposit paid', 'Tuition payment confirmed', 65, '#a855f7', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'tuition_paid'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa file preparation',
    client_label = 'Preparing visa application',
    sort_order = 70,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_preparation';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_preparation', 'Visa file preparation', 'Preparing visa application', 70, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_preparation'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa application lodged',
    client_label = 'Visa application submitted',
    sort_order = 75,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_lodged';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_lodged', 'Visa application lodged', 'Visa application submitted', 75, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_lodged'
  );
  UPDATE public.pipeline_stages SET
    label = 'Biometrics / medical',
    client_label = 'Biometrics or medical in progress',
    sort_order = 80,
    color = '#14b8a6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'biometrics_medical';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'biometrics_medical'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa approved',
    client_label = 'Visa approved',
    sort_order = 85,
    color = '#22c55e',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_approved';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_approved'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa refused',
    client_label = 'Application outcome received',
    sort_order = 90,
    color = '#ef4444',
    notify_client = true,
    is_client_visible = false
  WHERE pipeline_id = pid AND key = 'visa_refused';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_refused'
  );
END $$;

-- Poland · Poland Visitor Visa · Visitor Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-fb07444de992'::uuid, 'Poland Visitor Visa', 'Poland', 'Visitor Visa', true, 'Auto-seeded pipeline for poland-visitor-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Portugal · Portugal Student Visa · Study Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-a03b6ce84b9a'::uuid, 'Portugal Student Visa', 'Portugal', 'Study Visa', true, 'Auto-seeded pipeline for portugal-student-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'LOA / offer secured',
    client_label = 'Offer letter received',
    sort_order = 60,
    color = '#8b5cf6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'offer_letter';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'offer_letter', 'LOA / offer secured', 'Offer letter received', 60, '#8b5cf6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'offer_letter'
  );
  UPDATE public.pipeline_stages SET
    label = 'Tuition deposit paid',
    client_label = 'Tuition payment confirmed',
    sort_order = 65,
    color = '#a855f7',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'tuition_paid';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'tuition_paid', 'Tuition deposit paid', 'Tuition payment confirmed', 65, '#a855f7', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'tuition_paid'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa file preparation',
    client_label = 'Preparing visa application',
    sort_order = 70,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_preparation';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_preparation', 'Visa file preparation', 'Preparing visa application', 70, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_preparation'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa application lodged',
    client_label = 'Visa application submitted',
    sort_order = 75,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_lodged';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_lodged', 'Visa application lodged', 'Visa application submitted', 75, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_lodged'
  );
  UPDATE public.pipeline_stages SET
    label = 'Biometrics / medical',
    client_label = 'Biometrics or medical in progress',
    sort_order = 80,
    color = '#14b8a6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'biometrics_medical';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'biometrics_medical'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa approved',
    client_label = 'Visa approved',
    sort_order = 85,
    color = '#22c55e',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_approved';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_approved'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa refused',
    client_label = 'Application outcome received',
    sort_order = 90,
    color = '#ef4444',
    notify_client = true,
    is_client_visible = false
  WHERE pipeline_id = pid AND key = 'visa_refused';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_refused'
  );
END $$;

-- Portugal · Portugal Visitor Visa · Visitor Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-df3bc8a95d19'::uuid, 'Portugal Visitor Visa', 'Portugal', 'Visitor Visa', true, 'Auto-seeded pipeline for portugal-visitor-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Singapore · Singapore Employment Pass S Pass · Employment Pass S Pass
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-65912549b147'::uuid, 'Singapore Employment Pass S Pass', 'Singapore', 'Employment Pass S Pass', true, 'Auto-seeded pipeline for singapore-employment-pass')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Singapore · Singapore Spouse Dependent Visa · Spouse Dependent Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-45f7f8cf5383'::uuid, 'Singapore Spouse Dependent Visa', 'Singapore', 'Spouse Dependent Visa', true, 'Auto-seeded pipeline for singapore-spouse-dependent-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Singapore · Singapore Student Pass STP · Study Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-1fbc6bdd40fa'::uuid, 'Singapore Student Pass STP', 'Singapore', 'Study Visa', true, 'Auto-seeded pipeline for singapore-student-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'LOA / offer secured',
    client_label = 'Offer letter received',
    sort_order = 60,
    color = '#8b5cf6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'offer_letter';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'offer_letter', 'LOA / offer secured', 'Offer letter received', 60, '#8b5cf6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'offer_letter'
  );
  UPDATE public.pipeline_stages SET
    label = 'Tuition deposit paid',
    client_label = 'Tuition payment confirmed',
    sort_order = 65,
    color = '#a855f7',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'tuition_paid';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'tuition_paid', 'Tuition deposit paid', 'Tuition payment confirmed', 65, '#a855f7', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'tuition_paid'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa file preparation',
    client_label = 'Preparing visa application',
    sort_order = 70,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_preparation';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_preparation', 'Visa file preparation', 'Preparing visa application', 70, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_preparation'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa application lodged',
    client_label = 'Visa application submitted',
    sort_order = 75,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_lodged';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_lodged', 'Visa application lodged', 'Visa application submitted', 75, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_lodged'
  );
  UPDATE public.pipeline_stages SET
    label = 'Biometrics / medical',
    client_label = 'Biometrics or medical in progress',
    sort_order = 80,
    color = '#14b8a6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'biometrics_medical';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'biometrics_medical'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa approved',
    client_label = 'Visa approved',
    sort_order = 85,
    color = '#22c55e',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_approved';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_approved'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa refused',
    client_label = 'Application outcome received',
    sort_order = 90,
    color = '#ef4444',
    notify_client = true,
    is_client_visible = false
  WHERE pipeline_id = pid AND key = 'visa_refused';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_refused'
  );
END $$;

-- Singapore · Singapore Visitor Visa · Visitor Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-6c03dc5516a7'::uuid, 'Singapore Visitor Visa', 'Singapore', 'Visitor Visa', true, 'Auto-seeded pipeline for singapore-visitor-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Spain · Spain Student Visa · Study Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-7cd5fb1d2749'::uuid, 'Spain Student Visa', 'Spain', 'Study Visa', true, 'Auto-seeded pipeline for spain-student-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'LOA / offer secured',
    client_label = 'Offer letter received',
    sort_order = 60,
    color = '#8b5cf6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'offer_letter';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'offer_letter', 'LOA / offer secured', 'Offer letter received', 60, '#8b5cf6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'offer_letter'
  );
  UPDATE public.pipeline_stages SET
    label = 'Tuition deposit paid',
    client_label = 'Tuition payment confirmed',
    sort_order = 65,
    color = '#a855f7',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'tuition_paid';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'tuition_paid', 'Tuition deposit paid', 'Tuition payment confirmed', 65, '#a855f7', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'tuition_paid'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa file preparation',
    client_label = 'Preparing visa application',
    sort_order = 70,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_preparation';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_preparation', 'Visa file preparation', 'Preparing visa application', 70, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_preparation'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa application lodged',
    client_label = 'Visa application submitted',
    sort_order = 75,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_lodged';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_lodged', 'Visa application lodged', 'Visa application submitted', 75, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_lodged'
  );
  UPDATE public.pipeline_stages SET
    label = 'Biometrics / medical',
    client_label = 'Biometrics or medical in progress',
    sort_order = 80,
    color = '#14b8a6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'biometrics_medical';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'biometrics_medical'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa approved',
    client_label = 'Visa approved',
    sort_order = 85,
    color = '#22c55e',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_approved';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_approved'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa refused',
    client_label = 'Application outcome received',
    sort_order = 90,
    color = '#ef4444',
    notify_client = true,
    is_client_visible = false
  WHERE pipeline_id = pid AND key = 'visa_refused';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_refused'
  );
END $$;

-- Spain · Spain Visitor Visa · Visitor Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-a7469bf17f48'::uuid, 'Spain Visitor Visa', 'Spain', 'Visitor Visa', true, 'Auto-seeded pipeline for spain-visitor-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- Sweden · Sweden Student Visa · Study Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-20133b2c9ac6'::uuid, 'Sweden Student Visa', 'Sweden', 'Study Visa', true, 'Auto-seeded pipeline for sweden-student-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'LOA / offer secured',
    client_label = 'Offer letter received',
    sort_order = 60,
    color = '#8b5cf6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'offer_letter';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'offer_letter', 'LOA / offer secured', 'Offer letter received', 60, '#8b5cf6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'offer_letter'
  );
  UPDATE public.pipeline_stages SET
    label = 'Tuition deposit paid',
    client_label = 'Tuition payment confirmed',
    sort_order = 65,
    color = '#a855f7',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'tuition_paid';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'tuition_paid', 'Tuition deposit paid', 'Tuition payment confirmed', 65, '#a855f7', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'tuition_paid'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa file preparation',
    client_label = 'Preparing visa application',
    sort_order = 70,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_preparation';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_preparation', 'Visa file preparation', 'Preparing visa application', 70, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_preparation'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa application lodged',
    client_label = 'Visa application submitted',
    sort_order = 75,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_lodged';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_lodged', 'Visa application lodged', 'Visa application submitted', 75, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_lodged'
  );
  UPDATE public.pipeline_stages SET
    label = 'Biometrics / medical',
    client_label = 'Biometrics or medical in progress',
    sort_order = 80,
    color = '#14b8a6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'biometrics_medical';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'biometrics_medical'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa approved',
    client_label = 'Visa approved',
    sort_order = 85,
    color = '#22c55e',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_approved';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_approved'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa refused',
    client_label = 'Application outcome received',
    sort_order = 90,
    color = '#ef4444',
    notify_client = true,
    is_client_visible = false
  WHERE pipeline_id = pid AND key = 'visa_refused';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_refused'
  );
END $$;

-- Sweden · Sweden Visitor Visa · Visitor Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-1e92f0cde700'::uuid, 'Sweden Visitor Visa', 'Sweden', 'Visitor Visa', true, 'Auto-seeded pipeline for sweden-visitor-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- UAE · UAE Golden Visa · Golden Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-e1b85beee911'::uuid, 'UAE Golden Visa', 'UAE', 'Golden Visa', true, 'Auto-seeded pipeline for uae-golden-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- UAE · UAE Spouse Dependent Visa · Spouse Dependent Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-c9183ca02610'::uuid, 'UAE Spouse Dependent Visa', 'UAE', 'Spouse Dependent Visa', true, 'Auto-seeded pipeline for uae-spouse-dependent-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- UAE · UAE Student Visa · Study Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-2e228a121ab5'::uuid, 'UAE Student Visa', 'UAE', 'Study Visa', true, 'Auto-seeded pipeline for uae-student-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'LOA / offer secured',
    client_label = 'Offer letter received',
    sort_order = 60,
    color = '#8b5cf6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'offer_letter';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'offer_letter', 'LOA / offer secured', 'Offer letter received', 60, '#8b5cf6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'offer_letter'
  );
  UPDATE public.pipeline_stages SET
    label = 'Tuition deposit paid',
    client_label = 'Tuition payment confirmed',
    sort_order = 65,
    color = '#a855f7',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'tuition_paid';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'tuition_paid', 'Tuition deposit paid', 'Tuition payment confirmed', 65, '#a855f7', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'tuition_paid'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa file preparation',
    client_label = 'Preparing visa application',
    sort_order = 70,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_preparation';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_preparation', 'Visa file preparation', 'Preparing visa application', 70, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_preparation'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa application lodged',
    client_label = 'Visa application submitted',
    sort_order = 75,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_lodged';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_lodged', 'Visa application lodged', 'Visa application submitted', 75, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_lodged'
  );
  UPDATE public.pipeline_stages SET
    label = 'Biometrics / medical',
    client_label = 'Biometrics or medical in progress',
    sort_order = 80,
    color = '#14b8a6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'biometrics_medical';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'biometrics_medical'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa approved',
    client_label = 'Visa approved',
    sort_order = 85,
    color = '#22c55e',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_approved';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_approved'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa refused',
    client_label = 'Application outcome received',
    sort_order = 90,
    color = '#ef4444',
    notify_client = true,
    is_client_visible = false
  WHERE pipeline_id = pid AND key = 'visa_refused';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_refused'
  );
END $$;

-- UAE · UAE Visitor Visa · Visitor Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-8821852d09a8'::uuid, 'UAE Visitor Visa', 'UAE', 'Visitor Visa', true, 'Auto-seeded pipeline for uae-visitor-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- UAE · UAE Work Permit · Work Permit
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-7d1cc7a88626'::uuid, 'UAE Work Permit', 'UAE', 'Work Permit', true, 'Auto-seeded pipeline for uae-work-permit')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- United Kingdom · United Kingdom Graduate Route · Graduate Route
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-62830e81cd6e'::uuid, 'United Kingdom Graduate Route', 'United Kingdom', 'Graduate Route', true, 'Auto-seeded pipeline for uk-graduate-route')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- United Kingdom · United Kingdom Skilled Worker · Skilled Worker
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-646298a47fc9'::uuid, 'United Kingdom Skilled Worker', 'United Kingdom', 'Skilled Worker', true, 'Auto-seeded pipeline for uk-skilled-worker')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- United Kingdom · United Kingdom Spouse Visa · Spouse Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-ac972b308e66'::uuid, 'United Kingdom Spouse Visa', 'United Kingdom', 'Spouse Visa', true, 'Auto-seeded pipeline for uk-spouse-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- United Kingdom · United Kingdom Student Visa · Study Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-d77e64e58856'::uuid, 'United Kingdom Student Visa', 'United Kingdom', 'Study Visa', true, 'Auto-seeded pipeline for uk-student-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'LOA / offer secured',
    client_label = 'Offer letter received',
    sort_order = 60,
    color = '#8b5cf6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'offer_letter';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'offer_letter', 'LOA / offer secured', 'Offer letter received', 60, '#8b5cf6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'offer_letter'
  );
  UPDATE public.pipeline_stages SET
    label = 'Tuition deposit paid',
    client_label = 'Tuition payment confirmed',
    sort_order = 65,
    color = '#a855f7',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'tuition_paid';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'tuition_paid', 'Tuition deposit paid', 'Tuition payment confirmed', 65, '#a855f7', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'tuition_paid'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa file preparation',
    client_label = 'Preparing visa application',
    sort_order = 70,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_preparation';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_preparation', 'Visa file preparation', 'Preparing visa application', 70, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_preparation'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa application lodged',
    client_label = 'Visa application submitted',
    sort_order = 75,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_lodged';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_lodged', 'Visa application lodged', 'Visa application submitted', 75, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_lodged'
  );
  UPDATE public.pipeline_stages SET
    label = 'Biometrics / medical',
    client_label = 'Biometrics or medical in progress',
    sort_order = 80,
    color = '#14b8a6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'biometrics_medical';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'biometrics_medical'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa approved',
    client_label = 'Visa approved',
    sort_order = 85,
    color = '#22c55e',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_approved';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_approved'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa refused',
    client_label = 'Application outcome received',
    sort_order = 90,
    color = '#ef4444',
    notify_client = true,
    is_client_visible = false
  WHERE pipeline_id = pid AND key = 'visa_refused';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_refused'
  );
END $$;

-- United Kingdom · United Kingdom Visitor Visa · Visitor Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-d079aac13902'::uuid, 'United Kingdom Visitor Visa', 'United Kingdom', 'Visitor Visa', true, 'Auto-seeded pipeline for uk-visitor-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- United States · United States Green Card · Green Card
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-74e4191bc159'::uuid, 'United States Green Card', 'United States', 'Green Card', true, 'Auto-seeded pipeline for usa-green-card')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- United States · United States Spouse Visa · Spouse Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-a8b9c31db668'::uuid, 'United States Spouse Visa', 'United States', 'Spouse Visa', true, 'Auto-seeded pipeline for usa-spouse-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;

-- United States · United States Student Visa · Study Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-d17250f0ff85'::uuid, 'United States Student Visa', 'United States', 'Study Visa', true, 'Auto-seeded pipeline for usa-student-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'LOA / offer secured',
    client_label = 'Offer letter received',
    sort_order = 60,
    color = '#8b5cf6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'offer_letter';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'offer_letter', 'LOA / offer secured', 'Offer letter received', 60, '#8b5cf6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'offer_letter'
  );
  UPDATE public.pipeline_stages SET
    label = 'Tuition deposit paid',
    client_label = 'Tuition payment confirmed',
    sort_order = 65,
    color = '#a855f7',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'tuition_paid';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'tuition_paid', 'Tuition deposit paid', 'Tuition payment confirmed', 65, '#a855f7', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'tuition_paid'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa file preparation',
    client_label = 'Preparing visa application',
    sort_order = 70,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_preparation';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_preparation', 'Visa file preparation', 'Preparing visa application', 70, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_preparation'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa application lodged',
    client_label = 'Visa application submitted',
    sort_order = 75,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_lodged';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_lodged', 'Visa application lodged', 'Visa application submitted', 75, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_lodged'
  );
  UPDATE public.pipeline_stages SET
    label = 'Biometrics / medical',
    client_label = 'Biometrics or medical in progress',
    sort_order = 80,
    color = '#14b8a6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'biometrics_medical';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'biometrics_medical'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa approved',
    client_label = 'Visa approved',
    sort_order = 85,
    color = '#22c55e',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'visa_approved';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_approved'
  );
  UPDATE public.pipeline_stages SET
    label = 'Visa refused',
    client_label = 'Application outcome received',
    sort_order = 90,
    color = '#ef4444',
    notify_client = true,
    is_client_visible = false
  WHERE pipeline_id = pid AND key = 'visa_refused';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_refused'
  );
END $$;

-- United States · United States Visitor Visa · Visitor Visa
DO $$
DECLARE
  pid uuid;
BEGIN
  INSERT INTO public.stage_pipelines (id, name, country, service_category, is_active, description)
  VALUES ('c3000001-0001-4000-8000-2b22ec44e33d'::uuid, 'United States Visitor Visa', 'United States', 'Visitor Visa', true, 'Auto-seeded pipeline for usa-visitor-visa')
  ON CONFLICT (country, service_category) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id INTO pid;

  UPDATE public.pipeline_stages SET
    label = 'Enrolled',
    client_label = 'Enrolled',
    sort_order = 10,
    color = '#6366f1',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'enrolled';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'enrolled'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee pending',
    client_label = 'Fee payment pending',
    sort_order = 20,
    color = '#f59e0b',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_pending';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_pending'
  );
  UPDATE public.pipeline_stages SET
    label = 'Consultancy fee received',
    client_label = 'Fee received',
    sort_order = 30,
    color = '#22c55e',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'payment_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'payment_received'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs collection',
    client_label = 'Collecting documents',
    sort_order = 40,
    color = '#3b82f6',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_collection';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_collection'
  );
  UPDATE public.pipeline_stages SET
    label = 'Docs complete',
    client_label = 'Documents ready',
    sort_order = 50,
    color = '#06b6d4',
    notify_client = false,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'docs_complete';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'docs_complete'
  );
  UPDATE public.pipeline_stages SET
    label = 'Application lodged',
    client_label = 'Application submitted',
    sort_order = 60,
    color = '#0ea5e9',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'application_submitted';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'application_submitted', 'Application lodged', 'Application submitted', 60, '#0ea5e9', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'application_submitted'
  );
  UPDATE public.pipeline_stages SET
    label = 'Decision received',
    client_label = 'Decision received',
    sort_order = 70,
    color = '#64748b',
    notify_client = true,
    is_client_visible = true
  WHERE pipeline_id = pid AND key = 'decision_received';
  INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
  SELECT pid, 'decision_received', 'Decision received', 'Decision received', 70, '#64748b', true, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'decision_received'
  );
END $$;
