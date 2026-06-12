-- Forms Library catalog: visa_forms + active questionnaire_schemas (intake stubs).
-- Upload official PDFs via Masters → Forms Library; run parse-form-fields for IRCC forms.
-- Regenerate: node scripts/generate-visa-forms-seed-sql.mjs

-- Canada · Study Visa · Client intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-aa23ded4fa80'::uuid, 'Canada', 'Study Visa', 'Client intake questionnaire', 'INTAKE', 1,
    'Canada/Study Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-b8c0f9dbe6bc'::uuid, 'd4000001-0001-4000-8000-aa23ded4fa80'::uuid, 'Client intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Study Visa — Canada","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-b8c0f9dbe6bc'::uuid WHERE id = 'd4000001-0001-4000-8000-aa23ded4fa80'::uuid;
END $$;

-- Canada · Study Visa · IMM 1294 — Application for Study Permit Made Outside Canada
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-5d79ee8d6485'::uuid, 'Canada', 'Study Visa', 'IMM 1294 — Application for Study Permit Made Outside Canada', 'IMM 1294', 1,
    'Canada/Study Visa/IMM_1294_placeholder.pdf', 'IMM 1294_placeholder.pdf', true, true, 'manual',
    'Upload official IRCC PDF then run Generate questionnaire in Form Builder.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-8ab74ca0be71'::uuid, 'd4000001-0001-4000-8000-5d79ee8d6485'::uuid, 'IMM 1294 — Application for Study Permit Made Outside Canada', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Study Visa — Canada","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-8ab74ca0be71'::uuid WHERE id = 'd4000001-0001-4000-8000-5d79ee8d6485'::uuid;
END $$;

-- Canada · Visitor Visa · Visitor intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-8b5dbe5e278d'::uuid, 'Canada', 'Visitor Visa', 'Visitor intake questionnaire', 'INTAKE', 1,
    'Canada/Visitor Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-664d5237c3f6'::uuid, 'd4000001-0001-4000-8000-8b5dbe5e278d'::uuid, 'Visitor intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Visitor Visa — Canada","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-664d5237c3f6'::uuid WHERE id = 'd4000001-0001-4000-8000-8b5dbe5e278d'::uuid;
END $$;

-- Canada · Visitor Visa · IMM 5257 — Application for Visitor Visa (Temporary Resident Visa)
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-2b369a6d2dc3'::uuid, 'Canada', 'Visitor Visa', 'IMM 5257 — Application for Visitor Visa (Temporary Resident Visa)', 'IMM 5257', 1,
    'Canada/Visitor Visa/IMM_5257_placeholder.pdf', 'IMM 5257_placeholder.pdf', true, true, 'manual',
    'Upload official IRCC PDF then run Generate questionnaire in Form Builder.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-69e43e12e7fa'::uuid, 'd4000001-0001-4000-8000-2b369a6d2dc3'::uuid, 'IMM 5257 — Application for Visitor Visa (Temporary Resident Visa)', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Visitor Visa — Canada","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-69e43e12e7fa'::uuid WHERE id = 'd4000001-0001-4000-8000-2b369a6d2dc3'::uuid;
END $$;

-- Canada · Work Permit · Work permit intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-11ab982449fd'::uuid, 'Canada', 'Work Permit', 'Work permit intake questionnaire', 'INTAKE', 1,
    'Canada/Work Permit/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-edef2ff5a7a1'::uuid, 'd4000001-0001-4000-8000-11ab982449fd'::uuid, 'Work permit intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — Canada","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-edef2ff5a7a1'::uuid WHERE id = 'd4000001-0001-4000-8000-11ab982449fd'::uuid;
END $$;

-- Canada · Work Permit · IMM 5710 — Change conditions / extend stay as worker (Canada)
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-9015896ca44a'::uuid, 'Canada', 'Work Permit', 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 'IMM 5710', 1,
    'Canada/Work Permit/IMM_5710_placeholder.pdf', 'IMM 5710_placeholder.pdf', true, true, 'manual',
    'Upload official IRCC PDF then run Generate questionnaire in Form Builder.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-9402e47fcb79'::uuid, 'd4000001-0001-4000-8000-9015896ca44a'::uuid, 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — Canada","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-9402e47fcb79'::uuid WHERE id = 'd4000001-0001-4000-8000-9015896ca44a'::uuid;
END $$;

-- Canada · Spousal Sponsorship · Family reunification intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-e4cbacf32151'::uuid, 'Canada', 'Spousal Sponsorship', 'Family reunification intake questionnaire', 'INTAKE', 1,
    'Canada/Spousal Sponsorship/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-cb9451678105'::uuid, 'd4000001-0001-4000-8000-e4cbacf32151'::uuid, 'Family reunification intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Spousal Sponsorship — Canada","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-cb9451678105'::uuid WHERE id = 'd4000001-0001-4000-8000-e4cbacf32151'::uuid;
END $$;

-- Canada · Permanent Residency · PR intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-ce204a7b1884'::uuid, 'Canada', 'Permanent Residency', 'PR intake questionnaire', 'INTAKE', 1,
    'Canada/Permanent Residency/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-c9de1366c5d6'::uuid, 'd4000001-0001-4000-8000-ce204a7b1884'::uuid, 'PR intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Permanent Residency — Canada","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-c9de1366c5d6'::uuid WHERE id = 'd4000001-0001-4000-8000-ce204a7b1884'::uuid;
END $$;

-- Australia · Study Visa · Client intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-8171fe7a7b2a'::uuid, 'Australia', 'Study Visa', 'Client intake questionnaire', 'INTAKE', 1,
    'Australia/Study Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-f03164fb2657'::uuid, 'd4000001-0001-4000-8000-8171fe7a7b2a'::uuid, 'Client intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Study Visa — Australia","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-f03164fb2657'::uuid WHERE id = 'd4000001-0001-4000-8000-8171fe7a7b2a'::uuid;
END $$;

-- Australia · Visitor Visa · Visitor intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-ef7ad6e0d6e9'::uuid, 'Australia', 'Visitor Visa', 'Visitor intake questionnaire', 'INTAKE', 1,
    'Australia/Visitor Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-0d4ff6f293c8'::uuid, 'd4000001-0001-4000-8000-ef7ad6e0d6e9'::uuid, 'Visitor intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Visitor Visa — Australia","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-0d4ff6f293c8'::uuid WHERE id = 'd4000001-0001-4000-8000-ef7ad6e0d6e9'::uuid;
END $$;

-- Australia · Work Permit · Work permit intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-a23ee370bf00'::uuid, 'Australia', 'Work Permit', 'Work permit intake questionnaire', 'INTAKE', 1,
    'Australia/Work Permit/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-5663d2351188'::uuid, 'd4000001-0001-4000-8000-a23ee370bf00'::uuid, 'Work permit intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — Australia","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-5663d2351188'::uuid WHERE id = 'd4000001-0001-4000-8000-a23ee370bf00'::uuid;
END $$;

-- Australia · Work Permit · IMM 5710 — Change conditions / extend stay as worker (Canada)
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-87ce2ff181ce'::uuid, 'Australia', 'Work Permit', 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 'IMM 5710', 1,
    'Australia/Work Permit/IMM_5710_placeholder.pdf', 'IMM 5710_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-fb824aaf0016'::uuid, 'd4000001-0001-4000-8000-87ce2ff181ce'::uuid, 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — Australia","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-fb824aaf0016'::uuid WHERE id = 'd4000001-0001-4000-8000-87ce2ff181ce'::uuid;
END $$;

-- Australia · Spousal Sponsorship · Family reunification intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-22b128db359d'::uuid, 'Australia', 'Spousal Sponsorship', 'Family reunification intake questionnaire', 'INTAKE', 1,
    'Australia/Spousal Sponsorship/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-91b51266afc2'::uuid, 'd4000001-0001-4000-8000-22b128db359d'::uuid, 'Family reunification intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Spousal Sponsorship — Australia","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-91b51266afc2'::uuid WHERE id = 'd4000001-0001-4000-8000-22b128db359d'::uuid;
END $$;

-- Australia · Permanent Residency · PR intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-d2ee1015f2a3'::uuid, 'Australia', 'Permanent Residency', 'PR intake questionnaire', 'INTAKE', 1,
    'Australia/Permanent Residency/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-2d6d8cdf4807'::uuid, 'd4000001-0001-4000-8000-d2ee1015f2a3'::uuid, 'PR intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Permanent Residency — Australia","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-2d6d8cdf4807'::uuid WHERE id = 'd4000001-0001-4000-8000-d2ee1015f2a3'::uuid;
END $$;

-- Germany · Study Visa · Client intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-bc598c6b895a'::uuid, 'Germany', 'Study Visa', 'Client intake questionnaire', 'INTAKE', 1,
    'Germany/Study Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-44dcb59c01c1'::uuid, 'd4000001-0001-4000-8000-bc598c6b895a'::uuid, 'Client intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Study Visa — Germany","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-44dcb59c01c1'::uuid WHERE id = 'd4000001-0001-4000-8000-bc598c6b895a'::uuid;
END $$;

-- Germany · Visitor Visa · Visitor intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-5314c1130b6d'::uuid, 'Germany', 'Visitor Visa', 'Visitor intake questionnaire', 'INTAKE', 1,
    'Germany/Visitor Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-bfdc0f081d0c'::uuid, 'd4000001-0001-4000-8000-5314c1130b6d'::uuid, 'Visitor intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Visitor Visa — Germany","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-bfdc0f081d0c'::uuid WHERE id = 'd4000001-0001-4000-8000-5314c1130b6d'::uuid;
END $$;

-- Germany · Work Permit · Work permit intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-0907354fbddd'::uuid, 'Germany', 'Work Permit', 'Work permit intake questionnaire', 'INTAKE', 1,
    'Germany/Work Permit/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-994d49dc776d'::uuid, 'd4000001-0001-4000-8000-0907354fbddd'::uuid, 'Work permit intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — Germany","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-994d49dc776d'::uuid WHERE id = 'd4000001-0001-4000-8000-0907354fbddd'::uuid;
END $$;

-- Germany · Work Permit · IMM 5710 — Change conditions / extend stay as worker (Canada)
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-735a6c912202'::uuid, 'Germany', 'Work Permit', 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 'IMM 5710', 1,
    'Germany/Work Permit/IMM_5710_placeholder.pdf', 'IMM 5710_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-a96979febed2'::uuid, 'd4000001-0001-4000-8000-735a6c912202'::uuid, 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — Germany","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-a96979febed2'::uuid WHERE id = 'd4000001-0001-4000-8000-735a6c912202'::uuid;
END $$;

-- Germany · Spousal Sponsorship · Family reunification intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-468c03bbd3a1'::uuid, 'Germany', 'Spousal Sponsorship', 'Family reunification intake questionnaire', 'INTAKE', 1,
    'Germany/Spousal Sponsorship/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-a9ea7889494b'::uuid, 'd4000001-0001-4000-8000-468c03bbd3a1'::uuid, 'Family reunification intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Spousal Sponsorship — Germany","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-a9ea7889494b'::uuid WHERE id = 'd4000001-0001-4000-8000-468c03bbd3a1'::uuid;
END $$;

-- Germany · Permanent Residency · PR intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-bf69dd3cf9dc'::uuid, 'Germany', 'Permanent Residency', 'PR intake questionnaire', 'INTAKE', 1,
    'Germany/Permanent Residency/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-7b719b381d83'::uuid, 'd4000001-0001-4000-8000-bf69dd3cf9dc'::uuid, 'PR intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Permanent Residency — Germany","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-7b719b381d83'::uuid WHERE id = 'd4000001-0001-4000-8000-bf69dd3cf9dc'::uuid;
END $$;

-- United Kingdom · Study Visa · Client intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-67e1dcd9ae12'::uuid, 'United Kingdom', 'Study Visa', 'Client intake questionnaire', 'INTAKE', 1,
    'United Kingdom/Study Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-9a92926fe44a'::uuid, 'd4000001-0001-4000-8000-67e1dcd9ae12'::uuid, 'Client intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Study Visa — United Kingdom","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-9a92926fe44a'::uuid WHERE id = 'd4000001-0001-4000-8000-67e1dcd9ae12'::uuid;
END $$;

-- United Kingdom · Visitor Visa · Visitor intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-4fa0d191e757'::uuid, 'United Kingdom', 'Visitor Visa', 'Visitor intake questionnaire', 'INTAKE', 1,
    'United Kingdom/Visitor Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-d7587484cc45'::uuid, 'd4000001-0001-4000-8000-4fa0d191e757'::uuid, 'Visitor intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Visitor Visa — United Kingdom","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-d7587484cc45'::uuid WHERE id = 'd4000001-0001-4000-8000-4fa0d191e757'::uuid;
END $$;

-- United Kingdom · Work Permit · Work permit intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-5782ef169372'::uuid, 'United Kingdom', 'Work Permit', 'Work permit intake questionnaire', 'INTAKE', 1,
    'United Kingdom/Work Permit/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-f2fef1b59306'::uuid, 'd4000001-0001-4000-8000-5782ef169372'::uuid, 'Work permit intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — United Kingdom","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-f2fef1b59306'::uuid WHERE id = 'd4000001-0001-4000-8000-5782ef169372'::uuid;
END $$;

-- United Kingdom · Work Permit · IMM 5710 — Change conditions / extend stay as worker (Canada)
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-ee8f2c8d12af'::uuid, 'United Kingdom', 'Work Permit', 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 'IMM 5710', 1,
    'United Kingdom/Work Permit/IMM_5710_placeholder.pdf', 'IMM 5710_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-e5cae19de4f3'::uuid, 'd4000001-0001-4000-8000-ee8f2c8d12af'::uuid, 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — United Kingdom","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-e5cae19de4f3'::uuid WHERE id = 'd4000001-0001-4000-8000-ee8f2c8d12af'::uuid;
END $$;

-- United Kingdom · Spousal Sponsorship · Family reunification intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-93368c6c7dd1'::uuid, 'United Kingdom', 'Spousal Sponsorship', 'Family reunification intake questionnaire', 'INTAKE', 1,
    'United Kingdom/Spousal Sponsorship/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-8aeb6b13624b'::uuid, 'd4000001-0001-4000-8000-93368c6c7dd1'::uuid, 'Family reunification intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Spousal Sponsorship — United Kingdom","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-8aeb6b13624b'::uuid WHERE id = 'd4000001-0001-4000-8000-93368c6c7dd1'::uuid;
END $$;

-- United Kingdom · Permanent Residency · PR intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-c17d09d6aac5'::uuid, 'United Kingdom', 'Permanent Residency', 'PR intake questionnaire', 'INTAKE', 1,
    'United Kingdom/Permanent Residency/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-ec0b5ad3ca67'::uuid, 'd4000001-0001-4000-8000-c17d09d6aac5'::uuid, 'PR intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Permanent Residency — United Kingdom","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-ec0b5ad3ca67'::uuid WHERE id = 'd4000001-0001-4000-8000-c17d09d6aac5'::uuid;
END $$;

-- United States · Study Visa · Client intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-8dfc3981e29f'::uuid, 'United States', 'Study Visa', 'Client intake questionnaire', 'INTAKE', 1,
    'United States/Study Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-c01657430730'::uuid, 'd4000001-0001-4000-8000-8dfc3981e29f'::uuid, 'Client intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Study Visa — United States","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-c01657430730'::uuid WHERE id = 'd4000001-0001-4000-8000-8dfc3981e29f'::uuid;
END $$;

-- United States · Visitor Visa · Visitor intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-1713e57b5f1a'::uuid, 'United States', 'Visitor Visa', 'Visitor intake questionnaire', 'INTAKE', 1,
    'United States/Visitor Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-4395345f3566'::uuid, 'd4000001-0001-4000-8000-1713e57b5f1a'::uuid, 'Visitor intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Visitor Visa — United States","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-4395345f3566'::uuid WHERE id = 'd4000001-0001-4000-8000-1713e57b5f1a'::uuid;
END $$;

-- United States · Work Permit · Work permit intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-8af21f305291'::uuid, 'United States', 'Work Permit', 'Work permit intake questionnaire', 'INTAKE', 1,
    'United States/Work Permit/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-d2be52dfda1c'::uuid, 'd4000001-0001-4000-8000-8af21f305291'::uuid, 'Work permit intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — United States","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-d2be52dfda1c'::uuid WHERE id = 'd4000001-0001-4000-8000-8af21f305291'::uuid;
END $$;

-- United States · Work Permit · IMM 5710 — Change conditions / extend stay as worker (Canada)
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-43b52fccd256'::uuid, 'United States', 'Work Permit', 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 'IMM 5710', 1,
    'United States/Work Permit/IMM_5710_placeholder.pdf', 'IMM 5710_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-b3a8415ab859'::uuid, 'd4000001-0001-4000-8000-43b52fccd256'::uuid, 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — United States","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-b3a8415ab859'::uuid WHERE id = 'd4000001-0001-4000-8000-43b52fccd256'::uuid;
END $$;

-- United States · Spousal Sponsorship · Family reunification intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-c23c4028c222'::uuid, 'United States', 'Spousal Sponsorship', 'Family reunification intake questionnaire', 'INTAKE', 1,
    'United States/Spousal Sponsorship/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-f216d2189b84'::uuid, 'd4000001-0001-4000-8000-c23c4028c222'::uuid, 'Family reunification intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Spousal Sponsorship — United States","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-f216d2189b84'::uuid WHERE id = 'd4000001-0001-4000-8000-c23c4028c222'::uuid;
END $$;

-- United States · Permanent Residency · PR intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-90c3a289eba1'::uuid, 'United States', 'Permanent Residency', 'PR intake questionnaire', 'INTAKE', 1,
    'United States/Permanent Residency/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-fdc524f13482'::uuid, 'd4000001-0001-4000-8000-90c3a289eba1'::uuid, 'PR intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Permanent Residency — United States","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-fdc524f13482'::uuid WHERE id = 'd4000001-0001-4000-8000-90c3a289eba1'::uuid;
END $$;

-- New Zealand · Study Visa · Client intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-e21c7628806d'::uuid, 'New Zealand', 'Study Visa', 'Client intake questionnaire', 'INTAKE', 1,
    'New Zealand/Study Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-4c910e51e52d'::uuid, 'd4000001-0001-4000-8000-e21c7628806d'::uuid, 'Client intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Study Visa — New Zealand","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-4c910e51e52d'::uuid WHERE id = 'd4000001-0001-4000-8000-e21c7628806d'::uuid;
END $$;

-- New Zealand · Visitor Visa · Visitor intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-bbefcd5057da'::uuid, 'New Zealand', 'Visitor Visa', 'Visitor intake questionnaire', 'INTAKE', 1,
    'New Zealand/Visitor Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-bfbb11a9753f'::uuid, 'd4000001-0001-4000-8000-bbefcd5057da'::uuid, 'Visitor intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Visitor Visa — New Zealand","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-bfbb11a9753f'::uuid WHERE id = 'd4000001-0001-4000-8000-bbefcd5057da'::uuid;
END $$;

-- New Zealand · Work Permit · Work permit intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-dd4d2e7ece0d'::uuid, 'New Zealand', 'Work Permit', 'Work permit intake questionnaire', 'INTAKE', 1,
    'New Zealand/Work Permit/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-c4a0c832d3a2'::uuid, 'd4000001-0001-4000-8000-dd4d2e7ece0d'::uuid, 'Work permit intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — New Zealand","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-c4a0c832d3a2'::uuid WHERE id = 'd4000001-0001-4000-8000-dd4d2e7ece0d'::uuid;
END $$;

-- New Zealand · Work Permit · IMM 5710 — Change conditions / extend stay as worker (Canada)
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-9c8ec14c9ddf'::uuid, 'New Zealand', 'Work Permit', 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 'IMM 5710', 1,
    'New Zealand/Work Permit/IMM_5710_placeholder.pdf', 'IMM 5710_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-905c1bda9e2f'::uuid, 'd4000001-0001-4000-8000-9c8ec14c9ddf'::uuid, 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — New Zealand","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-905c1bda9e2f'::uuid WHERE id = 'd4000001-0001-4000-8000-9c8ec14c9ddf'::uuid;
END $$;

-- New Zealand · Spousal Sponsorship · Family reunification intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-a4b66fb429f5'::uuid, 'New Zealand', 'Spousal Sponsorship', 'Family reunification intake questionnaire', 'INTAKE', 1,
    'New Zealand/Spousal Sponsorship/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-b12d3dccfae2'::uuid, 'd4000001-0001-4000-8000-a4b66fb429f5'::uuid, 'Family reunification intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Spousal Sponsorship — New Zealand","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-b12d3dccfae2'::uuid WHERE id = 'd4000001-0001-4000-8000-a4b66fb429f5'::uuid;
END $$;

-- New Zealand · Permanent Residency · PR intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-84dd27399992'::uuid, 'New Zealand', 'Permanent Residency', 'PR intake questionnaire', 'INTAKE', 1,
    'New Zealand/Permanent Residency/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-b8ba98819ff7'::uuid, 'd4000001-0001-4000-8000-84dd27399992'::uuid, 'PR intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Permanent Residency — New Zealand","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-b8ba98819ff7'::uuid WHERE id = 'd4000001-0001-4000-8000-84dd27399992'::uuid;
END $$;

-- Poland · Study Visa · Client intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-b1daf39842a7'::uuid, 'Poland', 'Study Visa', 'Client intake questionnaire', 'INTAKE', 1,
    'Poland/Study Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-12a3a51e8693'::uuid, 'd4000001-0001-4000-8000-b1daf39842a7'::uuid, 'Client intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Study Visa — Poland","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-12a3a51e8693'::uuid WHERE id = 'd4000001-0001-4000-8000-b1daf39842a7'::uuid;
END $$;

-- Poland · Visitor Visa · Visitor intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-b2efc693fb5b'::uuid, 'Poland', 'Visitor Visa', 'Visitor intake questionnaire', 'INTAKE', 1,
    'Poland/Visitor Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-14b410fc0ee1'::uuid, 'd4000001-0001-4000-8000-b2efc693fb5b'::uuid, 'Visitor intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Visitor Visa — Poland","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-14b410fc0ee1'::uuid WHERE id = 'd4000001-0001-4000-8000-b2efc693fb5b'::uuid;
END $$;

-- Poland · Work Permit · Work permit intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-27c58bdbf6a5'::uuid, 'Poland', 'Work Permit', 'Work permit intake questionnaire', 'INTAKE', 1,
    'Poland/Work Permit/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-8011f4ed2501'::uuid, 'd4000001-0001-4000-8000-27c58bdbf6a5'::uuid, 'Work permit intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — Poland","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-8011f4ed2501'::uuid WHERE id = 'd4000001-0001-4000-8000-27c58bdbf6a5'::uuid;
END $$;

-- Poland · Work Permit · IMM 5710 — Change conditions / extend stay as worker (Canada)
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-1f63dc4cea22'::uuid, 'Poland', 'Work Permit', 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 'IMM 5710', 1,
    'Poland/Work Permit/IMM_5710_placeholder.pdf', 'IMM 5710_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-ced3009a5b8c'::uuid, 'd4000001-0001-4000-8000-1f63dc4cea22'::uuid, 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — Poland","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-ced3009a5b8c'::uuid WHERE id = 'd4000001-0001-4000-8000-1f63dc4cea22'::uuid;
END $$;

-- Poland · Spousal Sponsorship · Family reunification intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-629e9106f6b1'::uuid, 'Poland', 'Spousal Sponsorship', 'Family reunification intake questionnaire', 'INTAKE', 1,
    'Poland/Spousal Sponsorship/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-76f778dac437'::uuid, 'd4000001-0001-4000-8000-629e9106f6b1'::uuid, 'Family reunification intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Spousal Sponsorship — Poland","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-76f778dac437'::uuid WHERE id = 'd4000001-0001-4000-8000-629e9106f6b1'::uuid;
END $$;

-- Poland · Permanent Residency · PR intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-e9e986faaf20'::uuid, 'Poland', 'Permanent Residency', 'PR intake questionnaire', 'INTAKE', 1,
    'Poland/Permanent Residency/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-92f438c45a0a'::uuid, 'd4000001-0001-4000-8000-e9e986faaf20'::uuid, 'PR intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Permanent Residency — Poland","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-92f438c45a0a'::uuid WHERE id = 'd4000001-0001-4000-8000-e9e986faaf20'::uuid;
END $$;

-- Hungary · Study Visa · Client intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-7c8951c1160f'::uuid, 'Hungary', 'Study Visa', 'Client intake questionnaire', 'INTAKE', 1,
    'Hungary/Study Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-8942e9e6c52e'::uuid, 'd4000001-0001-4000-8000-7c8951c1160f'::uuid, 'Client intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Study Visa — Hungary","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-8942e9e6c52e'::uuid WHERE id = 'd4000001-0001-4000-8000-7c8951c1160f'::uuid;
END $$;

-- Hungary · Visitor Visa · Visitor intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-98be02290e5b'::uuid, 'Hungary', 'Visitor Visa', 'Visitor intake questionnaire', 'INTAKE', 1,
    'Hungary/Visitor Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-b2a867dfcb56'::uuid, 'd4000001-0001-4000-8000-98be02290e5b'::uuid, 'Visitor intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Visitor Visa — Hungary","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-b2a867dfcb56'::uuid WHERE id = 'd4000001-0001-4000-8000-98be02290e5b'::uuid;
END $$;

-- Hungary · Work Permit · Work permit intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-b911a0d3301d'::uuid, 'Hungary', 'Work Permit', 'Work permit intake questionnaire', 'INTAKE', 1,
    'Hungary/Work Permit/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-a1ab5d681cac'::uuid, 'd4000001-0001-4000-8000-b911a0d3301d'::uuid, 'Work permit intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — Hungary","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-a1ab5d681cac'::uuid WHERE id = 'd4000001-0001-4000-8000-b911a0d3301d'::uuid;
END $$;

-- Hungary · Work Permit · IMM 5710 — Change conditions / extend stay as worker (Canada)
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-16e2ba987cd5'::uuid, 'Hungary', 'Work Permit', 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 'IMM 5710', 1,
    'Hungary/Work Permit/IMM_5710_placeholder.pdf', 'IMM 5710_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-6ea0c5922dda'::uuid, 'd4000001-0001-4000-8000-16e2ba987cd5'::uuid, 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — Hungary","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-6ea0c5922dda'::uuid WHERE id = 'd4000001-0001-4000-8000-16e2ba987cd5'::uuid;
END $$;

-- Hungary · Spousal Sponsorship · Family reunification intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-5507e7587610'::uuid, 'Hungary', 'Spousal Sponsorship', 'Family reunification intake questionnaire', 'INTAKE', 1,
    'Hungary/Spousal Sponsorship/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-c4c9cad810ad'::uuid, 'd4000001-0001-4000-8000-5507e7587610'::uuid, 'Family reunification intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Spousal Sponsorship — Hungary","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-c4c9cad810ad'::uuid WHERE id = 'd4000001-0001-4000-8000-5507e7587610'::uuid;
END $$;

-- Hungary · Permanent Residency · PR intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-6745335f44f0'::uuid, 'Hungary', 'Permanent Residency', 'PR intake questionnaire', 'INTAKE', 1,
    'Hungary/Permanent Residency/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-efdd789cc840'::uuid, 'd4000001-0001-4000-8000-6745335f44f0'::uuid, 'PR intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Permanent Residency — Hungary","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-efdd789cc840'::uuid WHERE id = 'd4000001-0001-4000-8000-6745335f44f0'::uuid;
END $$;

-- Latvia · Study Visa · Client intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-74d1f10355cc'::uuid, 'Latvia', 'Study Visa', 'Client intake questionnaire', 'INTAKE', 1,
    'Latvia/Study Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-f41b55913b91'::uuid, 'd4000001-0001-4000-8000-74d1f10355cc'::uuid, 'Client intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Study Visa — Latvia","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-f41b55913b91'::uuid WHERE id = 'd4000001-0001-4000-8000-74d1f10355cc'::uuid;
END $$;

-- Latvia · Visitor Visa · Visitor intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-9b570371c581'::uuid, 'Latvia', 'Visitor Visa', 'Visitor intake questionnaire', 'INTAKE', 1,
    'Latvia/Visitor Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-bcc04b8188cd'::uuid, 'd4000001-0001-4000-8000-9b570371c581'::uuid, 'Visitor intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Visitor Visa — Latvia","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-bcc04b8188cd'::uuid WHERE id = 'd4000001-0001-4000-8000-9b570371c581'::uuid;
END $$;

-- Latvia · Work Permit · Work permit intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-3d0f89ac3c1b'::uuid, 'Latvia', 'Work Permit', 'Work permit intake questionnaire', 'INTAKE', 1,
    'Latvia/Work Permit/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-f5f876bc8672'::uuid, 'd4000001-0001-4000-8000-3d0f89ac3c1b'::uuid, 'Work permit intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — Latvia","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-f5f876bc8672'::uuid WHERE id = 'd4000001-0001-4000-8000-3d0f89ac3c1b'::uuid;
END $$;

-- Latvia · Work Permit · IMM 5710 — Change conditions / extend stay as worker (Canada)
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-e087569dd8cf'::uuid, 'Latvia', 'Work Permit', 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 'IMM 5710', 1,
    'Latvia/Work Permit/IMM_5710_placeholder.pdf', 'IMM 5710_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-5c2f033e44b0'::uuid, 'd4000001-0001-4000-8000-e087569dd8cf'::uuid, 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — Latvia","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-5c2f033e44b0'::uuid WHERE id = 'd4000001-0001-4000-8000-e087569dd8cf'::uuid;
END $$;

-- Latvia · Spousal Sponsorship · Family reunification intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-aca36f1a3c70'::uuid, 'Latvia', 'Spousal Sponsorship', 'Family reunification intake questionnaire', 'INTAKE', 1,
    'Latvia/Spousal Sponsorship/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-a298fad89abe'::uuid, 'd4000001-0001-4000-8000-aca36f1a3c70'::uuid, 'Family reunification intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Spousal Sponsorship — Latvia","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-a298fad89abe'::uuid WHERE id = 'd4000001-0001-4000-8000-aca36f1a3c70'::uuid;
END $$;

-- Latvia · Permanent Residency · PR intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-d83c0c958095'::uuid, 'Latvia', 'Permanent Residency', 'PR intake questionnaire', 'INTAKE', 1,
    'Latvia/Permanent Residency/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-0d559f967d8f'::uuid, 'd4000001-0001-4000-8000-d83c0c958095'::uuid, 'PR intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Permanent Residency — Latvia","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-0d559f967d8f'::uuid WHERE id = 'd4000001-0001-4000-8000-d83c0c958095'::uuid;
END $$;

-- Singapore · Study Visa · Client intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-2619c1447fb2'::uuid, 'Singapore', 'Study Visa', 'Client intake questionnaire', 'INTAKE', 1,
    'Singapore/Study Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-856fd5aefd8d'::uuid, 'd4000001-0001-4000-8000-2619c1447fb2'::uuid, 'Client intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Study Visa — Singapore","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-856fd5aefd8d'::uuid WHERE id = 'd4000001-0001-4000-8000-2619c1447fb2'::uuid;
END $$;

-- Singapore · Visitor Visa · Visitor intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-8eae881753f1'::uuid, 'Singapore', 'Visitor Visa', 'Visitor intake questionnaire', 'INTAKE', 1,
    'Singapore/Visitor Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-59473a68c4f8'::uuid, 'd4000001-0001-4000-8000-8eae881753f1'::uuid, 'Visitor intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Visitor Visa — Singapore","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-59473a68c4f8'::uuid WHERE id = 'd4000001-0001-4000-8000-8eae881753f1'::uuid;
END $$;

-- Singapore · Work Permit · Work permit intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-3ca27f51b163'::uuid, 'Singapore', 'Work Permit', 'Work permit intake questionnaire', 'INTAKE', 1,
    'Singapore/Work Permit/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-2a5dbcd5a5a2'::uuid, 'd4000001-0001-4000-8000-3ca27f51b163'::uuid, 'Work permit intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — Singapore","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-2a5dbcd5a5a2'::uuid WHERE id = 'd4000001-0001-4000-8000-3ca27f51b163'::uuid;
END $$;

-- Singapore · Work Permit · IMM 5710 — Change conditions / extend stay as worker (Canada)
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-6578b08c0b95'::uuid, 'Singapore', 'Work Permit', 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 'IMM 5710', 1,
    'Singapore/Work Permit/IMM_5710_placeholder.pdf', 'IMM 5710_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-32f98afd5514'::uuid, 'd4000001-0001-4000-8000-6578b08c0b95'::uuid, 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — Singapore","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-32f98afd5514'::uuid WHERE id = 'd4000001-0001-4000-8000-6578b08c0b95'::uuid;
END $$;

-- Singapore · Spousal Sponsorship · Family reunification intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-ffcb0829d0ea'::uuid, 'Singapore', 'Spousal Sponsorship', 'Family reunification intake questionnaire', 'INTAKE', 1,
    'Singapore/Spousal Sponsorship/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-e524537274da'::uuid, 'd4000001-0001-4000-8000-ffcb0829d0ea'::uuid, 'Family reunification intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Spousal Sponsorship — Singapore","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-e524537274da'::uuid WHERE id = 'd4000001-0001-4000-8000-ffcb0829d0ea'::uuid;
END $$;

-- Singapore · Permanent Residency · PR intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-301cd88e9a23'::uuid, 'Singapore', 'Permanent Residency', 'PR intake questionnaire', 'INTAKE', 1,
    'Singapore/Permanent Residency/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-0610c7e98692'::uuid, 'd4000001-0001-4000-8000-301cd88e9a23'::uuid, 'PR intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Permanent Residency — Singapore","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-0610c7e98692'::uuid WHERE id = 'd4000001-0001-4000-8000-301cd88e9a23'::uuid;
END $$;

-- Finland · Study Visa · Client intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-1c71dff9a775'::uuid, 'Finland', 'Study Visa', 'Client intake questionnaire', 'INTAKE', 1,
    'Finland/Study Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-afe871bd25e8'::uuid, 'd4000001-0001-4000-8000-1c71dff9a775'::uuid, 'Client intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Study Visa — Finland","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-afe871bd25e8'::uuid WHERE id = 'd4000001-0001-4000-8000-1c71dff9a775'::uuid;
END $$;

-- Finland · Visitor Visa · Visitor intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-177aed462d5b'::uuid, 'Finland', 'Visitor Visa', 'Visitor intake questionnaire', 'INTAKE', 1,
    'Finland/Visitor Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-9ef7a87e22ba'::uuid, 'd4000001-0001-4000-8000-177aed462d5b'::uuid, 'Visitor intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Visitor Visa — Finland","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-9ef7a87e22ba'::uuid WHERE id = 'd4000001-0001-4000-8000-177aed462d5b'::uuid;
END $$;

-- Finland · Work Permit · Work permit intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-8b7a72d0517d'::uuid, 'Finland', 'Work Permit', 'Work permit intake questionnaire', 'INTAKE', 1,
    'Finland/Work Permit/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-431d129d2e82'::uuid, 'd4000001-0001-4000-8000-8b7a72d0517d'::uuid, 'Work permit intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — Finland","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-431d129d2e82'::uuid WHERE id = 'd4000001-0001-4000-8000-8b7a72d0517d'::uuid;
END $$;

-- Finland · Work Permit · IMM 5710 — Change conditions / extend stay as worker (Canada)
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-bbbaab4e0b4d'::uuid, 'Finland', 'Work Permit', 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 'IMM 5710', 1,
    'Finland/Work Permit/IMM_5710_placeholder.pdf', 'IMM 5710_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-0eec4caa1c40'::uuid, 'd4000001-0001-4000-8000-bbbaab4e0b4d'::uuid, 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — Finland","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-0eec4caa1c40'::uuid WHERE id = 'd4000001-0001-4000-8000-bbbaab4e0b4d'::uuid;
END $$;

-- Finland · Spousal Sponsorship · Family reunification intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-cec4dfe92595'::uuid, 'Finland', 'Spousal Sponsorship', 'Family reunification intake questionnaire', 'INTAKE', 1,
    'Finland/Spousal Sponsorship/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-7583c4988bf3'::uuid, 'd4000001-0001-4000-8000-cec4dfe92595'::uuid, 'Family reunification intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Spousal Sponsorship — Finland","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-7583c4988bf3'::uuid WHERE id = 'd4000001-0001-4000-8000-cec4dfe92595'::uuid;
END $$;

-- Finland · Permanent Residency · PR intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-95310ef61355'::uuid, 'Finland', 'Permanent Residency', 'PR intake questionnaire', 'INTAKE', 1,
    'Finland/Permanent Residency/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-fa14d1b39d63'::uuid, 'd4000001-0001-4000-8000-95310ef61355'::uuid, 'PR intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Permanent Residency — Finland","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-fa14d1b39d63'::uuid WHERE id = 'd4000001-0001-4000-8000-95310ef61355'::uuid;
END $$;

-- France · Study Visa · Client intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-0bb586af38c9'::uuid, 'France', 'Study Visa', 'Client intake questionnaire', 'INTAKE', 1,
    'France/Study Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-307b78a1890f'::uuid, 'd4000001-0001-4000-8000-0bb586af38c9'::uuid, 'Client intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Study Visa — France","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-307b78a1890f'::uuid WHERE id = 'd4000001-0001-4000-8000-0bb586af38c9'::uuid;
END $$;

-- France · Visitor Visa · Visitor intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-620d1f0f5a99'::uuid, 'France', 'Visitor Visa', 'Visitor intake questionnaire', 'INTAKE', 1,
    'France/Visitor Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-3fce14438d3c'::uuid, 'd4000001-0001-4000-8000-620d1f0f5a99'::uuid, 'Visitor intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Visitor Visa — France","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-3fce14438d3c'::uuid WHERE id = 'd4000001-0001-4000-8000-620d1f0f5a99'::uuid;
END $$;

-- France · Work Permit · Work permit intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-3823207a2801'::uuid, 'France', 'Work Permit', 'Work permit intake questionnaire', 'INTAKE', 1,
    'France/Work Permit/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-b02f49c1f845'::uuid, 'd4000001-0001-4000-8000-3823207a2801'::uuid, 'Work permit intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — France","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-b02f49c1f845'::uuid WHERE id = 'd4000001-0001-4000-8000-3823207a2801'::uuid;
END $$;

-- France · Work Permit · IMM 5710 — Change conditions / extend stay as worker (Canada)
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-918affdfd14f'::uuid, 'France', 'Work Permit', 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 'IMM 5710', 1,
    'France/Work Permit/IMM_5710_placeholder.pdf', 'IMM 5710_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-c214cd6880a4'::uuid, 'd4000001-0001-4000-8000-918affdfd14f'::uuid, 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — France","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-c214cd6880a4'::uuid WHERE id = 'd4000001-0001-4000-8000-918affdfd14f'::uuid;
END $$;

-- France · Spousal Sponsorship · Family reunification intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-5d307c606c6d'::uuid, 'France', 'Spousal Sponsorship', 'Family reunification intake questionnaire', 'INTAKE', 1,
    'France/Spousal Sponsorship/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-d20920c69e25'::uuid, 'd4000001-0001-4000-8000-5d307c606c6d'::uuid, 'Family reunification intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Spousal Sponsorship — France","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-d20920c69e25'::uuid WHERE id = 'd4000001-0001-4000-8000-5d307c606c6d'::uuid;
END $$;

-- France · Permanent Residency · PR intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-291548ec2072'::uuid, 'France', 'Permanent Residency', 'PR intake questionnaire', 'INTAKE', 1,
    'France/Permanent Residency/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-ffeb35188513'::uuid, 'd4000001-0001-4000-8000-291548ec2072'::uuid, 'PR intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Permanent Residency — France","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-ffeb35188513'::uuid WHERE id = 'd4000001-0001-4000-8000-291548ec2072'::uuid;
END $$;

-- Italy · Study Visa · Client intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-c9e7fbc3227f'::uuid, 'Italy', 'Study Visa', 'Client intake questionnaire', 'INTAKE', 1,
    'Italy/Study Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-2e350fc32645'::uuid, 'd4000001-0001-4000-8000-c9e7fbc3227f'::uuid, 'Client intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Study Visa — Italy","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-2e350fc32645'::uuid WHERE id = 'd4000001-0001-4000-8000-c9e7fbc3227f'::uuid;
END $$;

-- Italy · Visitor Visa · Visitor intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-274f55f009fd'::uuid, 'Italy', 'Visitor Visa', 'Visitor intake questionnaire', 'INTAKE', 1,
    'Italy/Visitor Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-63f72ddb6e4b'::uuid, 'd4000001-0001-4000-8000-274f55f009fd'::uuid, 'Visitor intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Visitor Visa — Italy","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-63f72ddb6e4b'::uuid WHERE id = 'd4000001-0001-4000-8000-274f55f009fd'::uuid;
END $$;

-- Italy · Work Permit · Work permit intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-96e1f701b7e2'::uuid, 'Italy', 'Work Permit', 'Work permit intake questionnaire', 'INTAKE', 1,
    'Italy/Work Permit/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-0d6ceed65c59'::uuid, 'd4000001-0001-4000-8000-96e1f701b7e2'::uuid, 'Work permit intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — Italy","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-0d6ceed65c59'::uuid WHERE id = 'd4000001-0001-4000-8000-96e1f701b7e2'::uuid;
END $$;

-- Italy · Work Permit · IMM 5710 — Change conditions / extend stay as worker (Canada)
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-37662421e06a'::uuid, 'Italy', 'Work Permit', 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 'IMM 5710', 1,
    'Italy/Work Permit/IMM_5710_placeholder.pdf', 'IMM 5710_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-d344bc7e6f4b'::uuid, 'd4000001-0001-4000-8000-37662421e06a'::uuid, 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — Italy","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-d344bc7e6f4b'::uuid WHERE id = 'd4000001-0001-4000-8000-37662421e06a'::uuid;
END $$;

-- Italy · Spousal Sponsorship · Family reunification intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-9b4cadc8d8de'::uuid, 'Italy', 'Spousal Sponsorship', 'Family reunification intake questionnaire', 'INTAKE', 1,
    'Italy/Spousal Sponsorship/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-ce79310b982d'::uuid, 'd4000001-0001-4000-8000-9b4cadc8d8de'::uuid, 'Family reunification intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Spousal Sponsorship — Italy","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-ce79310b982d'::uuid WHERE id = 'd4000001-0001-4000-8000-9b4cadc8d8de'::uuid;
END $$;

-- Italy · Permanent Residency · PR intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-576dde429ff9'::uuid, 'Italy', 'Permanent Residency', 'PR intake questionnaire', 'INTAKE', 1,
    'Italy/Permanent Residency/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-f6c3880b9c39'::uuid, 'd4000001-0001-4000-8000-576dde429ff9'::uuid, 'PR intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Permanent Residency — Italy","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-f6c3880b9c39'::uuid WHERE id = 'd4000001-0001-4000-8000-576dde429ff9'::uuid;
END $$;

-- Netherlands · Study Visa · Client intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-7e8003ee364f'::uuid, 'Netherlands', 'Study Visa', 'Client intake questionnaire', 'INTAKE', 1,
    'Netherlands/Study Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-dd83d3ac7876'::uuid, 'd4000001-0001-4000-8000-7e8003ee364f'::uuid, 'Client intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Study Visa — Netherlands","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-dd83d3ac7876'::uuid WHERE id = 'd4000001-0001-4000-8000-7e8003ee364f'::uuid;
END $$;

-- Netherlands · Visitor Visa · Visitor intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-540d10ffce52'::uuid, 'Netherlands', 'Visitor Visa', 'Visitor intake questionnaire', 'INTAKE', 1,
    'Netherlands/Visitor Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-2a5f5c342642'::uuid, 'd4000001-0001-4000-8000-540d10ffce52'::uuid, 'Visitor intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Visitor Visa — Netherlands","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-2a5f5c342642'::uuid WHERE id = 'd4000001-0001-4000-8000-540d10ffce52'::uuid;
END $$;

-- Netherlands · Work Permit · Work permit intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-395bb2c861fd'::uuid, 'Netherlands', 'Work Permit', 'Work permit intake questionnaire', 'INTAKE', 1,
    'Netherlands/Work Permit/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-18d710687ddf'::uuid, 'd4000001-0001-4000-8000-395bb2c861fd'::uuid, 'Work permit intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — Netherlands","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-18d710687ddf'::uuid WHERE id = 'd4000001-0001-4000-8000-395bb2c861fd'::uuid;
END $$;

-- Netherlands · Work Permit · IMM 5710 — Change conditions / extend stay as worker (Canada)
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-01a7c7afd7f3'::uuid, 'Netherlands', 'Work Permit', 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 'IMM 5710', 1,
    'Netherlands/Work Permit/IMM_5710_placeholder.pdf', 'IMM 5710_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-c0a0fcb4a86c'::uuid, 'd4000001-0001-4000-8000-01a7c7afd7f3'::uuid, 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — Netherlands","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-c0a0fcb4a86c'::uuid WHERE id = 'd4000001-0001-4000-8000-01a7c7afd7f3'::uuid;
END $$;

-- Netherlands · Spousal Sponsorship · Family reunification intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-8173c74a55d6'::uuid, 'Netherlands', 'Spousal Sponsorship', 'Family reunification intake questionnaire', 'INTAKE', 1,
    'Netherlands/Spousal Sponsorship/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-6c87d49bf327'::uuid, 'd4000001-0001-4000-8000-8173c74a55d6'::uuid, 'Family reunification intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Spousal Sponsorship — Netherlands","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-6c87d49bf327'::uuid WHERE id = 'd4000001-0001-4000-8000-8173c74a55d6'::uuid;
END $$;

-- Netherlands · Permanent Residency · PR intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-adc0a0d79a81'::uuid, 'Netherlands', 'Permanent Residency', 'PR intake questionnaire', 'INTAKE', 1,
    'Netherlands/Permanent Residency/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-2bdb13b2ef6b'::uuid, 'd4000001-0001-4000-8000-adc0a0d79a81'::uuid, 'PR intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Permanent Residency — Netherlands","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-2bdb13b2ef6b'::uuid WHERE id = 'd4000001-0001-4000-8000-adc0a0d79a81'::uuid;
END $$;

-- Ireland · Study Visa · Client intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-6ba73da7ba1c'::uuid, 'Ireland', 'Study Visa', 'Client intake questionnaire', 'INTAKE', 1,
    'Ireland/Study Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-48c3a489cf9c'::uuid, 'd4000001-0001-4000-8000-6ba73da7ba1c'::uuid, 'Client intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Study Visa — Ireland","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-48c3a489cf9c'::uuid WHERE id = 'd4000001-0001-4000-8000-6ba73da7ba1c'::uuid;
END $$;

-- Ireland · Visitor Visa · Visitor intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-4c1f241dc380'::uuid, 'Ireland', 'Visitor Visa', 'Visitor intake questionnaire', 'INTAKE', 1,
    'Ireland/Visitor Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-2acbff08437b'::uuid, 'd4000001-0001-4000-8000-4c1f241dc380'::uuid, 'Visitor intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Visitor Visa — Ireland","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-2acbff08437b'::uuid WHERE id = 'd4000001-0001-4000-8000-4c1f241dc380'::uuid;
END $$;

-- Ireland · Work Permit · Work permit intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-e25ae93b5e0c'::uuid, 'Ireland', 'Work Permit', 'Work permit intake questionnaire', 'INTAKE', 1,
    'Ireland/Work Permit/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-f12af5818a73'::uuid, 'd4000001-0001-4000-8000-e25ae93b5e0c'::uuid, 'Work permit intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — Ireland","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-f12af5818a73'::uuid WHERE id = 'd4000001-0001-4000-8000-e25ae93b5e0c'::uuid;
END $$;

-- Ireland · Work Permit · IMM 5710 — Change conditions / extend stay as worker (Canada)
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-96a09037abcb'::uuid, 'Ireland', 'Work Permit', 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 'IMM 5710', 1,
    'Ireland/Work Permit/IMM_5710_placeholder.pdf', 'IMM 5710_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-24a4344d81ae'::uuid, 'd4000001-0001-4000-8000-96a09037abcb'::uuid, 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — Ireland","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-24a4344d81ae'::uuid WHERE id = 'd4000001-0001-4000-8000-96a09037abcb'::uuid;
END $$;

-- Ireland · Spousal Sponsorship · Family reunification intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-5ab25331c482'::uuid, 'Ireland', 'Spousal Sponsorship', 'Family reunification intake questionnaire', 'INTAKE', 1,
    'Ireland/Spousal Sponsorship/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-0cb33cff2bc0'::uuid, 'd4000001-0001-4000-8000-5ab25331c482'::uuid, 'Family reunification intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Spousal Sponsorship — Ireland","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-0cb33cff2bc0'::uuid WHERE id = 'd4000001-0001-4000-8000-5ab25331c482'::uuid;
END $$;

-- Ireland · Permanent Residency · PR intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-9dc295089fee'::uuid, 'Ireland', 'Permanent Residency', 'PR intake questionnaire', 'INTAKE', 1,
    'Ireland/Permanent Residency/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-26c60a850b9f'::uuid, 'd4000001-0001-4000-8000-9dc295089fee'::uuid, 'PR intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Permanent Residency — Ireland","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-26c60a850b9f'::uuid WHERE id = 'd4000001-0001-4000-8000-9dc295089fee'::uuid;
END $$;

-- UAE · Study Visa · Client intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-066a2add24d5'::uuid, 'UAE', 'Study Visa', 'Client intake questionnaire', 'INTAKE', 1,
    'UAE/Study Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-524e69e2cc57'::uuid, 'd4000001-0001-4000-8000-066a2add24d5'::uuid, 'Client intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Study Visa — UAE","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-524e69e2cc57'::uuid WHERE id = 'd4000001-0001-4000-8000-066a2add24d5'::uuid;
END $$;

-- UAE · Visitor Visa · Visitor intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-8fa391e15e00'::uuid, 'UAE', 'Visitor Visa', 'Visitor intake questionnaire', 'INTAKE', 1,
    'UAE/Visitor Visa/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-fda8d5e2bdce'::uuid, 'd4000001-0001-4000-8000-8fa391e15e00'::uuid, 'Visitor intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Visitor Visa — UAE","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-fda8d5e2bdce'::uuid WHERE id = 'd4000001-0001-4000-8000-8fa391e15e00'::uuid;
END $$;

-- UAE · Work Permit · Work permit intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-aa67c33917d9'::uuid, 'UAE', 'Work Permit', 'Work permit intake questionnaire', 'INTAKE', 1,
    'UAE/Work Permit/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-abbcee6468ae'::uuid, 'd4000001-0001-4000-8000-aa67c33917d9'::uuid, 'Work permit intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — UAE","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-abbcee6468ae'::uuid WHERE id = 'd4000001-0001-4000-8000-aa67c33917d9'::uuid;
END $$;

-- UAE · Work Permit · IMM 5710 — Change conditions / extend stay as worker (Canada)
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-75a463da18b9'::uuid, 'UAE', 'Work Permit', 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 'IMM 5710', 1,
    'UAE/Work Permit/IMM_5710_placeholder.pdf', 'IMM 5710_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-45979b63439d'::uuid, 'd4000001-0001-4000-8000-75a463da18b9'::uuid, 'IMM 5710 — Change conditions / extend stay as worker (Canada)', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Work Permit — UAE","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-45979b63439d'::uuid WHERE id = 'd4000001-0001-4000-8000-75a463da18b9'::uuid;
END $$;

-- UAE · Spousal Sponsorship · Family reunification intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-1cdda26f9271'::uuid, 'UAE', 'Spousal Sponsorship', 'Family reunification intake questionnaire', 'INTAKE', 1,
    'UAE/Spousal Sponsorship/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-779c5655be2f'::uuid, 'd4000001-0001-4000-8000-1cdda26f9271'::uuid, 'Family reunification intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Spousal Sponsorship — UAE","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-779c5655be2f'::uuid WHERE id = 'd4000001-0001-4000-8000-1cdda26f9271'::uuid;
END $$;

-- UAE · Permanent Residency · PR intake questionnaire
DO $$
BEGIN
  INSERT INTO public.visa_forms (
    id, country, category, name, code, version, file_path, file_name, is_active, auto_questionnaire, send_mode, notes
  ) VALUES (
    'd4000001-0001-4000-8000-bb203388bad0'::uuid, 'UAE', 'Permanent Residency', 'PR intake questionnaire', 'INTAKE', 1,
    'UAE/Permanent Residency/INTAKE_placeholder.pdf', 'INTAKE_placeholder.pdf', true, true, 'manual',
    'Intake questionnaire — upload official embassy PDF when available.'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, category = EXCLUDED.category, code = EXCLUDED.code, notes = EXCLUDED.notes, is_active = true;

  INSERT INTO public.questionnaire_schemas (
    id, form_id, name, version, sections, mappings, is_active, is_draft, generated_by_ai
  ) VALUES (
    'd4000002-0001-4000-8000-170578f523e6'::uuid, 'd4000001-0001-4000-8000-bb203388bad0'::uuid, 'PR intake questionnaire', 1, '[{"key":"personal","label":"Personal details","fields":[{"id":"full_name","label":"Full name (as in passport)","type":"text","required":true,"mapping_key":"full_name"},{"id":"date_of_birth","label":"Date of birth","type":"date","required":true,"mapping_key":"date_of_birth"},{"id":"passport_number","label":"Passport number","type":"text","required":true,"mapping_key":"passport_number"},{"id":"passport_expiry","label":"Passport expiry","type":"date","required":true,"mapping_key":"passport_expiry"},{"id":"email_alt","label":"Email address","type":"text","required":true,"mapping_key":"email_alt"},{"id":"phone_alt","label":"Phone number","type":"text","mapping_key":"phone_alt"}]},{"key":"case_notes","label":"Permanent Residency — UAE","fields":[{"id":"case_summary","label":"Brief case summary","type":"textarea","required":true},{"id":"prior_refusals","label":"Any prior visa refusals?","type":"yes_no","required":true},{"id":"counselor_notes","label":"Counselor notes","type":"textarea"}]}]'::jsonb, '{}'::jsonb, true, false, false
  )
  ON CONFLICT (id) DO UPDATE SET sections = EXCLUDED.sections, is_active = true, is_draft = false;

  UPDATE public.visa_forms SET published_schema_id = 'd4000002-0001-4000-8000-170578f523e6'::uuid WHERE id = 'd4000001-0001-4000-8000-bb203388bad0'::uuid;
END $$;
