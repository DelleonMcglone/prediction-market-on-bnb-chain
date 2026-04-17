"use client";

import { useSwitchChain } from "wagmi";
import { useDemoAccount as useAccount } from "@/hooks/useDemoAccount";
import { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { CHAIN_ID } from "@/lib/contracts";

/**
 * Blocks children from rendering when the connected wallet is on the wrong chain.
 * Disconnected users pass through — nothing to guard yet.
 */
export function NetworkGuard({ children }: { children: ReactNode }) {
  const { isConnected, chain } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected) return <>{children}</>;
  if (chain?.id === CHAIN_ID) return <>{children}</>;

  return (
    <div className="max-w-md mx-auto mt-24 p-6 rounded-lg border border-accent/30 bg-accent/5 text-center">
      <h2 className="text-lg font-semibold mb-2">Wrong network</h2>
      <p className="text-sm text-muted mb-4">
        This demo only runs on BNB testnet (chain {CHAIN_ID}). You&apos;re currently
        connected to {chain?.name ?? `chain ${chain?.id ?? "?"}`}.
      </p>
      <Button
        onClick={() => switchChain({ chainId: CHAIN_ID })}
        isLoading={isPending}
        size="md"
      >
        Switch to BNB testnet
      </Button>
    </div>
  );
}
