-- Fast course review counts for Institutions list / dashboard (single table scan).
CREATE OR REPLACE FUNCTION public.upi_course_review_counts()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.can_view_upi_catalog(auth.uid()) OR public.can_view_upi_confidential(auth.uid())
    THEN (
      SELECT json_build_object(
        'published', count(*) FILTER (WHERE review_status = 'published'),
        'pending_review', count(*) FILTER (WHERE review_status = 'pending_review')
      )
      FROM public.upi_courses_staging
    )
    ELSE NULL
  END;
$$;

GRANT EXECUTE ON FUNCTION public.upi_course_review_counts() TO authenticated;
