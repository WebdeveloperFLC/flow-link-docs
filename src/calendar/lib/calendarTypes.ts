export type CalendarProfile = {
  id: string;
  user_id: string;
  full_name: string;
  designation: string | null;
  company_name: string | null;
  company_logo: string | null;
  profile_photo: string | null;
  short_bio: string | null;
  timezone: string;
  booking_slug: string;
  is_active: boolean;
  location: string | null;
  auto_confirm: boolean;
  require_approval: boolean;
  allow_reschedule: boolean;
  allow_cancellation: boolean;
  created_at: string;
  updated_at: string;
};

export type MeetingType = {
  id: string;
  user_id: string;
  meeting_name: string;
  description: string | null;
  slot_duration_minutes: number;
  buffer_minutes: number;
  color_code: string | null;
  is_active: boolean;
};

export type Availability = {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

export type Break = {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  name: string | null;
  is_active: boolean;
  repeat_weekly: boolean;
};

export type UnavailableDate = {
  id: string;
  user_id: string;
  unavailable_date: string;
  reason: string | null;
};

export type CalendarEventStatus =
  | "pending"
  | "scheduled"
  | "completed"
  | "cancelled"
  | "declined"
  | "no_show";

export type CalendarEvent = {
  id: string;
  event_reference: string | null;
  user_id: string;
  meeting_type_id: string;
  event_title: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  host_timezone: string;
  visitor_timezone: string;
  purpose: string | null;
  notes: string | null;
  status: CalendarEventStatus;
  created_at: string;
  updated_at: string;
};

export type CalendarEventWithRelations = CalendarEvent & {
  appointment_type?: string | null;
  cancellation_reason?: string | null;
  internal_notes?: string | null;
  calendar_participants?: Array<{
    id: string;
    full_name: string;
    email: string;
    mobile_number: string;
    company_name: string | null;
    designation: string | null;
  }>;
  calendar_meeting_types?: {
    meeting_name: string;
    color_code: string | null;
    slot_duration_minutes: number;
  } | null;
};

export type CalendarInternalNote = {
  id: string;
  event_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

export type CalendarEventAuditRow = {
  id: string;
  event_id: string;
  from_status: CalendarEventStatus | null;
  to_status: CalendarEventStatus;
  actor_id: string | null;
  actor_kind: string;
  at: string;
};

export const APPOINTMENT_TYPES = [
  "Consultation",
  "Student Visa Counselling",
  "Visitor Visa Counselling",
  "Spouse Visa Counselling",
  "Follow-Up Meeting",
  "Coaching Session",
  "Internal Meeting",
  "Custom",
] as const;

export const STATUS_LABEL: Record<CalendarEventStatus, string> = {
  pending: "Pending",
  scheduled: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  declined: "Declined",
  no_show: "No Show",
};

export const WEEKDAYS = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
] as const;

export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];
export const BUFFER_OPTIONS = [0, 5, 10, 15, 30];

export const COMMON_TIMEZONES = [
  "UTC",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Australia/Sydney",
];