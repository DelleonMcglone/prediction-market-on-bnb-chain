import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-md bg-white/5 border border-white/10 px-3 text-sm",
          "placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/60",
          "disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
