"use client";

import Link from "next/link";
import type { Address } from "viem";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMarketData } from "@/hooks/useMarketData";
import { formatShares, formatUsdc } from "@/lib/format";
import { truncateAddress } from "@/lib/explorer";
import { cn } from "@/lib/cn";

export type PortfolioRow = {
  market: Address;
  outcome: 0 | 1;
  shares: bigint;
};

/** Single row in the open-positions table. Fetches its own market data. */
export function PositionRow({ row }: { row: PortfolioRow }) {
  const { data: market, isLoading } = useMarketData(row.market);

  if (isLoading || !market) {
    return (
      <tr className="border-t border-white/5">
        <td className="py-3"><Skeleton className="h-4 w-40" /></td>
        <td className="py-3"><Skeleton className="h-4 w-12" /></td>
        <td className="py-3"><Skeleton className="h-4 w-16" /></td>
        <td className="py-3"><Skeleton className="h-4 w-20" /></td>
      </tr>
    );
  }

  const currentPrice = row.outcome === 1 ? market.priceYes : market.priceNo;
  // Unrealized value in USDC: shares (18-dec) * price (18-dec) / SCALE (1e12) / 1e18
  // = shares * price / 1e30. We keep it in bigint as long as possible.
  const valueUsdc = (row.shares * currentPrice) / 10n ** 30n;

  return (
    <tr className="border-t border-white/5">
      <td className="py-3 pr-4">
        <Link
          href={`/market/${row.market}`}
          className="hover:text-fg transition-colors line-clamp-2 max-w-md"
        >
          {market.question}
        </Link>
        <div className="text-xs text-muted font-mono mt-0.5">
          {truncateAddress(row.market)}
        </div>
      </td>
      <td className="py-3 pr-4">
        <Badge variant={row.outcome === 1 ? "yes" : "no"}>
          {row.outcome === 1 ? "YES" : "NO"}
        </Badge>
      </td>
      <td className="py-3 pr-4 tabular-nums">{formatShares(row.shares)}</td>
      <td className="py-3 tabular-nums text-right">{formatUsdc(valueUsdc)}</td>
    </tr>
  );
}

/** Resolved-market row with Won/Lost state. */
export function ResolvedPositionRow({ row }: { row: PortfolioRow }) {
  const { data: market, isLoading } = useMarketData(row.market);

  if (isLoading || !market) {
    return (
      <tr className="border-t border-white/5">
        <td className="py-3" colSpan={4}><Skeleton className="h-4 w-full" /></td>
      </tr>
    );
  }

  const won = market.winningOutcome === row.outcome;
  // Winning share → 1 USDC payout. Shares are 18-dec, USDC is 6-dec.
  const payout = won ? row.shares / 10n ** 12n : 0n;

  return (
    <tr className="border-t border-white/5">
      <td className="py-3 pr-4">
        <Link
          href={`/market/${row.market}`}
          className="hover:text-fg transition-colors line-clamp-2 max-w-md"
        >
          {market.question}
        </Link>
      </td>
      <td className="py-3 pr-4">
        <Badge variant={row.outcome === 1 ? "yes" : "no"}>
          {row.outcome === 1 ? "YES" : "NO"}
        </Badge>
      </td>
      <td className="py-3 pr-4">
        <span className={cn("text-xs font-medium", won ? "text-yes" : "text-muted")}>
          {won ? "Won" : "Lost"}
        </span>
      </td>
      <td className="py-3 tabular-nums text-right">{won ? formatUsdc(payout) : "—"}</td>
    </tr>
  );
}
