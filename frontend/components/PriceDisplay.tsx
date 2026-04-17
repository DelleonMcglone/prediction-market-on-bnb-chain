import { cn } from "@/lib/cn";
import { formatPriceCents, formatPricePercent } from "@/lib/format";

/**
 * Big two-sided price display. `variant="compact"` is used on the homepage
 * card; `"detail"` on the market page.
 */
export function PriceDisplay({
  priceYes,
  priceNo,
  variant = "compact",
  className,
}: {
  priceYes: bigint;
  priceNo: bigint;
  variant?: "compact" | "detail";
  className?: string;
}) {
  const fmt = variant === "detail" ? formatPricePercent : formatPriceCents;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex flex-col">
          <span className={cn("text-muted text-xs uppercase tracking-wide")}>
            YES
          </span>
          <span
            className={cn(
              "font-semibold text-yes tabular-nums",
              variant === "detail" ? "text-4xl" : "text-2xl",
            )}
          >
            {fmt(priceYes)}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-muted text-xs uppercase tracking-wide">NO</span>
          <span
            className={cn(
              "font-semibold text-no tabular-nums",
              variant === "detail" ? "text-4xl" : "text-2xl",
            )}
          >
            {fmt(priceNo)}
          </span>
        </div>
      </div>
      <SplitBar priceYes={priceYes} priceNo={priceNo} />
    </div>
  );
}

/** Horizontal bar split proportionally between YES (green, left) and NO (red, right). */
export function SplitBar({
  priceYes,
  priceNo,
  className,
}: {
  priceYes: bigint;
  priceNo: bigint;
  className?: string;
}) {
  // Normalize in case rounding leaves the pair not quite summing to 1e18.
  const total = priceYes + priceNo;
  const yesPct = total > 0n ? Number((priceYes * 10000n) / total) / 100 : 50;

  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-no/30", className)}
      role="img"
      aria-label={`YES ${yesPct.toFixed(1)} percent, NO ${(100 - yesPct).toFixed(1)} percent`}
    >
      <div
        className="h-full bg-yes transition-all"
        style={{ width: `${yesPct}%` }}
      />
    </div>
  );
}
