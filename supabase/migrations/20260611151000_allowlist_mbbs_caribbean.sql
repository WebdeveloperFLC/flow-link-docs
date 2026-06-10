-- Extend Service Library country allow-list for MBBS Caribbean institutions.
-- Run before or with mbbs_saba_university migration.

CREATE OR REPLACE FUNCTION public.service_library_country_allow_list_check()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  allowed text[] := ARRAY[
    'United Kingdom','Germany','Ireland','France','Italy','Spain','Netherlands','Sweden',
    'Switzerland','Austria','Belgium','Poland','Malta','Cyprus','Portugal','Finland','Denmark','Norway',
    'Hungary','Lithuania','Latvia','Estonia','Georgia','Russia','Romania','Serbia','Turkey',
    'Canada','United States','Australia','New Zealand','United Arab Emirates','Singapore',
    'Malaysia','Japan','South Korea','Uzbekistan','Kazakhstan','Kyrgyzstan','Philippines','China',
    'Schengen',
    'Saba', 'Caribbean', 'Nevis', 'Cayman Islands'
  ];
BEGIN
  IF NEW.country IS NULL OR NOT (NEW.country = ANY(allowed)) THEN
    RAISE EXCEPTION 'Country % is not in the Service Library allow-list', NEW.country;
  END IF;
  RETURN NEW;
END;
$$;
