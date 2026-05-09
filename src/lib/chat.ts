import { supabase } from "@/integrations/supabase/client";

export type ChannelType = "staff_internal" | "staff_client" | "direct" | "team_group";

export interface ChatMessage {
  id: string;
  channel_type: ChannelType;
  client_id: string | null;
  channel_id: string | null;
  sender_id: string;
  sender_type: "staff" | "client";
  message: string;
  created_at: string;
}

export interface ChatChannel {
  id: string;
  type: "direct" | "team_group";
  name: string | null;
  created_by: string;
  created_at: string;
}

export async function listMessages(opts: {
  channelType: ChannelType;
  clientId?: string | null;
  channelId?: string | null;
  limit?: number;
}): Promise<ChatMessage[]> {
  let q = supabase.from("chat_messages").select("*").eq("channel_type", opts.channelType);
  if (opts.clientId) q = q.eq("client_id", opts.clientId);
  if (opts.channelId) q = q.eq("channel_id", opts.channelId);
  const { data, error } = await q.order("created_at", { ascending: true }).limit(opts.limit ?? 200);
  if (error) throw error;
  return (data ?? []) as ChatMessage[];
}

export async function sendMessage(opts: {
  channelType: ChannelType;
  clientId?: string | null;
  channelId?: string | null;
  message: string;
}) {
  const text = opts.message.trim();
  if (!text) return;
  const { data: u } = await supabase.auth.getUser();
  const sender = u?.user?.id;
  if (!sender) throw new Error("Not signed in");
  const { data, error } = await supabase.from("chat_messages").insert({
    channel_type: opts.channelType,
    client_id: opts.clientId ?? null,
    channel_id: opts.channelId ?? null,
    sender_id: sender,
    sender_type: "staff",
    message: text,
  }).select().single();
  if (error) throw error;

  // Mirror to client timeline for per-client channels (best-effort)
  if (opts.clientId && (opts.channelType === "staff_internal" || opts.channelType === "staff_client")) {
    await supabase.from("client_timeline").insert({
      client_id: opts.clientId,
      event_type: "chat",
      actor_id: sender,
      summary: `${opts.channelType === "staff_internal" ? "Internal" : "Client"} chat`,
      metadata: { excerpt: text.slice(0, 120), channelType: opts.channelType } as never,
    });
  }
  return data as ChatMessage;
}

export function channelKey(channelType: ChannelType, clientId?: string | null, channelId?: string | null) {
  if (clientId) return `client:${clientId}:${channelType}`;
  return `${channelType}:${channelId}`;
}

export function subscribeChat(opts: {
  channelType: ChannelType;
  clientId?: string | null;
  channelId?: string | null;
  onMessage: (m: ChatMessage) => void;
  onTyping?: (payload: { userId: string; userName?: string }) => void;
}) {
  const key = channelKey(opts.channelType, opts.clientId, opts.channelId);
  const filter = opts.clientId
    ? `client_id=eq.${opts.clientId}`
    : `channel_id=eq.${opts.channelId}`;
  const ch = supabase
    .channel(key)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages", filter },
      (payload) => {
        const row = payload.new as ChatMessage;
        if (row.channel_type !== opts.channelType) return;
        opts.onMessage(row);
      },
    )
    .on("broadcast", { event: "typing" }, (payload) => {
      opts.onTyping?.(payload.payload as { userId: string; userName?: string });
    })
    .subscribe();
  return {
    unsubscribe: () => { supabase.removeChannel(ch); },
    sendTyping: (userId: string, userName?: string) => {
      ch.send({ type: "broadcast", event: "typing", payload: { userId, userName } });
    },
  };
}

// ---------- DM / team_group channel helpers ----------

export async function listMyChannels(): Promise<(ChatChannel & { members: string[] })[]> {
  const { data: u } = await supabase.auth.getUser();
  const me = u?.user?.id;
  if (!me) return [];
  const { data: memberRows } = await supabase
    .from("chat_channel_members").select("channel_id").eq("user_id", me);
  const ids = (memberRows ?? []).map((r) => r.channel_id);
  if (!ids.length) return [];
  const { data: channels } = await supabase
    .from("chat_channels").select("*").in("id", ids).order("created_at", { ascending: false });
  const { data: allMembers } = await supabase
    .from("chat_channel_members").select("channel_id,user_id").in("channel_id", ids);
  return (channels ?? []).map((c) => ({
    ...(c as ChatChannel),
    members: (allMembers ?? []).filter((m) => m.channel_id === c.id).map((m) => m.user_id),
  }));
}

export async function createDM(otherUserId: string): Promise<ChatChannel> {
  const { data: u } = await supabase.auth.getUser();
  const me = u?.user?.id;
  if (!me) throw new Error("Not signed in");
  // Try to find existing DM with these two members.
  const mine = await listMyChannels();
  const existing = mine.find(
    (c) => c.type === "direct" && c.members.length === 2 && c.members.includes(otherUserId) && c.members.includes(me),
  );
  if (existing) return existing;

  const { data: channel, error } = await supabase
    .from("chat_channels").insert({ type: "direct", name: null, created_by: me }).select().single();
  if (error) throw error;
  await supabase.from("chat_channel_members").insert([
    { channel_id: channel.id, user_id: me },
    { channel_id: channel.id, user_id: otherUserId },
  ]);
  return channel as ChatChannel;
}

export async function createGroup(name: string, memberIds: string[]): Promise<ChatChannel> {
  const { data: u } = await supabase.auth.getUser();
  const me = u?.user?.id;
  if (!me) throw new Error("Not signed in");
  const { data: channel, error } = await supabase
    .from("chat_channels").insert({ type: "team_group", name, created_by: me }).select().single();
  if (error) throw error;
  const all = Array.from(new Set([me, ...memberIds]));
  await supabase.from("chat_channel_members").insert(all.map((uid) => ({ channel_id: channel.id, user_id: uid })));
  return channel as ChatChannel;
}
