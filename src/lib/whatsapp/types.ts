export type WhatsAppConversationStatus =
  | "unmatched_ai_intake"
  | "awaiting_assignment_confirm"
  | "assigned_active"
  | "existing_client"
  | "escalated_admin"
  | "closed";

export interface WhatsAppConversation {
  id: string;
  phone_e164: string;
  phone_display: string | null;
  lead_id: string | null;
  client_id: string | null;
  assigned_user_id: string | null;
  status: WhatsAppConversationStatus;
  intake_data: Record<string, unknown>;
  ai_mode: string;
  last_message_at: string | null;
  last_inbound_at: string | null;
  unread_count_staff: number;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  body: string;
  sent_by: "contact" | "ai" | "staff" | "system";
  sent_by_user_id: string | null;
  provider_message_id: string | null;
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
