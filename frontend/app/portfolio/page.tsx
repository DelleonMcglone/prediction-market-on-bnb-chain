"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAccount, useReadContracts } from "wagmi";
import type { Address } from "viem";
import { NetworkGuard } from "@/components/NetworkGuard";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { PositionRow, ResolvedPositionRow, type PortfolioRow } from "@/components/PositionRow";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useMarkets } from "@/hooks/useMarkets";
import { MarketAbi } from "@/lib/abis";

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { data: markets } = useMarkets();
  const { data: positions, isLoading } = usePortfolio(address);

  // Read each market's `resolved` flag so we can split open vs resolved rows.
  const { data: resolvedFlags } = useReadContracts({
    allowFailure: false,
    contracts: (markets ?? []).map((m) => ({
      address: m,
      abi: MarketAbi,
      functionName: "resolved" as const,
    })),
    query: { enabled: !!markets && markets.length > 0, staleTime: 30_000 },
  });

  const { openRows, resolvedRows } = useMemo(() => {
    const open: PortfolioRow[] = [];
    const resolved: PortfolioRow[] = [];
    if (!positions || !markets) return { openRows: open, resolvedRows: resolved };

    const resolvedMap = new Map<Address, boolean>();
    markets.forEach((m, i) => {
      resolvedMap.set(m, Boolean(resolvedFlags?.[i]));
    });

    for (const p of positions) {
      const isResolved = resolvedMap.get(p.market) ?? false;
      const pair: PortfolioRow[] = [];
      if (p.noShares > 0n) pair.push({ market: p.market, outcome: 0, shares: p.noShares });
      if (p.yesShares > 0n) pair.push({ market: p.market, outcome: 1, shares: p.yesShares });
      if (isResolved) resolved.push(...pair);
      else open.push(...pair);
    }
    return { openRows: open, resolvedRows: resolved };
  }, [positions, markets, resolvedFlags]);

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Card>
          <CardTitle>Connect a wallet</CardTitle>
          <CardDescription>
            Connect a wallet to view your open and resolved positions.
          </CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <NetworkGuard>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
          <p className="text-sm text-muted mt-1">
            Open positions with unrealized value. Claim flow lands in Phase 06.
          </p>
        </header>

        {isLoading ? (
          <Card>
            <p className="text-sm text-muted">Loading positions…</p>
          </Card>
        ) : null}

        <section>
          <h2 className="text-sm font-semibold mb-3">Open positions</h2>
          {openRows.length === 0 ? (
            <Card>
              <CardDescription>
                No open positions. Browse <Link href="/" className="text-accent">markets</Link> to place your first trade.
              </CardDescription>
            </Card>
          ) : (
            <Card>
              <table className="w-full text-sm">
                <thead className="text-left text-muted text-xs uppercase tracking-wide">
                  <tr>
                    <th className="pb-3 pr-4 font-medium">Market</th>
                    <th className="pb-3 pr-4 font-medium">Outcome</th>
                    <th className="pb-3 pr-4 font-medium">Shares</th>
                    <th className="pb-3 font-medium text-right">Unrealized value</th>
                  </tr>
                </thead>
                <tbody>
                  {openRows.map((row) => (
                    <PositionRow key={`${row.market}-${row.outcome}`} row={row} />
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </section>

        {resolvedRows.length > 0 ? (
          <section>
            <h2 className="text-sm font-semibold mb-3">Resolved positions</h2>
            <Card>
              <table className="w-full text-sm">
                <thead className="text-left text-muted text-xs uppercase tracking-wide">
                  <tr>
                    <th className="pb-3 pr-4 font-medium">Market</th>
                    <th className="pb-3 pr-4 font-medium">Outcome</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Claimable</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvedRows.map((row) => (
                    <ResolvedPositionRow key={`${row.market}-${row.outcome}`} row={row} />
                  ))}
                </tbody>
              </table>
            </Card>
          </section>
        ) : null}
      </div>
    </NetworkGuard>
  );
}
