import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Volume2,
  VolumeX,
  Wallet,
  ShieldCheck,
  Receipt,
  ClipboardCheck,
  UserPlus,
  FileUp,
  Mail,
  MessageSquare,
  AlertTriangle,
  Inbox,
  Info,
  BellRing,
  BellOff,
  Megaphone,
  FileText,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  playNotificationChime,
  shouldPlaySoundFor,
} from "@/lib/appNotifications";
import {
  isPushSupported,
  getPushPermission,
  isPushEnabled,
  setPushEnabled,
  requestPushPermission,
  maybeShowBrowserPush,
  wasPromptedBefore,
} from "@/lib/browserPush";
import { AdminBroadcastDialog } from "./AdminBroadcastDialog";

interface AppNotification {
  id: string;
  user_id: string;
  category: string;
  severity: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const SOUND_PREF_KEY = "notif:sound_enabled";
const PAGE_SIZE = 30;

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const CATEGORY_META: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; tone: string }> = {
  invoice_created: { icon: FileText, label: "Invoice", tone: "text-blue-600 bg-blue-500/10" },
  payment_received: { icon: Wallet, label: "Payment", tone: "text-emerald-600 bg-emerald-500/10" },
  payment_verified: { icon: ShieldCheck, label: "Verified", tone: "text-emerald-600 bg-emerald-500/10" },
  receipt_generated: { icon: Receipt, label: "Receipt", tone: "text-sky-600 bg-sky-500/10" },
  new_task_assigned: { icon: ClipboardCheck, label: "Task", tone: "text-indigo-600 bg-indigo-500/10" },
  client_assigned: { icon: UserPlus, label: "Client", tone: "text-violet-600 bg-violet-500/10" },
  document_uploaded: { icon: FileUp, label: "Document", tone: "text-cyan-600 bg-cyan-500/10" },
  portal_invite_sent: { icon: Mail, label: "Portal", tone: "text-blue-600 bg-blue-500/10" },
  portal_message: { icon: MessageSquare, label: "Message", tone: "text-blue-600 bg-blue-500/10" },
  lead_converted: { icon: UserPlus, label: "Lead", tone: "text-fuchsia-600 bg-fuchsia-500/10" },
  urgent_review_required: { icon: AlertTriangle, label: "Urgent", tone: "text-amber-600 bg-amber-500/10" },
  client_access_granted: { icon: UserPlus, label: "Access", tone: "text-violet-600 bg-violet-500/10" },
  info: { icon: Info, label: "Info", tone: "text-muted-foreground bg-muted" },
};
function metaFor(cat: string) {
  return CATEGORY_META[cat] ?? CATEGORY_META.info;
}

export function NotificationCenter() {
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SOUND_PREF_KEY) !== "0";
    } catch {
      return true;
    }
  });
  const [pushOn, setPushOn] = useState<boolean>(() => isPushEnabled());
  const [pushPerm, setPushPerm] = useState<NotificationPermission | "unsupported">(() => getPushPermission());
  const seenIds = useRef<Set<string>>(new Set());
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastFetchAt = useRef<string>(new Date(0).toISOString());

  const unreadCount = useMemo(
    () => items.filter((n) => !n.is_read).length,
    [items]
  );

  // Group consecutive same-category items into visual clusters while keeping
  // every row addressable (full audit trail preserved).
  const groupedItems = useMemo(() => {
    const groups: { key: string; category: string; rows: AppNotification[] }[] = [];
    for (const n of items) {
      const last = groups[groups.length - 1];
      if (last && last.category === n.category && last.rows.length < 8) {
        const lastTime = new Date(last.rows[last.rows.length - 1].created_at).getTime();
        const thisTime = new Date(n.created_at).getTime();
        // Only group if within 30 minutes of the previous one
        if (Math.abs(lastTime - thisTime) < 30 * 60 * 1000) {
          last.rows.push(n);
          continue;
        }
      }
      groups.push({ key: n.id, category: n.category, rows: [n] });
    }
    return groups;
  }, [items]);

  // Per-category unread analytics (lightweight)
  const unreadByCategory = useMemo(() => {
    const m: Record<string, number> = {};
    for (const n of items) if (!n.is_read) m[n.category] = (m[n.category] ?? 0) + 1;
    return m;
  }, [items]);
  const totalReadRate = useMemo(() => {
    if (items.length === 0) return null;
    const read = items.filter((n) => n.is_read).length;
    return Math.round((read / items.length) * 100);
  }, [items]);

  // Initial + on-demand reload (used by visibility/online recovery)
  const reload = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    if (!user) return;
    let alive = true;
    reload.current = async () => {
      const { data, error } = await supabase
        .from("app_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      if (!alive) return;
      if (error) {
        console.warn("[notif] load_error", error.message);
        console.warn("[notif-debug] filtered_out_reason", { reason: "feed_load_error", error: error.message, userId: user.id });
        return;
      }
      const rows = (data ?? []) as AppNotification[];
      rows.forEach((r) => seenIds.current.add(r.id));
      if (rows[0]) lastFetchAt.current = rows[0].created_at;
      setItems(rows);
      console.info("[notif] feed_loaded", { count: rows.length });
    };
    reload.current();
    return () => { alive = false; };
  }, [user]);

  // Reliability: refetch on tab visibility / network online so we never miss
  // notifications produced while a realtime channel was disconnected.
  useEffect(() => {
    if (!user) return;
    const onVis = () => {
      if (document.visibilityState === "visible") {
        console.info("[notif] visibility_refresh");
        reload.current?.();
      }
    };
    const onOnline = () => {
      console.info("[notif] online_refresh");
      reload.current?.();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
    };
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`app_notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "app_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as AppNotification;
          console.info("[notif-debug] realtime_received", {
            event: "INSERT",
            id: row?.id ?? null,
            user_id: row?.user_id ?? null,
            category: row?.category ?? null,
            subscribed_user_id: user.id,
          });
          if (!row || seenIds.current.has(row.id)) {
            console.info("[notif-debug] filtered_out_reason", {
              reason: !row ? "empty_realtime_payload" : "duplicate_seen_id",
              id: row?.id ?? null,
              category: row?.category ?? null,
            });
            console.info("[notif] duplicate_notification_blocked", { id: row?.id });
            return;
          }
          seenIds.current.add(row.id);
          console.info("[notif] notification_received", {
            id: row.id,
            category: row.category,
          });
          setItems((prev) => [row, ...prev].slice(0, 100));
          // Toast
          const toastFn =
            row.severity === "critical" || row.severity === "warning"
              ? toast.warning
              : row.severity === "success"
              ? toast.success
              : toast;
          toastFn(row.title, {
            description: row.body ?? undefined,
            action: row.link
              ? {
                  label: "Open",
                  onClick: () => {
                    window.location.href = row.link!;
                  },
                }
              : undefined,
          });
          // Sound
          const metaPlaySound = (row as any)?.metadata?.play_sound === true;
          if (soundEnabled && (shouldPlaySoundFor(row.category) || metaPlaySound)) {
            playNotificationChime(row.id);
          } else if (!soundEnabled) {
            console.info("[notif] sound_skipped", { reason: "muted" });
          } else {
            console.info("[notif] sound_skipped", {
              reason: "low_priority",
              category: row.category,
            });
          }
          // Browser push (only when tab unfocused; safe no-op otherwise)
          maybeShowBrowserPush({
            id: row.id,
            title: row.title,
            body: row.body,
            link: row.link,
            category: row.category,
            severity: row.severity,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "app_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as AppNotification;
          setItems((prev) => prev.map((n) => (n.id === row.id ? row : n)));
          console.info("[notif] unread_updated", { id: row.id, is_read: row.is_read });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.info("[notif] reconnect_attempt", { status: "subscribed", channel: `app_notifications:${user.id}` });
          // After a fresh subscription, pull anything we might have missed
          reload.current?.();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.warn("[notif] reconnect_attempt", { status, channel: `app_notifications:${user.id}` });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, soundEnabled]);

  const togglePush = async () => {
    if (!isPushSupported()) {
      toast.error("Browser notifications are not supported here");
      return;
    }
    if (Notification.permission === "denied") {
      toast.error("Permission blocked. Enable notifications in your browser settings.");
      return;
    }
    if (Notification.permission !== "granted") {
      const r = await requestPushPermission();
      setPushPerm(r);
      if (r === "granted") {
        setPushOn(true);
        toast.success("Browser notifications enabled");
      } else {
        toast.message("Browser notifications not enabled");
      }
      return;
    }
    const next = !pushOn;
    setPushOn(next);
    setPushEnabled(next);
    toast.success(next ? "Browser notifications on" : "Browser notifications off");
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem(SOUND_PREF_KEY, next ? "1" : "0");
    } catch {}
    if (user) {
      supabase
        .from("user_notification_prefs")
        .upsert({ user_id: user.id, sound_enabled: next })
        .then((r) => r.error && console.warn("[notif] pref_save_error", r.error.message));
    }
  };

  const markRead = async (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() as any } : n))
    );
    await supabase
      .from("app_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id);
    console.info("[notif] unread_updated", { id, action: "mark_read" });
  };

  const markAllRead = async () => {
    if (!user) return;
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase
      .from("app_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("is_read", false);
    console.info("[notif] unread_updated", { action: "mark_all_read" });
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full text-foreground hover:bg-accent hover:text-accent-foreground border border-border/60 bg-background/80 backdrop-blur shadow-sm"
          aria-label={`Notifications (${unreadCount} unread)`}
        >
          <Bell className="size-[18px]" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-[18px] min-w-[18px] px-1 text-[10px] font-semibold leading-none flex items-center justify-center rounded-full ring-2 ring-background animate-in zoom-in-50"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="w-[min(400px,calc(100vw-1rem))] p-0 z-[100] shadow-2xl border-border overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"
      >
        <div
          className={cn(
            "sticky top-0 z-10 flex items-center justify-between px-4 py-2.5 border-b bg-background/95 backdrop-blur transition-shadow",
            scrolled && "shadow-sm"
          )}
        >
          <div className="flex items-center gap-2">
            <div className="font-semibold text-sm">Notifications</div>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isPushSupported() && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={togglePush}
                title={
                  pushPerm === "denied"
                    ? "Browser notifications blocked"
                    : pushOn && pushPerm === "granted"
                    ? "Disable browser notifications"
                    : "Enable browser notifications"
                }
              >
                {pushOn && pushPerm === "granted" ? (
                  <BellRing className="size-3.5 text-primary" />
                ) : (
                  <BellOff className="size-3.5" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={toggleSound}
              title={soundEnabled ? "Mute notification sounds" : "Unmute notification sounds"}
            >
              {soundEnabled ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
            </Button>
            {isAdmin && (
              <AdminBroadcastDialog
                trigger={
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Send broadcast (admin)">
                    <Megaphone className="size-3.5" />
                  </Button>
                }
              />
            )}
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={markAllRead}>
                <CheckCheck className="size-3.5" /> Mark all read
              </Button>
            )}
          </div>
        </div>
        <div
          ref={scrollRef}
          onScroll={(e) => setScrolled((e.target as HTMLDivElement).scrollTop > 4)}
          className="max-h-[60vh] sm:max-h-[440px] overflow-y-auto overscroll-contain"
        >
          {items.length === 0 ? (
            <div className="px-6 py-12 flex flex-col items-center justify-center text-center gap-2">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                <Inbox className="size-5 text-muted-foreground" />
              </div>
              <div className="text-sm font-medium">You're all caught up</div>
              <div className="text-xs text-muted-foreground">New activity will appear here in real time.</div>
            </div>
          ) : (
            <ul className="divide-y">
              {groupedItems.flatMap((g) => {
                const header =
                  g.rows.length > 1 ? (
                    <li key={`${g.key}-header`} className="px-4 py-1.5 bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground font-medium flex items-center justify-between">
                      <span>
                        {g.rows.length} {metaFor(g.category).label.toLowerCase()} {g.rows.length === 1 ? "update" : "updates"}
                      </span>
                      <span>grouped</span>
                    </li>
                  ) : null;
                const rows = g.rows.map((n) => {
                const meta = metaFor(n.category);
                const Icon = meta.icon;
                const body = (
                  <div
                    className={cn(
                      "group px-4 py-3 flex items-start gap-3 transition-colors cursor-pointer",
                      !n.is_read && "bg-primary/5 hover:bg-primary/10",
                      n.is_read && "hover:bg-muted/60"
                    )}
                  >
                    <div
                      className={cn(
                        "size-8 rounded-full shrink-0 flex items-center justify-center",
                        meta.tone,
                        n.is_read && "opacity-60"
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium leading-tight truncate flex-1">
                          {n.title}
                        </div>
                        {!n.is_read && (
                          <span className="size-1.5 rounded-full bg-primary shrink-0" aria-label="unread" />
                        )}
                      </div>
                      {n.body && (
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {n.body}
                        </div>
                      )}
                      <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
                        <span>{timeAgo(n.created_at)}</span>
                        <span className="text-muted-foreground/40">•</span>
                        <span className="capitalize">{meta.label}</span>
                      </div>
                    </div>
                    {!n.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          markRead(n.id);
                        }}
                        title="Mark as read"
                      >
                        <Check className="size-3.5" />
                      </Button>
                    )}
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link
                        to={n.link}
                        onClick={() => {
                          console.info("[notif] notification_clicked", { id: n.id, link: n.link, category: n.category });
                          if (!n.is_read) markRead(n.id);
                          setOpen(false);
                        }}
                      >
                        {body}
                      </Link>
                    ) : (
                      <div
                        onClick={() => {
                          console.info("[notif] notification_clicked", { id: n.id, link: null, category: n.category });
                          if (!n.is_read) markRead(n.id);
                          setOpen(false);
                        }}
                      >
                        {body}
                      </div>
                    )}
                  </li>
                );
                });
                return header ? [header, ...rows] : rows;
              })}
            </ul>
          )}
        </div>
        {items.length > 0 && (
          <div className="border-t bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {Object.entries(unreadByCategory).slice(0, 3).map(([cat, n]) => (
                <span key={cat} className="inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-primary" />
                  {n} {metaFor(cat).label.toLowerCase()}
                </span>
              ))}
              {Object.keys(unreadByCategory).length === 0 && <span>All read</span>}
            </div>
            {totalReadRate !== null && <span>{totalReadRate}% read</span>}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}