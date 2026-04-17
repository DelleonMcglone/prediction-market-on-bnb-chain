"use client";

import Link from "next/link";
import { useDemoAccount as useAccount } from "@/hooks/useDemoAccount";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAdminStats } from "@/hooks/useAdminStats";
import { useOperatorEventLog } from "@/hooks/useOperatorEventLog";
import { useWithdrawDispenser } from "@/hooks/useAdmin";
import { formatUsdc } from "@/lib/format";
import { formatEther } from "viem";
import { addressUrl, txUrl, truncateHash } from "@/lib/explorer";

export default function AdminOverview() {
  const { data: stats, isLoading } = useAdminStats();
  const { data: events } = useOperatorEventLog(15);

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted mt-1">
          Operator-only tooling. Create markets, pause, propose + finalize outcomes, manage the
          Dispenser.
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Stat label="Markets" value={stats?.totalMarkets} loading={isLoading} />
        <Stat label="Active" value={stats?.activeMarkets} loading={isLoading} />
        <Stat label="Paused" value={stats?.pausedMarkets} loading={isLoading} />
        <Stat label="Resolved" value={stats?.resolvedMarkets} loading={isLoading} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <DispenserPanel stats={stats} />
        <EventLog events={events ?? []} />
      </div>

      <section className="mt-8">
        <Link href="/admin/create">
          <Button variant="primary" size="lg">
            Create a new market
          </Button>
        </Link>
      </section>
    </>
  );
}

function Stat({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | undefined;
  loading?: boolean;
}) {
  return (
    <Card className="py-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      {loading || value === undefined ? (
        <Skeleton className="h-7 w-12 mt-1" />
      ) : (
        <p className="text-2xl font-semibold tabular-nums mt-1">{value}</p>
      )}
    </Card>
  );
}

function DispenserPanel({ stats }: { stats: ReturnType<typeof useAdminStats>["data"] }) {
  const { address } = useAccount();
  const { withdraw, isPending, isConfirming } = useWithdrawDispenser();
  const busy = isPending || isConfirming;

  return (
    <Card>
      <CardTitle>Dispenser</CardTitle>
      <CardDescription>
        Drips test funds to fresh visitors. Keep the balance topped up; withdraw leftover funds
        before archiving the demo.
      </CardDescription>
      <dl className="mt-4 space-y-2 text-sm">
        <Row label="tBNB balance" value={stats ? `${formatEther(stats.dispenserBnb)} tBNB` : "…"} />
        <Row label="USDC balance" value={stats ? formatUsdc(stats.dispenserUsdc) : "…"} />
      </dl>
      <div className="mt-4 flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          isLoading={busy}
          onClick={() => address && withdraw(address).catch(() => {})}
          disabled={!address || (stats?.dispenserBnb === 0n && stats?.dispenserUsdc === 0n)}
        >
          Withdraw to me
        </Button>
      </div>
    </Card>
  );
}

function EventLog({
  events,
}: {
  events: ReturnType<typeof useOperatorEventLog>["data"] extends infer T
    ? T extends undefined
      ? never
      : NonNullable<T>
    : never;
}) {
  return (
    <Card>
      <CardTitle>Recent operator activity</CardTitle>
      <CardDescription>Last 15 operator events across factory, resolution, and dispenser.</CardDescription>
      {events.length === 0 ? (
        <p className="text-sm text-muted mt-4">No events yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-white/5">
          {events.map((e) => (
            <li key={e.txHash + e.block.toString()} className="py-2 flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="text-fg">{e.summary}</p>
                <p className="text-xs text-muted">
                  {e.timestamp ? new Date(e.timestamp * 1000).toLocaleString() : "pending"}
                  {e.market ? (
                    <>
                      {" · "}
                      <a
                        href={addressUrl(e.market)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono hover:text-fg transition-colors"
                      >
                        {e.market.slice(0, 10)}…
                      </a>
                    </>
                  ) : null}
                </p>
              </div>
              <a
                href={txUrl(e.txHash)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-muted hover:text-fg transition-colors shrink-0"
              >
                {truncateHash(e.txHash, 4)}
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
