-- Expand allowed source_type values so the Sources tab can mirror Documents kinds
ALTER TABLE public.upi_institution_sources
  DROP CONSTRAINT IF EXISTS upi_institution_sources_source_type_check;

ALTER TABLE public.upi_institution_sources
  ADD CONSTRAINT upi_institution_sources_source_type_check
  CHECK (source_type IN (
    'website_url','listing_page','scholarship_page','tuition_page',
    'international_page','pdf_brochure','excel_sheet','csv_feed',
    'api_endpoint','uploaded_email','json_feed','sitemap',
    'program_sheet','brochure','agreement','commission_sheet','promotion_campaign'
  ));