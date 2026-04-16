"use client";

import { use } from "react";
import type { Address } from "viem";
import { NetworkGuard } from "@/components/NetworkGuard";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";

export default function MarketPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address: addressParam } = use(params);
  const address = addressParam as Address;

  return (
    <NetworkGuard>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Card>
          <CardTitle>Market detail</CardTitle>
          <CardDescription className="font-mono text-xs">{address}</CardDescription>
          <p className="text-sm text-muted mt-4">
            Price chart, metadata, trade history land in Phase 05. Trade form
            lands in Phase 06.
          </p>
        </Card>
      </div>
    </NetworkGuard>
  );
}
