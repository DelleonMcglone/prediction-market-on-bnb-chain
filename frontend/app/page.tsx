"use client";

import { useState } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { MarketCard } from "@/components/MarketCard";
import { DispenserModal } from "@/components/DispenserModal";
import { useMarkets } from "@/hooks/useMarkets";
import { isDeployed } from "@/lib/contracts";

export default function HomePage() {
  const { data: marketAddresses, isLoading } = useMarkets();
  const [dispenserOpen, setDispenserOpen] = useState(false);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <TestnetBanner onGetFunds={() => setDispenserOpen(true)} />
      <DispenserModal open={dispenserOpen} onClose={() => setDispenserOpen(false)} />

      <section className="my-8">
        <h1 className="text-2xl font-semibold tracking-tight">Markets</h1>
        <p className="text-sm text-muted mt-1">
          LMSR-priced binary markets on BNB testnet.
        </p>
      </section>

      {!isDeployed ? <NotYetDeployed /> : null}

      {isDeployed && isLoading ? <MarketListSkeleton /> : null}

      {isDeployed && !isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(marketAddresses ?? []).map((addr) => (
            <MarketCard key={addr} address={addr} />
          ))}
          {(marketAddresses ?? []).length === 0 ? (
            <Card className="md:col-span-2 lg:col-span-3 text-center py-12">
              <p className="text-muted text-sm">
                No markets yet. An operator can create one at <code>/admin</code>.
              </p>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function TestnetBanner({ onGetFunds }: { onGetFunds: () => void }) {
  return (
    <div className="mt-6 rounded-md border border-accent/30 bg-accent/10 px-4 py-3 text-sm flex items-start gap-3">
      <Badge variant="warn">Testnet</Badge>
      <div className="flex-1">
        <p className="text-fg">
          This is a BNB testnet demo &mdash; no real money.
        </p>
        <p className="text-muted text-xs mt-1">
          Need test funds?{" "}
          <button
            type="button"
            onClick={onGetFunds}
            className="text-accent underline hover:text-fg transition-colors"
          >
            Get test funds
          </button>{" "}
          (drips mUSDC + a tiny bit of tBNB), or use the{" "}
          <a
            href="https://faucet.quicknode.com/binance-smart-chain/bnb-testnet"
            target="_blank"
            rel="noreferrer"
            className="text-accent underline"
          >
            QuickNode faucet
          </a>{" "}
          for more tBNB.
        </p>
      </div>
    </div>
  );
}

function NotYetDeployed() {
  return (
    <Card className="border-dashed">
      <CardTitle>Not yet deployed</CardTitle>
      <CardDescription>
        Contracts land on BNB testnet in Phase 03. Markets will appear here
        automatically once the deployment artifact is committed.
      </CardDescription>
    </Card>
  );
}

function MarketListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-full mt-4" />
        </Card>
      ))}
    </div>
  );
}
