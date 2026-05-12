-- Add citizenship_country, country_residence, date_of_birth and gate current_status_canada
INSERT INTO public.assessment_questions (code, section, q_type, label, help_text, options, required, order_index, country, goal, is_active, conditional_on)
VALUES
  ('citizenship_country','personal','country','Country of citizenship (passport)',NULL,NULL,true,1,'Canada','permanent_residence',true,NULL),
  ('country_residence','personal','country','Country you currently live in',NULL,NULL,true,2,'Canada','permanent_residence',true,NULL),
  ('date_of_birth','personal','date','Date of birth','Used to calculate your exact age for CRS scoring.',NULL,true,8,'Canada','permanent_residence',true,NULL)
ON CONFLICT (code) DO UPDATE SET
  section=EXCLUDED.section, q_type=EXCLUDED.q_type, label=EXCLUDED.label, help_text=EXCLUDED.help_text,
  required=EXCLUDED.required, order_index=EXCLUDED.order_index, country=EXCLUDED.country,
  is_active=true, conditional_on=EXCLUDED.conditional_on;

UPDATE public.assessment_questions
SET conditional_on = '{"country_residence":"Canada","citizenship_country__not":"Canada"}'::jsonb
WHERE code='current_status_canada';

UPDATE public.assessment_questions SET required=false WHERE code='age';