"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Address } from "viem";
import { useReadContract } from "wagmi";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { SubmitOutcomeDialog } from "@/components/SubmitOutcomeDialog";
import { useMarketData } from "@/hooks/useMarketData";
import { usePauseMarket, useUnpauseMarket, useFinalize } from "@/hooks/useAdmin";
import { ResolutionAbi } from "@/lib/abis";
import { addresses } from "@/lib/contracts";
import { formatPricePercent } from "@/lib/format";
import { truncateAddress } from "@/lib/explorer";
import { DEMO_MODE } from "@/lib/demoMode";
import { mockResolutionOf } from "@/lib/mockChain";
import { useMockChainVersion } from "@/hooks/useMockChain";

/**
 * Resolution status enum from Resolution.sol (0=Unresolved, 1=Proposed, 2=Finalized).
 */
const STATUS_UNRESOLVED = 0;
const STATUS_PROPOSED = 1;
const STATUS_FINALIZED = 2;

export function AdminMarketRow({ market }: { market: Address }) {
  const { data, isLoading } = useMarketData(market);

  const version = useMockChainVersion();
  const { data: wagmiResolution } = useReadContract({
    address: addresses.resolution,
    abi: ResolutionAbi,
    functionName: "resolutionOf",
    args: [market],
    query: { enabled: !DEMO_MODE, refetchInterval: 5_000 },
  });
  const resolutionTuple = DEMO_MODE
    ? (void version, (() => {
        const r = mockResolutionOf(market);
        return [r.status, r.proposedOutcome, BigInt(r.disputeEndsAt)] as const;
      })())
    : wagmiResolution;

  const [, setTick] = useState(0);
  useEffect(() => {
    const h = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(h);
  }, []);

  const { pause, isPending: pausing, isConfirming: pauseConfirming } = usePauseMarket(market);
  const { unpause, isPending: unpausing, isConfirming: unpauseConfirming } = useUnpauseMarket(market);
  const { finalize, isPending: finalizing, isConfirming: finalizeConfirming } = useFinalize();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading || !data) {
    return (
      <tr className="border-t border-white/5">
        <td colSpan={4} className="py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      </tr>
    );
  }

  const status = (resolutionTuple as unknown as [number, number, bigint] | undefined)?.[0];
  const disputeEndsAt = (resolutionTuple as unknown as [number, number, bigint] | undefined)?.[2];
  const now = Math.floor(Date.now() / 1000);
  const windowOpen = status === STATUS_PROPOSED && Number(disputeEndsAt ?? 0n) > now;
  const windowClosed = status === STATUS_PROPOSED && Number(disputeEndsAt ?? 0n) <= now;
  const secondsLeft = windowOpen ? Number(disputeEndsAt ?? 0n) - now : 0;

  const statusBadge = (() => {
    if (status === STATUS_FINALIZED) {
      return (
        <Badge variant={data.winningOutcome === 1 ? "yes" : "no"}>
          Resolved {data.winningOutcome === 1 ? "YES" : "NO"}
        </Badge>
      );
    }
    if (windowOpen) return <Badge variant="warn">Dispute ({formatSeconds(secondsLeft)})</Badge>;
    if (windowClosed) return <Badge variant="warn">Ready to finalize</Badge>;
    if (data.paused) return <Badge variant="muted">Paused</Badge>;
    return <Badge>Active</Badge>;
  })();

  return (
    <>
      <tr className="border-t border-white/5">
        <td className="py-3 pr-4">
          <Link href={`/market/${market}`} className="hover:text-fg transition-colors line-clamp-2 max-w-md">
            {data.question}
          </Link>
          <p className="text-xs text-muted font-mono mt-0.5">{truncateAddress(market)}</p>
        </td>
        <td className="py-3 pr-4">{statusBadge}</td>
        <td className="py-3 pr-4 tabular-nums">{formatPricePercent(data.priceYes, 0)}</td>
        <td className="py-3 text-right">
          <div className="flex flex-wrap justify-end gap-2">
            {status === STATUS_UNRESOLVED && !data.paused ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={pausing || pauseConfirming}
                  onClick={() => pause().catch(() => {})}
                >
                  Pause
                </Button>
                <Button variant="primary" size="sm" onClick={() => setDialogOpen(true)}>
                  Submit outcome
                </Button>
              </>
            ) : null}
            {status === STATUS_UNRESOLVED && data.paused ? (
              <Button
                variant="secondary"
                size="sm"
                isLoading={unpausing || unpauseConfirming}
                onClick={() => unpause().catch(() => {})}
              >
                Unpause
              </Button>
            ) : null}
            {windowOpen ? (
              <span className="text-xs text-muted self-center">Waiting for window to close…</span>
            ) : null}
            {windowClosed ? (
              <Button
                variant="primary"
                size="sm"
                isLoading={finalizing || finalizeConfirming}
                onClick={() => finalize(market).catch(() => {})}
              >
                Finalize
              </Button>
            ) : null}
          </div>
        </td>
      </tr>
      <SubmitOutcomeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        market={market}
        question={data.question}
        disputeWindowSec={data.disputeWindow}
      />
    </>
  );
}

function formatSeconds(s: number): string {
  if (s <= 0) return "0s";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}
