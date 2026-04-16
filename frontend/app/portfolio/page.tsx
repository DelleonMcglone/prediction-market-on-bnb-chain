"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { NetworkGuard } from "@/components/NetworkGuard";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { usePortfolio } from "@/hooks/usePortfolio";

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { data: positions } = usePortfolio(address);

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
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
        <p className="text-sm text-muted mt-1">
          Open positions with unrealized P&amp;L. Phase 05 adds the full breakdown.
        </p>

        <div className="mt-8 space-y-3">
          {(positions ?? []).length === 0 ? (
            <Card>
              <CardTitle>No positions yet</CardTitle>
              <CardDescription>
                Browse <Link href="/" className="text-accent">markets</Link> to place your first trade.
              </CardDescription>
            </Card>
          ) : (
            (positions ?? []).map((p) => (
              <Card key={p.market}>
                <CardTitle className="font-mono text-sm">{p.market}</CardTitle>
                <CardDescription>
                  YES: {p.yesShares.toString()} · NO: {p.noShares.toString()}
                </CardDescription>
              </Card>
            ))
          )}
        </div>
      </div>
    </NetworkGuard>
  );
}
