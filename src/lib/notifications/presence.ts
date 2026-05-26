// Lightweight realtime presence using Supabase channels. No chat-system changes.
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export interface PresenceState {
  online: string[];           // user ids currently online
  lastSeen: Record<string, number>;
  activeSubscribers: number;
}

const channelName = "presence:global";
let channel: ReturnType<typeof supabase.channel> | null = null;
const listeners = new Set<(s: PresenceState) => void>();
let state: PresenceState = { online: [], lastSeen: {}, activeSubscribers: 0 };

function emit() { for (const l of listeners) l(state); }

async function ensure(userId: string) {
  if (channel) return;
  channel = supabase.channel(channelName, { config: { presence: { key: userId } } });
  channel
    .on("presence", { event: "sync" }, () => {
      const raw = channel!.presenceState() as Record<string, any[]>;
      const online = Object.keys(raw);
      state = { ...state, online, activeSubscribers: online.length };
      const now = Date.now();
      for (const u of online) state.lastSeen[u] = now;
      emit();
    })
    .on("presence", { event: "leave" }, ({ key }) => {
      state.lastSeen[key] = Date.now();
      emit();
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") await channel!.track({ user_id: userId, online_at: new Date().toISOString() });
    });
}

export function usePresence(userId?: string | null): PresenceState {
  const [s, setS] = useState(state);
  useEffect(() => {
    if (!userId) return;
    void ensure(userId);
    const fn = (next: PresenceState) => setS(next);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, [userId]);
  return s;
}

/** Read-only snapshot for admin monitoring page. */
export function getPresenceSnapshot(): PresenceState { return state; }

/** Typing-safe placeholder for future per-conversation typing indicators. */
export interface TypingApi {
  setTyping: (convId: string, isTyping: boolean) => void;
  isAnyoneTyping: (convId: string) => boolean;
}
export const typing: TypingApi = {
  setTyping: () => {},
  isAnyoneTyping: () => false,
};