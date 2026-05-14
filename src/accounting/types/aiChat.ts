export type ChatRole = "user" | "assistant";

export type RichBlock =
  | { kind: "table"; payload: { columns: string[]; rows: (string | number)[][]; caption?: string } }
  | { kind: "chart"; payload: { title?: string; data: { x: string; y: number }[] } }
  | { kind: "metric"; payload: { items: { label: string; value: string; delta?: string; tone?: "up" | "down" | "neutral" }[] } }
  | { kind: "reportLink"; payload: { label: string; href: string; description?: string } };

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string; // markdown
  blocks?: RichBlock[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
}