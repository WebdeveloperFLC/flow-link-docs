
-- Germany assessment: clean up duplicates and improve UX

-- 1) Remove/deactivate replaced or duplicate questions
DELETE FROM public.assessment_questions
 WHERE code IN (
   'de_marital_status',
   'de_spouse_qualification',
   'de_previous_stay_months',
   'de_age',
   'de_family_in_germany',
   'de_studied_in_germany'
 );

-- 2) Reshape kept question: marital status to top of personal section
UPDATE public.assessment_questions
   SET label = 'Marital status',
       options = '["single","married","common_law","separated","divorced","widowed"]'::jsonb,
       order_index = 3,
       conditional_on = NULL,
       required = false
 WHERE code = 'de_marital';

-- Ensure existing partner_join question stays gated and clearer
UPDATE public.assessment_questions
   SET label = 'Will your spouse/partner also apply for Germany immigration with you?',
       conditional_on = '{"de_marital":["married","common_law"]}'::jsonb,
       order_index = 30
 WHERE code = 'de_partner_join';

-- Previous stay yes/no kept; ensure ordering and label clarity
UPDATE public.assessment_questions
   SET label = 'Have you previously stayed in Germany legally?',
       order_index = 50,
       section = 'personal',
       conditional_on = NULL
 WHERE code = 'de_previous_germany_stay';

-- 3) Add new / replacement questions
INSERT INTO public.assessment_questions
  (code, section, q_type, label, help_text, options, required, conditional_on, order_index, country, goal)
VALUES
  ('de_dob','personal','date','Date of birth','Used to auto-calculate your age.',NULL,true,NULL,10,'Germany','de_chancenkarte'),

  ('de_partner_qualification','personal','boolean','Does your spouse/partner have a recognised qualification?',NULL,NULL,false,
   '{"de_partner_join":true}'::jsonb,31,'Germany','de_chancenkarte'),
  ('de_partner_language','personal','select','Spouse/partner language ability',NULL,
   '["none","german_a1","german_b1","english_b2","both"]'::jsonb,false,
   '{"de_partner_join":true}'::jsonb,32,'Germany','de_chancenkarte'),
  ('de_partner_skilled_experience','personal','boolean','Does your spouse/partner have skilled work experience?',NULL,NULL,false,
   '{"de_partner_join":true}'::jsonb,33,'Germany','de_chancenkarte'),

  ('de_previous_stay_duration','personal','select','Total duration stayed in Germany',NULL,
   '["lt_3m","3_6m","6_12m","gt_1y"]'::jsonb,false,
   '{"de_previous_germany_stay":true}'::jsonb,51,'Germany','de_chancenkarte'),

  ('de_germany_study_duration','personal','select','Have you ever studied in Germany?',NULL,
   '["no","lt_6m","6_12m","gt_1y"]'::jsonb,false,NULL,52,'Germany','de_chancenkarte'),

  ('de_family_relations','personal','multiselect','Immediate family members living in Germany',NULL,
   '["parent","sibling","spouse","child","other","none"]'::jsonb,false,NULL,53,'Germany','de_chancenkarte'),

  ('de_move_intent','personal','select','When are you planning to move to Germany?',NULL,
   '["immediately","within_6_months","within_1_year","exploring"]'::jsonb,false,NULL,60,'Germany','de_chancenkarte'),

  ('de_documents_ready','personal','multiselect','Documents you currently have ready',NULL,
   '["resume","passport","education_docs","experience_letters"]'::jsonb,false,NULL,61,'Germany','de_chancenkarte')
ON CONFLICT (code) DO UPDATE SET
  section = EXCLUDED.section,
  q_type = EXCLUDED.q_type,
  label = EXCLUDED.label,
  help_text = EXCLUDED.help_text,
  options = EXCLUDED.options,
  conditional_on = EXCLUDED.conditional_on,
  order_index = EXCLUDED.order_index;

-- 4) Update Germany connection + spouse rules to read the new answer keys
UPDATE public.de_chancenkarte_rules
   SET tiers = '[
     { "when": { "de_germany_study_duration_in": ["lt_6m","6_12m","gt_1y"] }, "points": 1, "label": "Studied in Germany" },
     { "when": { "de_previous_germany_stay": true, "de_previous_stay_duration_in": ["6_12m","gt_1y"] }, "points": 1, "label": "Previous stay >= 6 months" },
     { "when": { "de_family_relations_in": ["parent","sibling","spouse","child","other"] }, "points": 1, "label": "Close family in Germany" }
   ]'::jsonb
 WHERE factor = 'germany_ties';

UPDATE public.de_chancenkarte_rules
   SET tiers = '[
     { "when": { "de_partner_join": true, "de_partner_qualification": true }, "points": 1, "label": "Spouse joint application" }
   ]'::jsonb
 WHERE factor = 'spouse';
