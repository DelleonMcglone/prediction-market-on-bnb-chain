"use client";

import type { MarketData } from "@/hooks/useMarketData";
import { Card } from "@/components/ui/Card";
import { formatUsdc } from "@/lib/format";
import { addressUrl, truncateAddress } from "@/lib/explorer";

export function MarketMetadata({ data }: { data: MarketData }) {
  return (
    <Card>
      <h3 className="text-sm font-semibold mb-4">Market details</h3>
      <dl className="grid grid-cols-1 gap-3 text-sm">
        <Row label="Liquidity (b)" value="100" />
        <Row label="Trading fee" value="1%" />
        <Row label="Subsidy remaining" value={formatUsdc(data.collateralBalance)} />
        <Row
          label="Dispute window"
          value={`${Number(data.disputeWindow) / 60} min`}
        />
        <Row
          label="Contract"
          value={
            <a
              href={addressUrl(data.address)}
              target="_blank"
              rel="noreferrer"
              className="font-mono hover:text-fg transition-colors"
            >
              {truncateAddress(data.address)}
            </a>
          }
        />
      </dl>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="text-fg tabular-nums">{value}</dd>
    </div>
  );
}
