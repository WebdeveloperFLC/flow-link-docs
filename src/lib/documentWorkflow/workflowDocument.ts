export interface WorkflowDocument {
  id: string;
  client_id: string;
  case_id: string | null;
  document_type: string;
  custom_type: string | null;
  master_item_code: string | null;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  status: string;
  version: number;
  is_active_version: boolean | null;
  is_shared: boolean;
  section_id: string | null;
  uploaded_at: string;
  deleted_at: string | null;
  person_id: string | null;
}
