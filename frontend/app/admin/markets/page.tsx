"use client";

import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { AdminMarketRow } from "@/components/AdminMarketRow";
import { useMarkets } from "@/hooks/useMarkets";

export default function AdminMarketsPage() {
  const { data: markets, isLoading } = useMarkets();

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Markets</h1>
        <p className="text-sm text-muted mt-1">
          Pause, propose outcomes, and finalize. Countdown refreshes each second.
        </p>
      </header>

      {isLoading ? (
        <Card>
          <CardDescription>Loading markets…</CardDescription>
        </Card>
      ) : null}

      {!isLoading && (markets?.length ?? 0) === 0 ? (
        <Card>
          <CardTitle>No markets yet</CardTitle>
          <CardDescription>
            Head to <a href="/admin/create" className="text-accent">Create</a> to deploy one.
          </CardDescription>
        </Card>
      ) : null}

      {!isLoading && (markets?.length ?? 0) > 0 ? (
        <Card>
          <table className="w-full text-sm">
            <thead className="text-left text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="pb-3 pr-4 font-medium">Question</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 pr-4 font-medium">YES price</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(markets ?? []).map((m) => (
                <AdminMarketRow key={m} market={m} />
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}
    </>
  );
}
