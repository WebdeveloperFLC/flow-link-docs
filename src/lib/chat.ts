import { supabase } from "@/integrations/supabase/client";
import { notifyUsers, resolveAllClientStakeholderUserIds } from "@/lib/appNotifications";
import { logActivity } from "@/lib/activity";
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
    const { error: attErr } = await supabase.from("chat_message_attachments" as never).insert(
      opts.attachments.map((a) => ({
        message_id: data.id,
        storage_path: a.storage_path,
        file_name: a.file_name,
        mime_type: a.mime_type ?? null,
        size_bytes: a.size_bytes ?? null,
      })) as never,
    );
    if (attErr) throw attErr;
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

  // Portal client messages: DB trigger fn_notify_portal_chat_message inserts staff notifications.
  await notifyChatRecipients({
    message: data as ChatMessage,
    text,
    senderId: sender,
    mentionUserIds: opts.mentionUserIds,
    senderType: opts.senderType ?? "staff",
  });

  return data as ChatMessage;
}

function chatLink(m: ChatMessage): string | null {
  if (m.client_id && m.channel_type === "staff_internal") {
    return `/messages?tab=clients&client=${m.client_id}&clientChannel=internal`;
  }
  if (m.client_id && m.channel_type === "staff_client") {
    return `/messages?tab=clients&client=${m.client_id}&clientChannel=portal`;
  }
  if (m.channel_id) {
    return `/messages?tab=${m.channel_type === "team_group" ? "groups" : "direct"}&channel=${m.channel_id}`;
  }
  return null;
}

async function listChannelMemberIds(channelId: string): Promise<string[]> {
  const { data } = await supabase.from("chat_channel_members").select("user_id").eq("channel_id", channelId);
  return (data ?? []).map((r) => r.user_id);
}

async function notifyChatRecipients(opts: {
  message: ChatMessage;
  text: string;
  senderId: string;
  mentionUserIds?: string[];
  senderType: "staff" | "client";
}) {
  const { message: m, text, senderId, mentionUserIds, senderType } = opts;
  const excerpt = text.slice(0, 140) || "(attachment)";
  const link = chatLink(m);

  try {
    if (mentionUserIds?.length) {
      const mentionTargets = mentionUserIds.filter((uid) => uid !== senderId);
      if (mentionTargets.length) {
        await notifyUsers({
          userIds: mentionTargets,
          category: "mention",
          severity: "info",
          title: "You were mentioned in chat",
          body: excerpt,
          link,
          entityType: "chat_message",
          entityId: m.id,
          dedupeKey: `mention:${m.id}`,
        });
      }
    }

    if (m.channel_type === "direct" && m.channel_id) {
      const members = await listChannelMemberIds(m.channel_id);
      await notifyUsers({
        userIds: members.filter((uid) => uid !== senderId),
        category: "direct_message",
        severity: "info",
        title: "New direct message",
        body: excerpt,
        link,
        entityType: "chat_message",
        entityId: m.id,
        dedupeKey: `direct_msg:${m.id}`,
      });
    } else if (m.channel_type === "team_group" && m.channel_id) {
      const members = await listChannelMemberIds(m.channel_id);
      await notifyUsers({
        userIds: members.filter((uid) => uid !== senderId),
        category: "team_message",
        severity: "info",
        title: "New team channel message",
        body: excerpt,
        link,
        entityType: "chat_message",
        entityId: m.id,
        dedupeKey: `team_msg:${m.id}`,
      });
    } else if (
      m.channel_type === "staff_internal" &&
      m.client_id &&
      senderType === "staff"
    ) {
      const recipients = await resolveAllClientStakeholderUserIds(m.client_id, {
        context: "client_team_message",
        message_id: m.id,
      });
      await notifyUsers({
        userIds: recipients.filter((uid) => uid !== senderId),
        category: "client_team_message",
        severity: "info",
        title: "New client team note",
        body: excerpt,
        link,
        entityType: "chat_message",
        entityId: m.id,
        dedupeKey: `client_team_msg:${m.id}`,
      });
    }
  } catch (e) {
    console.warn("[chat] notify_recipients_throw", e);
  }
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

export async function uploadChatAttachment(opts: {
  clientId?: string | null;
  channelId?: string | null;
  file: File;
}) {
  const { data: u } = await supabase.auth.getUser();
  const me = u?.user?.id;
  if (!me) throw new Error("Not signed in");
  const safe = opts.file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const path = opts.clientId
    ? `${opts.clientId}/chat/${Date.now()}_${safe}`
    : opts.channelId
      ? `channels/${opts.channelId}/chat/${Date.now()}_${safe}`
      : null;
  if (!path) throw new Error("Cannot attach files without a conversation context");
  const { error } = await supabase.storage
    .from("client-documents")
    .upload(path, opts.file, { contentType: opts.file.type });
  if (error) throw error;
  return {
    storage_path: path,
    file_name: opts.file.name,
    mime_type: opts.file.type,
    size_bytes: opts.file.size,
  };
}

export interface ClientTeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  source: "owner" | "counselor" | "access" | "default_team" | "team";
  removable: boolean;
  accessId?: string | null;
}

export async function listClientTeamMembers(clientId: string): Promise<ClientTeamMember[]> {
  const { data: cli } = await supabase
    .from("clients")
    .select("assigned_counselor_id,owner_id,created_by")
    .eq("id", clientId)
    .maybeSingle();

  const ownerId = cli?.owner_id ?? cli?.created_by ?? null;
  const counselorId = cli?.assigned_counselor_id ?? null;

  const [uaRes, taRes, dtmRes] = await Promise.all([
    supabase
      .from("client_access")
      .select("id,user_id,permission,revoked_at")
      .eq("client_id", clientId)
      .not("user_id", "is", null),
    supabase
      .from("client_access")
      .select("id,team_id,permission,revoked_at")
      .eq("client_id", clientId)
      .not("team_id", "is", null),
    ownerId
      ? supabase
          .from("default_team_members")
          .select("member_id,revoked_at")
          .eq("owner_id", ownerId)
          .is("revoked_at", null)
      : Promise.resolve({ data: [] as { member_id: string; revoked_at: string | null }[] }),
  ]);

  const roster = new Map<string, ClientTeamMember>();

  const upsert = (id: string, row: Omit<ClientTeamMember, "id" | "full_name" | "email">) => {
    const prev = roster.get(id);
    if (!prev) {
      roster.set(id, { id, full_name: null, email: null, ...row });
      return;
    }
    if (row.removable) prev.removable = true;
    if (row.accessId) prev.accessId = row.accessId;
  };

  if (ownerId) upsert(ownerId, { role: "Owner", source: "owner", removable: false });
  if (counselorId && counselorId !== ownerId) {
    upsert(counselorId, { role: "Counselor", source: "counselor", removable: false });
  }

  for (const row of uaRes.data ?? []) {
    if (!row.user_id || row.revoked_at) continue;
    if (row.user_id === ownerId || row.user_id === counselorId) continue;
    upsert(row.user_id, {
      role: "Team",
      source: "access",
      removable: true,
      accessId: row.id,
    });
  }

  for (const row of dtmRes.data ?? []) {
    if (!row.member_id || row.member_id === ownerId) continue;
    upsert(row.member_id, { role: "Default team", source: "default_team", removable: false });
  }

  const teamIds = (taRes.data ?? []).filter((r) => !r.revoked_at).map((r) => r.team_id);
  if (teamIds.length) {
    const { data: teamMembers } = await supabase
      .from("team_members")
      .select("user_id")
      .in("team_id", teamIds);
    for (const tm of teamMembers ?? []) {
      if (!tm.user_id || tm.user_id === ownerId || tm.user_id === counselorId) continue;
      upsert(tm.user_id, { role: "Team", source: "team", removable: false });
    }
  }

  const ids = Array.from(roster.keys());
  if (!ids.length) return [];

  const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);
  for (const p of profs ?? []) {
    const row = roster.get(p.id);
    if (row) {
      row.full_name = p.full_name;
      row.email = p.email;
    }
  }

  return Array.from(roster.values()).sort((a, b) => {
    const order = (r: string) =>
      r === "Owner" ? 0 : r === "Counselor" ? 1 : r === "Default team" ? 2 : 3;
    const d = order(a.role) - order(b.role);
    if (d !== 0) return d;
    return (a.full_name ?? a.email ?? "").localeCompare(b.full_name ?? b.email ?? "");
  });
}

export async function addClientChatMember(
  clientId: string,
  userId: string,
  clientName?: string,
): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const me = u?.user?.id;
  if (!me) throw new Error("Not signed in");

  const { data: existing } = await supabase
    .from("client_access")
    .select("id,revoked_at")
    .eq("client_id", clientId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.revoked_at) {
    const { error } = await supabase
      .from("client_access")
      .update({ permission: "view", revoked_at: null, granted_by: me })
      .eq("id", existing.id);
    if (error) throw error;
  } else if (existing) {
    return;
  } else {
    const { error } = await supabase.from("client_access").insert({
      client_id: clientId,
      user_id: userId,
      permission: "view",
      granted_by: me,
    });
    if (error) throw error;
  }

  await logActivity("client.chat_member_added", "client", clientId, { user_id: userId });

  try {
    let actorName = "A team member";
    const { data: p } = await supabase.from("profiles").select("full_name,email").eq("id", me).maybeSingle();
    actorName = p?.full_name ?? p?.email ?? actorName;
    await notifyUsers({
      userIds: [userId],
      category: "client_access_granted",
      severity: "info",
      title: "Added to client internal chat",
      body: `${actorName} added you to the internal thread${clientName ? ` for ${clientName}` : ""}`,
      link: `/messages?tab=clients&client=${clientId}&clientChannel=internal`,
      entityType: "client",
      entityId: clientId,
      dedupeKey: `chat-member:${userId}:${clientId}`,
      metadata: { permission: "view", actor_id: me, actor_name: actorName, client_name: clientName ?? null },
    });
  } catch {
    /* notification failure must not block */
  }
}

export async function removeClientChatMember(clientId: string, member: ClientTeamMember): Promise<void> {
  if (!member.removable || !member.accessId) {
    throw new Error("This team member cannot be removed from the chat here");
  }
  const { error } = await supabase.from("client_access").delete().eq("id", member.accessId);
  if (error) throw error;
  await logActivity("client.chat_member_removed", "client", clientId, { user_id: member.id });
}

export interface ClientChatThreadSummary {
  clientId: string;
  fullName: string;
  lastMessage: string | null;
  lastAt: string | null;
  unread: boolean;
}

export async function listClientChatThreads(limit = 100): Promise<ClientChatThreadSummary[]> {
  const { data: u } = await supabase.auth.getUser();
  const me = u?.user?.id;
  const { data: clients } = await supabase
    .from("clients")
    .select("id,full_name")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (!clients?.length) return [];

  const clientIds = clients.map((c) => c.id);
  const { data: msgs } = await supabase
    .from("chat_messages")
    .select("client_id,message,created_at")
    .eq("channel_type", "staff_internal")
    .in("client_id", clientIds)
    .order("created_at", { ascending: false });

  const latestByClient = new Map<string, { message: string; created_at: string }>();
  for (const row of msgs ?? []) {
    if (!row.client_id || latestByClient.has(row.client_id)) continue;
    latestByClient.set(row.client_id, { message: row.message, created_at: row.created_at });
  }

  const keys = clientIds.map((id) => channelKey("staff_internal", id, null));
  const { data: receipts } = me
    ? await supabase
        .from("chat_read_receipts" as never)
        .select("channel_key,last_read_at")
        .eq("user_id", me)
        .in("channel_key", keys)
    : { data: [] };

  const readMap = new Map(
    ((receipts ?? []) as { channel_key: string; last_read_at: string }[]).map((r) => [
      r.channel_key,
      r.last_read_at,
    ]),
  );

  return clients.map((c) => {
    const latest = latestByClient.get(c.id);
    const ck = channelKey("staff_internal", c.id, null);
    const lastRead = readMap.get(ck);
    const unread =
      !!latest &&
      (!lastRead || new Date(latest.created_at).getTime() > new Date(lastRead).getTime());
    return {
      clientId: c.id,
      fullName: c.full_name || "Unnamed client",
      lastMessage: latest?.message ?? null,
      lastAt: latest?.created_at ?? null,
      unread: !!unread,
    };
  });
}

async function chatAttachmentFetch(path: string, mode: "download" | "sign" = "download") {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not signed in");

  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (!base || !apikey) throw new Error("Missing Supabase config");

  const res = await fetch(`${base}/functions/v1/chat-attachment-url`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ storage_path: path, mode }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(String((err as { error?: string }).error || res.statusText || "Unable to open file"));
  }

  return res;
}

/** @deprecated Prefer downloadChatAttachment — avoids blocked storage URLs in the browser. */
export async function getAttachmentUrl(path: string): Promise<string | null> {
  try {
    const res = await chatAttachmentFetch(path, "sign");
    const data = (await res.json()) as { url?: string };
    return data.url ?? null;
  } catch {
    const { data } = await supabase.storage.from("client-documents").createSignedUrl(path, 60 * 60);
    return data?.signedUrl ?? null;
  }
}

export async function downloadChatAttachment(path: string, fileName: string): Promise<void> {
  const saveBlob = (blob: Blob) => {
    const blobUrl = URL.createObjectURL(blob);
    const isPdf =
      blob.type === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
    if (isPdf) {
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
      return;
    }
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName || "attachment";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  };

  try {
    const res = await chatAttachmentFetch(path, "download");
    saveBlob(await res.blob());
  } catch (edgeErr) {
    const url = await getAttachmentUrl(path);
    if (!url) throw edgeErr;
    const res = await fetch(url);
    if (!res.ok) throw edgeErr;
    saveBlob(await res.blob());
  }
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
