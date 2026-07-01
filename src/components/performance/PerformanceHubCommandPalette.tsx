import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useAuth } from "@/contexts/AuthContext";
import {
  PERFORMANCE_WORKSPACE_SIDEBAR,
  PERFORMANCE_WORKSPACE_SUB_LINKS,
  isWorkspaceSubLinkVisible,
  isWorkspaceSidebarVisible,
  type PerformanceWorkspaceId,
} from "@/incentives/lib/performanceWorkspaceNav";

/** ⌘K route jump — accelerator only; never the sole path (Bible §13). */
export function PerformanceHubCommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { isAdmin, hasRole } = useAuth();

  const navCtx = useMemo(
    () => ({
      isAdmin,
      hasRole: (roles: readonly string[]) => hasRole([...roles]),
    }),
    [isAdmin, hasRole],
  );

  const groups = useMemo(() => {
    const visibleSidebar = PERFORMANCE_WORKSPACE_SIDEBAR.filter((item) =>
      isWorkspaceSidebarVisible(item, navCtx),
    );
    return visibleSidebar.map((workspace) => ({
      workspace: workspace.label,
      items: PERFORMANCE_WORKSPACE_SUB_LINKS[workspace.id as PerformanceWorkspaceId].filter((link) =>
        isWorkspaceSubLinkVisible(link, navCtx),
      ),
    })).filter((g) => g.items.length > 0);
  }, [navCtx]);

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7932/ingest/ad076abe-09dd-4c51-8767-b401ca5b20d4", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f92c68" },
      body: JSON.stringify({
        sessionId: "f92c68",
        location: "PerformanceHubCommandPalette.tsx:mount",
        message: "CommandPalette mounted",
        data: { groupCount: groups.length },
        hypothesisId: "H-C",
        timestamp: Date.now(),
        runId: "pre-fix",
      }),
    }).catch(() => {});
    return () => {
      fetch("http://127.0.0.1:7932/ingest/ad076abe-09dd-4c51-8767-b401ca5b20d4", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f92c68" },
        body: JSON.stringify({
          sessionId: "f92c68",
          location: "PerformanceHubCommandPalette.tsx:unmount",
          message: "CommandPalette unmounted",
          data: {},
          hypothesisId: "H-C",
          timestamp: Date.now(),
          runId: "pre-fix",
        }),
      }).catch(() => {});
    };
    // #endregion
  }, [groups.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = useCallback(
    (to: string) => {
      setOpen(false);
      navigate(to);
    },
    [navigate],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden sm:inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-[#9aa7c2] hover:bg-white/10 transition-colors"
        aria-label="Open command palette"
      >
        <span>Search routes</span>
        <kbd className="rounded border border-white/20 px-1 font-mono text-[10px]">⌘K</kbd>
      </button>
      {open ? (
        <CommandDialog open={open} onOpenChange={setOpen}>
          <CommandInput placeholder="Jump to a Performance Hub screen…" />
          <CommandList>
            <CommandEmpty>No matching route.</CommandEmpty>
            {groups.map((group, idx) => (
              <div key={group.workspace}>
                {idx > 0 && <CommandSeparator />}
                <CommandGroup heading={group.workspace}>
                  {group.items.map((item) => (
                    <CommandItem key={item.to} value={`${group.workspace} ${item.label} ${item.to}`} onSelect={() => go(item.to)}>
                      <item.icon className="mr-2 size-4 opacity-60" />
                      {item.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </div>
            ))}
          </CommandList>
        </CommandDialog>
      ) : null}
    </>
  );
}
