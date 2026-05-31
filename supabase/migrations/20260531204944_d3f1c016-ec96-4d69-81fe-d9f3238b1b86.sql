CREATE OR REPLACE FUNCTION public.calendar_resolve_profile(_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile public.calendar_profiles;
  v_types jsonb;
BEGIN
  SELECT * INTO v_profile
  FROM public.calendar_profiles
  WHERE booking_slug = _slug::citext
    AND is_active = true;

  IF v_profile.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', mt.id,
    'meeting_name', mt.meeting_name,
    'slug', mt.slug,
    'description', mt.description,
    'slot_duration_minutes', mt.slot_duration_minutes,
    'buffer_minutes', mt.buffer_minutes,
    'color_code', mt.color_code,
    'booking_window_days', mt.booking_window_days,
    'requires_approval', mt.requires_approval,
    'category', mt.category,
    'is_active', mt.is_active
  ) ORDER BY mt.meeting_name), '[]'::jsonb)
  INTO v_types
  FROM public.calendar_meeting_types mt
  WHERE mt.user_id = v_profile.user_id
    AND mt.is_active = true;

  RETURN jsonb_build_object(
    'profile', jsonb_build_object(
      'full_name', v_profile.full_name,
      'designation', v_profile.designation,
      'company_name', v_profile.company_name,
      'company_logo', v_profile.company_logo,
      'profile_photo', v_profile.profile_photo,
      'short_bio', v_profile.short_bio,
      'timezone', v_profile.timezone,
      'booking_slug', v_profile.booking_slug
    ),
    'meeting_types', v_types
  );
END
$function$;