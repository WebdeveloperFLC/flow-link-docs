export type WtmSessionStatus =
  | "Pending"
  | "Working"
  | "On Break"
  | "Completed"
  | "Locked"
  | "Exception"
  | "Holiday"
  | "Weekly Off";

export type WtmAttendanceStatus =
  | "Present"
  | "Half Day"
  | "Absent"
  | "Holiday"
  | "Weekly Off";

export type WtmPayrollStatus =
  | "Present"
  | "Half Day"
  | "Absent"
  | "Paid Leave"
  | "Unpaid Leave"
  | "Holiday"
  | "Weekly Off";

export type WtmSessionRow = {
  id: string;
  org_id: string;
  employee_id: string;
  attendance_id: string | null;
  shift_id: string | null;
  work_date: string;
  clock_in: string | null;
  clock_out: string | null;
  clock_in_at: string | null;
  clock_out_at: string | null;
  working_duration_min: number;
  break_duration_min: number;
  attendance_status: WtmAttendanceStatus;
  session_status: WtmSessionStatus;
  payroll_status?: WtmPayrollStatus | null;
  is_mispunch?: boolean;
  latest_evaluation_id?: string | null;
  device_info: Record<string, unknown>;
  created_by_label: string | null;
  modified_by_label: string | null;
  created_at: string;
  updated_at: string;
};

export type WtmBreakRow = {
  id: string;
  org_id: string;
  session_id: string;
  break_out: string;
  break_in: string | null;
  break_out_at: string;
  break_in_at: string | null;
  break_duration_min: number;
  sequence_no: number;
  created_at: string;
};

export type WtmTimelineEventRow = {
  id: string;
  org_id: string;
  employee_id: string;
  event_type: string;
  session_id: string | null;
  break_id: string | null;
  payload: Record<string, unknown>;
  actor_label: string | null;
  created_at: string;
};

export type WtmDeviceMeta = {
  device?: string;
  browser?: string;
  user_agent?: string;
  ip?: string;
};

export const WTM_SESSION_STATUS_LABEL: Record<WtmSessionStatus, string> = {
  Pending: "Pending",
  Working: "Working",
  "On Break": "On Break",
  Completed: "Completed",
  Locked: "Locked",
  Exception: "Exception",
  Holiday: "Holiday",
  "Weekly Off": "Weekly Off",
};
