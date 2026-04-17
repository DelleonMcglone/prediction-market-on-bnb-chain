"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { TradeRecord } from "@/hooks/useMarketHistory";
import { formatShares, formatUsdc } from "@/lib/format";
import { txUrl, truncateAddress, truncateHash, addressUrl } from "@/lib/explorer";

export function TradeHistory({ trades }: { trades: TradeRecord[] }) {
  const recent = trades.slice(-10).reverse(); // latest first, cap at 10

  return (
    <Card>
      <h3 className="text-sm font-semibold mb-4">Recent trades</h3>
      {recent.length === 0 ? (
        <p className="text-muted text-sm">
          No trades yet on this market.
        </p>
      ) : (
        <ul className="divide-y divide-white/5">
          {recent.map((t) => (
            <li key={t.txHash} className="py-2.5 flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant={t.outcome === 1 ? "yes" : "no"} className="shrink-0">
                  {t.kind === "Bought" ? "Buy" : "Sell"} {t.outcome === 1 ? "YES" : "NO"}
                </Badge>
                <span className="text-muted tabular-nums shrink-0">
                  {formatShares(t.shareAmount)}
                </span>
                <span className="text-muted text-xs shrink-0">·</span>
                <a
                  href={addressUrl(t.trader)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-muted hover:text-fg truncate"
                >
                  {truncateAddress(t.trader)}
                </a>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="tabular-nums text-muted">{formatUsdc(t.cost)}</span>
                <a
                  href={txUrl(t.txHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-muted hover:text-fg"
                >
                  {truncateHash(t.txHash, 4)}
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
