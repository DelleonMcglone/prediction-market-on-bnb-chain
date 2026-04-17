"use client";

import Link from "next/link";
import type { Address } from "viem";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { PriceDisplay } from "@/components/PriceDisplay";
import { useMarketData } from "@/hooks/useMarketData";

export function MarketCard({ address }: { address: Address }) {
  const { data, isLoading } = useMarketData(address);

  if (isLoading || !data) {
    return (
      <Card className="h-full space-y-3">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-16 w-full mt-4" />
      </Card>
    );
  }

  return (
    <Link href={`/market/${address}`} className="block h-full">
      <Card className="h-full hover:border-white/20 transition-colors cursor-pointer flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-4">
          <CardTitle className="line-clamp-2 flex-1">{data.question}</CardTitle>
          <StatusBadge data={data} />
        </div>
        <div className="mt-auto">
          <PriceDisplay priceYes={data.priceYes} priceNo={data.priceNo} />
        </div>
      </Card>
    </Link>
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
