"use client";

import { useDemoAccount as useAccount } from "@/hooks/useDemoAccount";
import { Button } from "@/components/ui/Button";
import { truncateAddress } from "@/lib/explorer";
import { DEMO_MODE, DEMO_WALLET_LABEL } from "@/lib/demoMode";

/**
 * Wallet chip in the header.
 *
 * In demo mode: a static "Demo visitor · 0xDEM0…2233" pill. No wallet needed.
 * Otherwise: Reown AppKit's `<w3m-button>` custom element handles the connect
 * flow.
 */
export function ConnectButton() {
  const { address, isConnected } = useAccount();

  if (DEMO_MODE) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-yes" aria-hidden />
        <span className="text-muted">{DEMO_WALLET_LABEL}</span>
        <span className="font-mono text-fg">{address ? truncateAddress(address) : ""}</span>
      </div>
    );
  }

  if (!isConnected || !address) {
    return (
      // @ts-expect-error — Reown registers this as a custom element at runtime.
      <w3m-button label="Connect wallet" size="sm" />
    );
  }

  return (
    // @ts-expect-error — Reown custom element.
    <w3m-button balance="hide" size="sm" />
  );
}

/**
 * Fallback if we ever need to bypass the custom element.
 */
export function FallbackConnectButton() {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => {
        const w = window as unknown as { w3m?: { open: () => void } };
        w.w3m?.open();
      }}
    >
      Connect wallet
    </Button>
  );
}

export { truncateAddress };
