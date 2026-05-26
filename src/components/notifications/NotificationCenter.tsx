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
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  playNotificationChime,
  shouldPlaySoundFor,
} from "@/lib/appNotifications";

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
  info: { icon: Info, label: "Info", tone: "text-muted-foreground bg-muted" },
};
function metaFor(cat: string) {
  return CATEGORY_META[cat] ?? CATEGORY_META.info;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SOUND_PREF_KEY) !== "0";
    } catch {
      return true;
    }
  });
  const seenIds = useRef<Set<string>>(new Set());
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.is_read).length,
    [items]
  );

  // Initial load
  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("app_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      if (!alive) return;
      if (error) {
        console.warn("[notif] load_error", error.message);
        return;
      }
      const rows = (data ?? []) as AppNotification[];
      rows.forEach((r) => seenIds.current.add(r.id));
      setItems(rows);
    })();
    return () => {
      alive = false;
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
          if (!row || seenIds.current.has(row.id)) {
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
          if (soundEnabled && shouldPlaySoundFor(row.category)) {
            playNotificationChime(row.id);
          } else if (!soundEnabled) {
            console.info("[notif] sound_skipped", { reason: "muted" });
          } else {
            console.info("[notif] sound_skipped", {
              reason: "low_priority",
              category: row.category,
            });
          }
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
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.warn("[notif] reconnect_attempt", { status, channel: `app_notifications:${user.id}` });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, soundEnabled]);

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
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={toggleSound}
              title={soundEnabled ? "Mute notification sounds" : "Unmute notification sounds"}
            >
              {soundEnabled ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
            </Button>
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
              {items.map((n) => {
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
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}