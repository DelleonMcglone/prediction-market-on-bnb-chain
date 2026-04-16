"use client";

import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";
import { truncateAddress } from "@/lib/explorer";

/**
 * Thin wrapper around Reown AppKit's connect UI. Uses the `<w3m-button />`
 * custom element registered by `createAppKit` in `lib/reown.ts`.
 */
export function ConnectButton() {
  const { address, isConnected } = useAccount();

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
 * Fallback component that uses a plain button calling the `web3modal` global
 * open(). Kept as a reference in case we need to ditch the custom element.
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
