import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type Position = { x: number; y: number };

const DEFAULT_STORAGE_KEY = "topbar:rail_position";
const VIEWPORT_MARGIN = 8;

function getDefaultPosition(el: HTMLElement | null): Position {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  const w = el?.offsetWidth ?? 52;
  const h = el?.offsetHeight ?? 200;
  return {
    x: window.innerWidth - w - VIEWPORT_MARGIN,
    y: Math.max(VIEWPORT_MARGIN, (window.innerHeight - h) / 2),
  };
}

function clampPosition(pos: Position, el: HTMLElement | null): Position {
  if (typeof window === "undefined") return pos;
  const w = el?.offsetWidth ?? 52;
  const h = el?.offsetHeight ?? 200;
  return {
    x: Math.min(Math.max(VIEWPORT_MARGIN, pos.x), window.innerWidth - w - VIEWPORT_MARGIN),
    y: Math.min(Math.max(VIEWPORT_MARGIN, pos.y), window.innerHeight - h - VIEWPORT_MARGIN),
  };
}

function readStoredPosition(storageKey: string): Position | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Position;
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getCenterBottomDefaultPosition(el: HTMLElement | null): Position {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  const w = el?.offsetWidth ?? 420;
  const h = el?.offsetHeight ?? 36;
  return {
    x: Math.max(VIEWPORT_MARGIN, (window.innerWidth - w) / 2),
    y: Math.max(VIEWPORT_MARGIN, window.innerHeight - h - VIEWPORT_MARGIN - 64),
  };
}

export function useDraggableFixedPanel(
  storageKey = DEFAULT_STORAGE_KEY,
  resolveDefaultPosition: (el: HTMLElement | null) => Position = getDefaultPosition,
) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragOrigin = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    const stored = readStoredPosition(storageKey);
    setPosition(clampPosition(stored ?? resolveDefaultPosition(el), el));
  }, [storageKey, resolveDefaultPosition]);

  useEffect(() => {
    const onResize = () => {
      setPosition((current) => (current ? clampPosition(current, ref.current) : current));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const startDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (position === null) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragOrigin.current = {
        px: event.clientX,
        py: event.clientY,
        ox: position.x,
        oy: position.y,
      };
      setIsDragging(true);
    },
    [position],
  );

  const moveDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!isDragging || !dragOrigin.current) return;
      const dx = event.clientX - dragOrigin.current.px;
      const dy = event.clientY - dragOrigin.current.py;
      setPosition(
        clampPosition(
          {
            x: dragOrigin.current.ox + dx,
            y: dragOrigin.current.oy + dy,
          },
          ref.current,
        ),
      );
    },
    [isDragging],
  );

  const endDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!isDragging) return;
      setIsDragging(false);
      dragOrigin.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      setPosition((current) => {
        if (current) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(current));
          } catch {
            /* ignore quota errors */
          }
        }
        return current;
      });
    },
    [isDragging, storageKey],
  );

  const resetPosition = useCallback(() => {
    const next = resolveDefaultPosition(ref.current);
    setPosition(next);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }, [storageKey, resolveDefaultPosition]);

  return {
    ref,
    position,
    isDragging,
    isReady: position !== null,
    startDrag,
    moveDrag,
    endDrag,
    resetPosition,
  };
}
