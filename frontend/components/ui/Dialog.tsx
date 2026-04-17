"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";

/**
 * Minimal uncontrolled-modal. No focus-trap; good enough for the demo.
 * Closes on Escape and on backdrop click.
 */
export function Dialog({
  open,
  onClose,
  children,
  className,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative w-full max-w-md rounded-lg border border-white/10 bg-[rgb(var(--bg))] p-6 shadow-xl",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 text-muted hover:text-fg text-lg leading-none"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
