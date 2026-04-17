"use client";

import { useAccount as useWagmiAccount } from "wagmi";
import type { Address } from "viem";
import { DEMO_MODE, DEMO_WALLET_ADDRESS } from "@/lib/demoMode";
import { CHAIN_ID } from "@/lib/contracts";

type AccountShape = {
  address: Address | undefined;
  isConnected: boolean;
  chain: { id: number; name?: string } | undefined;
};

/**
 * Drop-in replacement for `useAccount()` that auto-connects the demo wallet
 * when NEXT_PUBLIC_DEMO_MODE is on. All other code paths remain untouched.
 */
export function useDemoAccount(): AccountShape {
  const wagmi = useWagmiAccount();
  if (DEMO_MODE) {
    return {
      address: DEMO_WALLET_ADDRESS,
      isConnected: true,
      chain: { id: CHAIN_ID },
    };
  }
  return {
    address: wagmi.address,
    isConnected: wagmi.isConnected,
    chain: wagmi.chain,
  };
}
