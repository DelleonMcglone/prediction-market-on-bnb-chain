"use client";

import { use } from "react";
import Link from "next/link";
import type { Address } from "viem";
import { NetworkGuard } from "@/components/NetworkGuard";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { PriceDisplay } from "@/components/PriceDisplay";
import { PriceChart } from "@/components/PriceChart";
import { MarketMetadata } from "@/components/MarketMetadata";
import { TradeHistory } from "@/components/TradeHistory";
import { useMarketData } from "@/hooks/useMarketData";
import { useMarketHistory, useSampledHistory } from "@/hooks/useMarketHistory";
import { formatPricePercent } from "@/lib/format";

export default function MarketPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address: addressParam } = use(params);
  const address = addressParam as Address;

  const { data, isLoading, error } = useMarketData(address);
  const { data: historyData } = useMarketHistory(address);
  const sampled = useSampledHistory(historyData?.history ?? []);

  return (
    <NetworkGuard>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-4">
          <Link href="/" className="text-sm text-muted hover:text-fg transition-colors">
            ← All markets
          </Link>
        </div>

        {error ? <LoadError message={error.message} /> : null}
        {isLoading ? <MarketSkeleton /> : null}

        {data ? (
          <>
            <header className="mb-6 flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl font-semibold tracking-tight leading-tight">
                  {data.question}
                </h1>
                <p className="text-sm text-muted mt-2">
                  The market thinks YES is {formatPricePercent(data.priceYes)} likely.
                </p>
              </div>
              <StatusBadge data={data} />
            </header>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <PriceDisplay priceYes={data.priceYes} priceNo={data.priceNo} variant="detail" />
                </Card>
                <Card>
                  <h3 className="text-sm font-semibold mb-4">Price history</h3>
                  <PriceChart data={sampled} />
                </Card>
                <TradeHistory trades={historyData?.trades ?? []} />
              </div>
              <aside className="space-y-6">
                <MarketMetadata data={data} />
                <Card>
                  <CardTitle>Trade</CardTitle>
                  <p className="text-sm text-muted mt-2">
                    Buy / sell / claim land in Phase 06.
                  </p>
                </Card>
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </NetworkGuard>
  );
}

function StatusBadge({
  data,
}: {
  data: NonNullable<ReturnType<typeof useMarketData>["data"]>;
}) {
  if (data.resolved) {
    return (
      <Badge variant={data.winningOutcome === 1 ? "yes" : "no"}>
        Resolved {data.winningOutcome === 1 ? "YES" : "NO"}
      </Badge>
    );
  }
  if (data.paused) return <Badge variant="muted">Paused</Badge>;
  return <Badge variant="default">Active</Badge>;
}

function MarketSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

function LoadError({ message }: { message: string }) {
  return (
    <Card className="border-no/30 bg-no/5">
      <CardTitle>Failed to load market</CardTitle>
      <p className="text-sm text-muted mt-2">{message}</p>
    </Card>
  );
}
