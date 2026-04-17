"use client";

import { useState } from "react";
import type { Address } from "viem";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { useSubmitOutcome } from "@/hooks/useAdmin";

export function SubmitOutcomeDialog({
  open,
  onClose,
  market,
  question,
  disputeWindowSec,
}: {
  open: boolean;
  onClose: () => void;
  market: Address;
  question: string;
  disputeWindowSec: bigint;
}) {
  const [outcome, setOutcome] = useState<0 | 1>(1);
  const { submitOutcome, isPending, isConfirming } = useSubmitOutcome();
  const busy = isPending || isConfirming;

  const windowMinutes = Number(disputeWindowSec) / 60;

  return (
    <Dialog open={open} onClose={onClose} title="Submit outcome">
      <h2 className="text-lg font-semibold mb-2">Submit outcome</h2>
      <p className="text-sm text-muted mb-4 line-clamp-3">
        <span className="font-medium text-fg">{question}</span>
      </p>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => setOutcome(1)}
          className={`rounded-md border p-3 text-left transition-colors ${
            outcome === 1
              ? "border-yes bg-yes/10"
              : "border-white/10 hover:border-white/20"
          }`}
        >
          <p className="text-xs font-medium text-yes">YES wins</p>
          <p className="text-xs text-muted mt-1">YES holders get paid.</p>
        </button>
        <button
          onClick={() => setOutcome(0)}
          className={`rounded-md border p-3 text-left transition-colors ${
            outcome === 0 ? "border-no bg-no/10" : "border-white/10 hover:border-white/20"
          }`}
        >
          <p className="text-xs font-medium text-no">NO wins</p>
          <p className="text-xs text-muted mt-1">NO holders get paid.</p>
        </button>
      </div>

      <div className="mb-4 p-3 rounded-md bg-accent/10 border border-accent/30 text-xs">
        <p className="text-fg font-medium mb-1">This starts the dispute window.</p>
        <p className="text-muted">
          Trading is blocked once the outcome is submitted. The window runs for{" "}
          <span className="text-fg">{windowMinutes} min</span>. Anyone can call{" "}
          <code className="font-mono">finalize()</code> after it closes to unlock claims.
        </p>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant={outcome === 1 ? "yes" : "no"}
          isLoading={busy}
          onClick={async () => {
            try {
              await submitOutcome(market, outcome);
              onClose();
            } catch {
              // toast handled
            }
          }}
        >
          Submit {outcome === 1 ? "YES" : "NO"}
        </Button>
      </div>
    </Dialog>
  );
}
