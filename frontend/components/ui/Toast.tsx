"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type ToastVariant = "info" | "success" | "error";

type Toast = {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
  action?: { label: string; href: string };
  persistent?: boolean;
};

type ToastContextValue = {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => number;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastHost />");
  return ctx;
}

/**
 * Mount once near the root of the tree. Listens to a lightweight event bus
 * via its own context — call `useToast().push(...)` from anywhere below it.
 */
export function ToastHost({ children }: { children?: React.ReactNode } = {}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { ...t, id }]);
    if (!t.persistent) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, 8000);
    }
    return id;
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastRegion toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastRegion({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  useEffect(() => {
    // Noop — placeholder for future auto-stacking / keyboard shortcuts.
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto min-w-[280px] max-w-sm rounded-md border px-4 py-3 text-sm",
            t.variant === "success" && "bg-yes/10 border-yes/30 text-fg",
            t.variant === "error" && "bg-no/10 border-no/30 text-fg",
            t.variant === "info" && "bg-white/5 border-white/10 text-fg",
          )}
          role="status"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{t.title}</div>
              {t.description ? (
                <div className="text-muted mt-1 text-xs">{t.description}</div>
              ) : null}
              {t.action ? (
                <a
                  href={t.action.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent underline text-xs mt-2 inline-block"
                >
                  {t.action.label}
                </a>
              ) : null}
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss"
              className="text-muted hover:text-fg text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
