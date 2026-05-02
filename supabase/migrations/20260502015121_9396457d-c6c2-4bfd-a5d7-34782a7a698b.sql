
-- Repoint documents
UPDATE public.client_documents SET section_id = '682b5a97-2f27-46b6-8d39-a49d671f3957' WHERE section_id = '462ac059-6831-404b-86d4-ec3f2fa23938';
UPDATE public.client_documents SET section_id = '66c87e99-c173-4825-9ff0-c96ddf93f174' WHERE section_id = '35113663-df3c-4e9d-946a-cfd507594dd3';
UPDATE public.client_documents SET section_id = 'a9cdb9bc-758d-4aa8-93e2-f5e536bf6aaf' WHERE section_id = 'ad69ad59-9da3-4fbd-97ca-bc3f992995c5';
UPDATE public.client_documents SET section_id = '4709ff89-81eb-493b-a601-cb5e295e5a77' WHERE section_id IN ('ee498b06-fba0-4e2e-b760-7deaa8f67b66','982b39d5-b0fe-45a9-bec6-7fdff4ed1e5d');

-- Resolve client_section_settings dupes, then repoint
DELETE FROM public.client_section_settings a USING public.client_section_settings b
 WHERE a.client_id = b.client_id
   AND a.section_id IN ('462ac059-6831-404b-86d4-ec3f2fa23938','35113663-df3c-4e9d-946a-cfd507594dd3','ad69ad59-9da3-4fbd-97ca-bc3f992995c5','ee498b06-fba0-4e2e-b760-7deaa8f67b66','982b39d5-b0fe-45a9-bec6-7fdff4ed1e5d')
   AND b.section_id IN ('682b5a97-2f27-46b6-8d39-a49d671f3957','66c87e99-c173-4825-9ff0-c96ddf93f174','a9cdb9bc-758d-4aa8-93e2-f5e536bf6aaf','4709ff89-81eb-493b-a601-cb5e295e5a77')
   AND a.id <> b.id;
UPDATE public.client_section_settings SET section_id = '682b5a97-2f27-46b6-8d39-a49d671f3957' WHERE section_id = '462ac059-6831-404b-86d4-ec3f2fa23938';
UPDATE public.client_section_settings SET section_id = '66c87e99-c173-4825-9ff0-c96ddf93f174' WHERE section_id = '35113663-df3c-4e9d-946a-cfd507594dd3';
UPDATE public.client_section_settings SET section_id = 'a9cdb9bc-758d-4aa8-93e2-f5e536bf6aaf' WHERE section_id = 'ad69ad59-9da3-4fbd-97ca-bc3f992995c5';
UPDATE public.client_section_settings SET section_id = '4709ff89-81eb-493b-a601-cb5e295e5a77' WHERE section_id IN ('ee498b06-fba0-4e2e-b760-7deaa8f67b66','982b39d5-b0fe-45a9-bec6-7fdff4ed1e5d');

-- Repoint binders
UPDATE public.binders SET section_id = '682b5a97-2f27-46b6-8d39-a49d671f3957' WHERE section_id = '462ac059-6831-404b-86d4-ec3f2fa23938';
UPDATE public.binders SET section_id = '66c87e99-c173-4825-9ff0-c96ddf93f174' WHERE section_id = '35113663-df3c-4e9d-946a-cfd507594dd3';
UPDATE public.binders SET section_id = 'a9cdb9bc-758d-4aa8-93e2-f5e536bf6aaf' WHERE section_id = 'ad69ad59-9da3-4fbd-97ca-bc3f992995c5';
UPDATE public.binders SET section_id = '4709ff89-81eb-493b-a601-cb5e295e5a77' WHERE section_id IN ('ee498b06-fba0-4e2e-b760-7deaa8f67b66','982b39d5-b0fe-45a9-bec6-7fdff4ed1e5d');

-- Archive the duplicates
UPDATE public.case_sections SET is_archived = true
 WHERE id IN ('462ac059-6831-404b-86d4-ec3f2fa23938','35113663-df3c-4e9d-946a-cfd507594dd3','ad69ad59-9da3-4fbd-97ca-bc3f992995c5','ee498b06-fba0-4e2e-b760-7deaa8f67b66','982b39d5-b0fe-45a9-bec6-7fdff4ed1e5d');

-- Tidy survivor labels
UPDATE public.case_sections SET label = 'Academic'              WHERE id = '682b5a97-2f27-46b6-8d39-a49d671f3957';
UPDATE public.case_sections SET label = 'Experience'            WHERE id = '66c87e99-c173-4825-9ff0-c96ddf93f174';
UPDATE public.case_sections SET label = 'Financial'             WHERE id = 'a9cdb9bc-758d-4aa8-93e2-f5e536bf6aaf';
UPDATE public.case_sections SET label = 'Supporting Documents'  WHERE id = '4709ff89-81eb-493b-a601-cb5e295e5a77';
