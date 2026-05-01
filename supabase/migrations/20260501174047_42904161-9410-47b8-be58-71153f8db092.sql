BEGIN;

DELETE FROM public.binders;
DELETE FROM public.document_verifications;
DELETE FROM public.document_fingerprints;
DELETE FROM public.client_documents;
DELETE FROM public.filled_forms;
DELETE FROM public.questionnaire_instances;
DELETE FROM public.share_links
  WHERE target_type IN ('client','document','binder','filled_form','questionnaire');
DELETE FROM public.client_section_settings;
DELETE FROM public.client_education;
DELETE FROM public.client_profile;
DELETE FROM public.case_people;
DELETE FROM public.clients;
DELETE FROM public.activity_logs
  WHERE entity_type IN ('client','document','binder','case_person','filled_form','questionnaire');

ALTER SEQUENCE public.application_id_seq RESTART WITH 1;

COMMIT;