"use client";

import { useAccount, useReadContract } from "wagmi";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { useDrip } from "@/hooks/useTrade";
import { DispenserAbi } from "@/lib/abis";
import { addresses } from "@/lib/contracts";

export function DispenserModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { address, isConnected } = useAccount();
  const { drip, isPending, isConfirming } = useDrip();

  const { data: alreadyServed } = useReadContract({
    address: addresses.dispenser,
    abi: DispenserAbi,
    functionName: "served",
    args: address ? [address] : undefined,
    query: { enabled: !!address && open },
  });

  const busy = isPending || isConfirming;

  return (
    <Dialog open={open} onClose={onClose} title="Get test funds">
      <h2 className="text-lg font-semibold mb-2">Get test funds</h2>

      {!isConnected ? (
        <p className="text-sm text-muted mb-4">
          Connect a wallet first, then come back to claim.
        </p>
      ) : alreadyServed ? (
        <>
          <p className="text-sm text-muted mb-4">
            This wallet has already received a drip. If you need more tBNB for gas,
            the{" "}
            <a
              href="https://faucet.quicknode.com/binance-smart-chain/bnb-testnet"
              target="_blank"
              rel="noreferrer"
              className="text-accent underline"
            >
              QuickNode faucet
            </a>{" "}
            tops up real testnet wallets.
          </p>
          <Button variant="secondary" onClick={onClose} className="w-full">
            Close
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted mb-4">
            We&apos;ll send this wallet ~<span className="text-fg">100 mUSDC</span>{" "}
            and a tiny bit of tBNB for gas. One-shot per address.
          </p>
          <Button
            onClick={async () => {
              try {
                await drip();
                onClose();
              } catch {
                // toast raised
              }
            }}
            isLoading={busy}
            size="lg"
            className="w-full"
          >
            {busy ? "Dripping…" : "Drip funds"}
          </Button>
        </>
      )}
    </Dialog>
  );
}
