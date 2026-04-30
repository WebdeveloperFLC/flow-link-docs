-- Seed the letter_kinds master list
INSERT INTO public.master_lists (key, label, description)
VALUES ('letter_kinds', 'Letter kinds',
        'Types of letters generated for clients (cover, RCIC, declarations, etc.)')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.master_items (list_key, code, label, sort_order, metadata) VALUES
  ('letter_kinds', 'cover',   'Applicant Cover Letter', 10,
     '{"description":"Letter of explanation written in the client''s voice."}'::jsonb),
  ('letter_kinds', 'rcic',    'RCIC Submission Letter', 20,
     '{"description":"Submission letter signed by the RCIC on the firm''s letterhead."}'::jsonb),
  ('letter_kinds', 'statdec', 'Statutory Declaration',  30,
     '{"description":"Sworn declaration by sponsor / family member in Canadian legal format."}'::jsonb)
ON CONFLICT DO NOTHING;

-- Seed default case sections (idempotent on key)
INSERT INTO public.case_sections (key, label, sort_order, is_default) VALUES
  ('identity',   'Identity & Personal',     10, true),
  ('academic',   'Academic',                20, true),
  ('experience', 'Experience / Employment', 30, true),
  ('financial',  'Financial',               40, true),
  ('forms',      'Visa Forms & Statements', 50, true),
  ('supporting', 'Supporting Documents',    60, true),
  ('additional', 'Additional Documents',    70, true)
ON CONFLICT (key) DO NOTHING;