UPDATE public.service_library
SET service_category = CASE service_category
  WHEN 'Visa & Immigration'   THEN 'visa_immigration'
  WHEN 'Coaching'             THEN 'coaching_services'
  WHEN 'Allied'               THEN 'allied_services'
  WHEN 'Travel & Financial'   THEN 'travel_financial'
  WHEN 'Admission'            THEN 'visa_immigration'
  ELSE service_category
END
WHERE service_category IN ('Visa & Immigration','Coaching','Allied','Travel & Financial','Admission');