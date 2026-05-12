
-- Canada assessment hardening: deactivate overall language overrides, add new questions.

-- 1. Deactivate "overall" language scores (CRS uses per-skill).
UPDATE public.assessment_questions SET is_active = false
 WHERE code IN ('english_overall', 'french_overall')
   AND country = 'Canada';

-- 2. Deactivate ambiguous "canadian_relatives" boolean; keep "sibling_in_canada" which is the IRCC-recognised one.
UPDATE public.assessment_questions SET is_active = false
 WHERE code = 'canadian_relatives' AND country = 'Canada';

-- 3. Reword sibling question per IRCC scope + add relationship follow-up.
UPDATE public.assessment_questions
   SET label = 'Do you have close relatives in Canada who are citizens or PR holders?',
       help_text = 'Only a sibling (brother/sister) who is a Canadian citizen or PR awards CRS points, but we capture all close relatives for routing.'
 WHERE code = 'sibling_in_canada' AND country = 'Canada';

INSERT INTO public.assessment_questions (code, section, q_type, label, options, required, conditional_on, order_index, country, goal)
VALUES
 ('relative_relationship','canada','select','Relationship of the closest relative in Canada',
   '[{"value":"sibling","label":"Sibling"},{"value":"parent","label":"Parent"},{"value":"aunt_uncle","label":"Aunt / Uncle"},{"value":"cousin","label":"Cousin"},{"value":"grandparent","label":"Grandparent"},{"value":"child","label":"Adult child"},{"value":"other","label":"Other"}]'::jsonb,
   false, '{"sibling_in_canada": true}'::jsonb, 101, 'Canada','permanent_residence')
ON CONFLICT (code) DO UPDATE
   SET label = EXCLUDED.label, options = EXCLUDED.options, conditional_on = EXCLUDED.conditional_on, section = EXCLUDED.section, is_active = true;

-- 4. Relabel work experience for clarity (foreign vs Canadian). Codes unchanged so engine keeps working.
UPDATE public.assessment_questions
   SET label = 'Foreign skilled work experience (years, outside Canada)',
       help_text = 'Paid skilled work experience completed outside Canada in the last 10 years.'
 WHERE code = 'work_experience_years' AND country = 'Canada';

UPDATE public.assessment_questions
   SET label = 'Canadian skilled work experience (years, inside Canada)',
       help_text = 'Paid skilled work experience completed in Canada (excludes self-employment for CEC).'
 WHERE code = 'canadian_work_experience' AND country = 'Canada';

-- 5. Self-employment block.
INSERT INTO public.assessment_questions (code, section, q_type, label, required, conditional_on, order_index, country, goal)
VALUES
 ('self_employed_any','work','boolean','Was any of your skilled work experience self-employed?', false, NULL, 50, 'Canada','permanent_residence'),
 ('self_employed_country','work','text','Self-employed: country', false, '{"self_employed_any": true}'::jsonb, 51, 'Canada','permanent_residence'),
 ('self_employed_years','work','number','Self-employed: years', false, '{"self_employed_any": true}'::jsonb, 52, 'Canada','permanent_residence'),
 ('self_employed_occupation','work','text','Self-employed: occupation', false, '{"self_employed_any": true}'::jsonb, 53, 'Canada','permanent_residence')
ON CONFLICT (code) DO UPDATE
   SET label = EXCLUDED.label, q_type = EXCLUDED.q_type, conditional_on = EXCLUDED.conditional_on, section = EXCLUDED.section, is_active = true;

-- 6. FSW continuity gate.
INSERT INTO public.assessment_questions (code, section, q_type, label, help_text, required, order_index, country, goal)
VALUES
 ('foreign_work_continuous_1yr','work','boolean','At least 1 continuous year of skilled work in the same occupation?',
  'Required for FSW (Federal Skilled Worker). Continuous = uninterrupted, same NOC.', false, 60, 'Canada','permanent_residence')
ON CONFLICT (code) DO UPDATE
   SET label = EXCLUDED.label, help_text = EXCLUDED.help_text, is_active = true;

-- 7. Current immigration status in Canada (drives CEC/AIP/RNIP routing).
INSERT INTO public.assessment_questions (code, section, q_type, label, options, required, order_index, country, goal)
VALUES
 ('current_status_canada','personal','select','Current immigration status in Canada',
   '[{"value":"outside_canada","label":"Outside Canada"},{"value":"visitor","label":"Visitor"},{"value":"student","label":"Student"},{"value":"worker","label":"Worker"},{"value":"pr_holder","label":"PR Holder"}]'::jsonb,
   false, 5, 'Canada','permanent_residence')
ON CONFLICT (code) DO UPDATE
   SET label = EXCLUDED.label, options = EXCLUDED.options, is_active = true, section = EXCLUDED.section;

-- 8. Open-to-any-province gate, makes province_preference conditional.
INSERT INTO public.assessment_questions (code, section, q_type, label, required, order_index, country, goal)
VALUES
 ('open_to_any_province','province','boolean','Are you open to settling in any Canadian province?', false, 1, 'Canada','permanent_residence')
ON CONFLICT (code) DO UPDATE
   SET label = EXCLUDED.label, is_active = true, section = EXCLUDED.section;

UPDATE public.assessment_questions
   SET conditional_on = '{"open_to_any_province": false}'::jsonb,
       label = 'Preferred province(s)',
       order_index = 2
 WHERE code = 'province_preference' AND country = 'Canada';
