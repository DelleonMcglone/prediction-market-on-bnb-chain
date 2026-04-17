"use client";

import type { Address } from "viem";
import { Button } from "@/components/ui/Button";
import { useClaim } from "@/hooks/useTrade";

export function ClaimButton({
  market,
  payout,
  claimed,
  className,
}: {
  market: Address;
  payout: bigint;
  claimed: boolean;
  className?: string;
}) {
  const { claim, isPending, isConfirming } = useClaim();
  const busy = isPending || isConfirming;

  if (claimed) {
    return <span className="text-xs text-muted">Claimed ✓</span>;
  }

  if (payout === 0n) {
    return <span className="text-xs text-muted">—</span>;
  }

  return (
    <Button
      variant="yes"
      size="sm"
      isLoading={busy}
      onClick={() => claim(market).catch(() => {})}
      className={className}
    >
      {busy ? "Claiming…" : "Claim"}
    </Button>
  );
}
