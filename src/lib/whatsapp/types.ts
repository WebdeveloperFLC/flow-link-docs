export type WhatsAppConversationStatus =
  | "unmatched_ai_intake"
  | "awaiting_assignment_confirm"
  | "assigned_active"
  | "existing_client"
  | "escalated_admin"
  | "closed";

export interface WhatsAppBusinessLine {
  id: string;
  label: string;
  meta_phone_number_id: string;
  display_phone: string | null;
  line_type: "helpline" | "counselor";
  assigned_user_id: string | null;
  is_default: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppMessageTemplate {
  id: string;
  name: string;
  language_code: string;
  label: string;
  body_preview: string | null;
  param_count: number;
  param_labels: string[];
  active: boolean;
}

export interface WhatsAppAssignment {
  id: string;
  conversation_id: string;
  assigned_user_id: string;
  assigned_by_user_id: string | null;
  created_at: string;
}

export interface WhatsAppConversation {
  id: string;
  phone_e164: string;
  phone_display: string | null;
  lead_id: string | null;
  client_id: string | null;
  assigned_user_id: string | null;
  business_line_id: string | null;
  status: WhatsAppConversationStatus;
  intake_data: Record<string, unknown>;
  ai_mode: string;
  last_message_at: string | null;
  last_inbound_at: string | null;
  unread_count_staff: number;
  created_at: string;
  updated_at: string;
}

export type WhatsAppMessageType = "text" | "image" | "document" | "video" | "audio" | "unknown";

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  body: string;
  sent_by: "contact" | "ai" | "staff" | "system";
  sent_by_user_id: string | null;
  provider_message_id: string | null;
  message_type: WhatsAppMessageType;
  media_storage_path: string | null;
  media_provider_id: string | null;
  media_mime: string | null;
  created_at: string;
}

export const STATUS_LABELS: Record<WhatsAppConversationStatus, string> = {
  unmatched_ai_intake: "AI intake",
  awaiting_assignment_confirm: "Awaiting assign",
  assigned_active: "Assigned",
  existing_client: "Existing client",
  escalated_admin: "Escalated",
  closed: "Closed",
};
