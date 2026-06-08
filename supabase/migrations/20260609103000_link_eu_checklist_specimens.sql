-- Link EU checklist HTML specimens (additive)
INSERT INTO public.service_library_checklist_files
  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
SELECT v.library_id, v.file_name, v.file_path, v.mime_type, v.size_bytes, v.version, v.is_current, v.notes
FROM (VALUES
  ('b2000001-0001-4000-8000-000000000081'::uuid, 'France – Student Visa (VLS-TS) — Document Checklist.html', '/specimens/checklists/france-student-visa.html', 'text/html', 109107, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-000000000082'::uuid, 'France – Schengen Visitor Visa (Type C) — Document Checklist.html', '/specimens/checklists/france-visitor-visa.html', 'text/html', 108836, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-000000000091'::uuid, 'Italy – Student Visa (National D Visa) — Document Checklist.html', '/specimens/checklists/italy-student-visa.html', 'text/html', 109137, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-000000000092'::uuid, 'Italy – Schengen Visitor Visa (Type C) — Document Checklist.html', '/specimens/checklists/italy-visitor-visa.html', 'text/html', 108824, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000a1'::uuid, 'Netherlands – Student Visa (MVV + Residence Permit) — Document Checklist.html', '/specimens/checklists/netherlands-student-visa.html', 'text/html', 109152, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000a2'::uuid, 'Netherlands – Schengen Visitor Visa (Type C) — Document Checklist.html', '/specimens/checklists/netherlands-visitor-visa.html', 'text/html', 108842, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000a3'::uuid, 'Ireland – Stamp 2 Student Permission — Document Checklist.html', '/specimens/checklists/ireland-student-visa.html', 'text/html', 109275, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000a4'::uuid, 'Ireland – Short Stay Visit Visa (C) — Document Checklist.html', '/specimens/checklists/ireland-visitor-visa.html', 'text/html', 109006, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000a5'::uuid, 'Spain – Student Visa (National D Visa) — Document Checklist.html', '/specimens/checklists/spain-student-visa.html', 'text/html', 109109, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000a6'::uuid, 'Spain – Schengen Visitor Visa (Type C) — Document Checklist.html', '/specimens/checklists/spain-visitor-visa.html', 'text/html', 108817, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000a7'::uuid, 'Malta – Student Visa (National D Visa) — Document Checklist.html', '/specimens/checklists/malta-student-visa.html', 'text/html', 109111, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000a8'::uuid, 'Malta – Schengen Visitor Visa (Type C) — Document Checklist.html', '/specimens/checklists/malta-visitor-visa.html', 'text/html', 108794, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000a9'::uuid, 'Finland – Residence Permit for Studies — Document Checklist.html', '/specimens/checklists/finland-student-visa.html', 'text/html', 109113, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000aa'::uuid, 'Finland – Schengen Visitor Visa (Type C) — Document Checklist.html', '/specimens/checklists/finland-visitor-visa.html', 'text/html', 108814, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000ab'::uuid, 'Sweden – Residence Permit for Studies — Document Checklist.html', '/specimens/checklists/sweden-student-visa.html', 'text/html', 109139, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000ac'::uuid, 'Sweden – Schengen Visitor Visa (Type C) — Document Checklist.html', '/specimens/checklists/sweden-visitor-visa.html', 'text/html', 108821, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000ad'::uuid, 'Austria – Student Residence Permit — Document Checklist.html', '/specimens/checklists/austria-student-visa.html', 'text/html', 109096, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000ae'::uuid, 'Austria – Schengen Visitor Visa (Type C) — Document Checklist.html', '/specimens/checklists/austria-visitor-visa.html', 'text/html', 108818, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000af'::uuid, 'Belgium – Student Visa (Long Stay / Type D) — Document Checklist.html', '/specimens/checklists/belgium-student-visa.html', 'text/html', 109134, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000b0'::uuid, 'Belgium – Schengen Visitor Visa (Type C) — Document Checklist.html', '/specimens/checklists/belgium-visitor-visa.html', 'text/html', 108802, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000b1'::uuid, 'Denmark – Residence Permit for Studies — Document Checklist.html', '/specimens/checklists/denmark-student-visa.html', 'text/html', 109100, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000b2'::uuid, 'Denmark – Schengen Visitor Visa (Type C) — Document Checklist.html', '/specimens/checklists/denmark-visitor-visa.html', 'text/html', 108802, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000b3'::uuid, 'Portugal – Student Visa (National D Visa) — Document Checklist.html', '/specimens/checklists/portugal-student-visa.html', 'text/html', 109133, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client'),
  ('b2000001-0001-4000-8000-0000000000b4'::uuid, 'Portugal – Schengen Visitor Visa (Type C) — Document Checklist.html', '/specimens/checklists/portugal-visitor-visa.html', 'text/html', 108808, 1, true, 'Future Link branded checklist — fields auto-fill when linked to client')
) AS v(library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_checklist_files c
  WHERE c.library_id = v.library_id
    AND c.file_path = v.file_path
    AND c.is_current = true
);
