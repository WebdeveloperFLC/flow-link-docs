import { supabase } from "@/integrations/supabase/client";
import { notifyUsers, resolveAllClientStakeholderUserIds } from "@/lib/appNotifications";
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

export interface ChatMessageMeta {
  message_id: string;
  parent_id: string | null;
  pinned: boolean;
  edited_at: string | null;
  deleted_at: string | null;
}

export interface ChatReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}
export interface ChatAttachment {
  id: string;
  message_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
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
  parentId?: string | null;
  mentionUserIds?: string[];
  attachments?: Array<{
    storage_path: string;
    file_name: string;
    mime_type?: string | null;
    size_bytes?: number | null;
  }>;
  senderType?: "staff" | "client";
}) {
  const text = opts.message.trim();
  if (!text && !(opts.attachments && opts.attachments.length)) return;
  const { data: u } = await supabase.auth.getUser();
  const sender = u?.user?.id;
  if (!sender) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      channel_type: opts.channelType,
      client_id: opts.clientId ?? null,
      channel_id: opts.channelId ?? null,
      sender_id: sender,
      sender_type: opts.senderType ?? "staff",
      message: text || "(attachment)",
    })
    .select()
    .single();
  if (error) throw error;

  if (opts.parentId) {
    await supabase
      .from("chat_message_meta" as never)
      .insert({ message_id: data.id, parent_id: opts.parentId } as never);
  }
  if (opts.mentionUserIds?.length) {
    await supabase
      .from("chat_message_mentions" as never)
      .insert(opts.mentionUserIds.map((uid) => ({ message_id: data.id, mentioned_user_id: uid })) as never);
  }
  if (opts.attachments?.length) {
    await supabase.from("chat_message_attachments" as never).insert(
      opts.attachments.map((a) => ({
        message_id: data.id,
        storage_path: a.storage_path,
        file_name: a.file_name,
        mime_type: a.mime_type ?? null,
        size_bytes: a.size_bytes ?? null,
      })) as never,
    );
  }

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

  // Portal-originated message → notify the assigned counselor & client stakeholders
  // so they get a NotificationCenter bell + chime. Best-effort, never blocks.
  // Staff-sent messages in the same channel do NOT trigger this (avoids self-notify
  // and noise for outgoing messages).
  if (opts.senderType === "client" && opts.channelType === "staff_client" && opts.clientId) {
    try {
      const recipients = await resolveAllClientStakeholderUserIds(opts.clientId, {
        context: "portal_message",
        message_id: data.id,
      });
      // Exclude the sender just in case a staff user happens to share an auth id
      const userIds = recipients.filter((uid) => uid !== sender);
      if (userIds.length) {
        notifyUsers({
          userIds,
          category: "portal_message",
          severity: "info",
          title: "New message from client",
          body: text.slice(0, 140) || "(attachment)",
          link: `/clients/${opts.clientId}`,
          entityType: "chat_message",
          entityId: data.id,
          dedupeKey: `portal_msg:${data.id}`,
        });
      }
    } catch (e) {
      console.warn("[chat] portal_message_notify_throw", e);
    }
  }

  return data as ChatMessage;
}

export function channelKey(channelType: ChannelType, clientId?: string | null, channelId?: string | null) {
  if (clientId) return `client:${clientId}:${channelType}`;
  return `${channelType}:${channelId}`;
}

// ============ Enhanced helpers ============

export async function listReactions(messageIds: string[]): Promise<ChatReaction[]> {
  if (!messageIds.length) return [];
  const { data } = await supabase
    .from("chat_message_reactions" as never)
    .select("*")
    .in("message_id", messageIds);
  return (data ?? []) as ChatReaction[];
}

export async function toggleReaction(messageId: string, emoji: string) {
  const { data: u } = await supabase.auth.getUser();
  const me = u?.user?.id;
  if (!me) return;
  const { data: existing } = await supabase
    .from("chat_message_reactions" as never)
    .select("id")
    .eq("message_id", messageId)
    .eq("user_id", me)
    .eq("emoji", emoji)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("chat_message_reactions" as never)
      .delete()
      .eq("id", (existing as { id: string }).id);
  } else {
    await supabase
      .from("chat_message_reactions" as never)
      .insert({ message_id: messageId, user_id: me, emoji } as never);
  }
}

export async function listMeta(messageIds: string[]): Promise<ChatMessageMeta[]> {
  if (!messageIds.length) return [];
  const { data } = await supabase
    .from("chat_message_meta" as never)
    .select("*")
    .in("message_id", messageIds);
  return (data ?? []) as ChatMessageMeta[];
}

export async function togglePin(messageId: string, pinned: boolean) {
  const { data: existing } = await supabase
    .from("chat_message_meta" as never)
    .select("message_id")
    .eq("message_id", messageId)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("chat_message_meta" as never)
      .update({ pinned } as never)
      .eq("message_id", messageId);
  } else {
    await supabase.from("chat_message_meta" as never).insert({ message_id: messageId, pinned } as never);
  }
}

export async function listAttachments(messageIds: string[]): Promise<ChatAttachment[]> {
  if (!messageIds.length) return [];
  const { data } = await supabase
    .from("chat_message_attachments" as never)
    .select("*")
    .in("message_id", messageIds);
  return (data ?? []) as ChatAttachment[];
}

export async function uploadChatAttachment(clientId: string | null | undefined, file: File) {
  const { data: u } = await supabase.auth.getUser();
  const me = u?.user?.id;
  if (!me) throw new Error("Not signed in");
  const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const path = `${clientId ?? "shared"}/chat/${Date.now()}_${safe}`;
  const { error } = await supabase.storage.from("client-documents").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return { storage_path: path, file_name: file.name, mime_type: file.type, size_bytes: file.size };
}

export async function getAttachmentUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("client-documents").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function markRead(channelKey: string) {
  const { data: u } = await supabase.auth.getUser();
  const me = u?.user?.id;
  if (!me) return;
  await supabase
    .from("chat_read_receipts" as never)
    .upsert(
      { user_id: me, channel_key: channelKey, last_read_at: new Date().toISOString() } as never,
      { onConflict: "user_id,channel_key" } as never,
    );
}

export async function searchProfiles(query: string, limit = 8) {
  if (!query) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id,full_name,email")
    .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(limit);
  return data ?? [];
}

export function parseMentions(text: string): { cleanText: string; mentionUserIds: string[] } {
  const ids: string[] = [];
  const cleanText = text.replace(/<@([0-9a-fA-F-]{36})>/g, (_, id) => {
    ids.push(id);
    return `@${id.slice(0, 6)}`;
  });
  return { cleanText: text, mentionUserIds: Array.from(new Set(ids)) };
}

export function subscribeChat(opts: {
  channelType: ChannelType;
  clientId?: string | null;
  channelId?: string | null;
  onMessage: (m: ChatMessage) => void;
  onTyping?: (payload: { userId: string; userName?: string }) => void;
}) {
  const key = channelKey(opts.channelType, opts.clientId, opts.channelId);
  const filter = opts.clientId ? `client_id=eq.${opts.clientId}` : `channel_id=eq.${opts.channelId}`;
  const ch = supabase
    .channel(key)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter }, (payload) => {
      const row = payload.new as ChatMessage;
      if (row.channel_type !== opts.channelType) return;
      opts.onMessage(row);
    })
    .on("broadcast", { event: "typing" }, (payload) => {
      opts.onTyping?.(payload.payload as { userId: string; userName?: string });
    })
    .subscribe();
  return {
    unsubscribe: () => {
      supabase.removeChannel(ch);
    },
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
  const { data: memberRows } = await supabase.from("chat_channel_members").select("channel_id").eq("user_id", me);
  const ids = (memberRows ?? []).map((r) => r.channel_id);
  if (!ids.length) return [];
  const { data: channels } = await supabase
    .from("chat_channels")
    .select("*")
    .in("id", ids)
    .order("created_at", { ascending: false });
  const { data: allMembers } = await supabase
    .from("chat_channel_members")
    .select("channel_id,user_id")
    .in("channel_id", ids);
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
    .from("chat_channels")
    .insert({ type: "direct", name: null, created_by: me })
    .select()
    .single();
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
    .from("chat_channels")
    .insert({ type: "team_group", name, created_by: me })
    .select()
    .single();
  if (error) throw error;
  const all = Array.from(new Set([me, ...memberIds]));
  await supabase.from("chat_channel_members").insert(all.map((uid) => ({ channel_id: channel.id, user_id: uid })));
  return channel as ChatChannel;
}
