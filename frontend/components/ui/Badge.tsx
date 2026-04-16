import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "default" | "yes" | "no" | "warn" | "muted";

const variants: Record<Variant, string> = {
  default: "bg-white/10 text-fg",
  yes: "bg-yes/20 text-yes",
  no: "bg-no/20 text-no",
  warn: "bg-accent/20 text-accent",
  muted: "bg-white/5 text-muted",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
