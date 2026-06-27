export type AemsExceptionStatus =
  | "Draft"
  | "Submitted"
  | "Under Review"
  | "Approved"
  | "Rejected"
  | "Returned for Clarification"
  | "Closed";

export type AemsIncidentStatus = "Open" | "Active" | "Closed";

export type AttendanceExceptionRow = {
  id: string;
  org_id: string;
  employee_id: string;
  branch_id: string | null;
  session_id: string | null;
  work_date: string;
  exception_type_code: string;
  requested_clock_in: string | null;
  requested_clock_out: string | null;
  description: string;
  incident_id: string | null;
  status: AemsExceptionStatus;
  original_clock_in: string | null;
  original_clock_out: string | null;
  approved_clock_in: string | null;
  approved_clock_out: string | null;
  is_manual: boolean;
  is_bulk: boolean;
  submitted_at: string | null;
  resolved_at: string | null;
  resolved_by_label: string | null;
  latest_comment: string | null;
  created_by_label: string | null;
  created_at: string;
  employees?: { full_name: string; emp_code: string; branch_id: string | null } | null;
};

export type WorkforceIncidentRow = {
  id: string;
  org_id: string;
  incident_code: string;
  branch_id: string | null;
  start_at: string;
  end_at: string | null;
  incident_type_code: string;
  description: string;
  status: AemsIncidentStatus;
  created_by_label: string | null;
  closed_by_label: string | null;
  closed_at: string | null;
  created_at: string;
};

export type AemsEvidenceRow = {
  id: string;
  exception_id: string;
  file_name: string;
  storage_path: string;
  mime: string | null;
  file_size_bytes: number | null;
  notes: string | null;
  uploaded_by_label: string | null;
  created_at: string;
};

export type AemsHistoryRow = {
  id: string;
  exception_id: string;
  action: string;
  prev_status: AemsExceptionStatus | null;
  new_status: AemsExceptionStatus | null;
  prev_clock_in: string | null;
  prev_clock_out: string | null;
  new_clock_in: string | null;
  new_clock_out: string | null;
  comment: string | null;
  actor_label: string | null;
  created_at: string;
};

export const AEMS_STATUS_LABEL: Record<AemsExceptionStatus, string> = {
  Draft: "Draft",
  Submitted: "Submitted",
  "Under Review": "Under Review",
  Approved: "Approved",
  Rejected: "Rejected",
  "Returned for Clarification": "Clarification Required",
  Closed: "Closed",
};

export const AEMS_HR_QUEUE_STATUSES: AemsExceptionStatus[] = [
  "Submitted",
  "Under Review",
  "Returned for Clarification",
  "Approved",
  "Rejected",
];
