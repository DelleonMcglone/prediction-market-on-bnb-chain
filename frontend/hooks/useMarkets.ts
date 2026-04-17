"use client";

import { useReadContract } from "wagmi";
import type { Address } from "viem";
import { MarketFactoryAbi } from "@/lib/abis";
import { addresses, isDeployed } from "@/lib/contracts";
import { DEMO_MODE } from "@/lib/demoMode";
import { mockMarkets } from "@/lib/mockChain";
import { useMockChainVersion } from "./useMockChain";

/**
 * Returns the list of market addresses. In demo mode reads from the local
 * mock chain; otherwise reads from the MarketFactory.
 */
export function useMarkets() {
  const version = useMockChainVersion();
  const wagmiQuery = useReadContract({
    address: addresses.marketFactory,
    abi: MarketFactoryAbi,
    functionName: "markets",
    query: {
      enabled: !DEMO_MODE && isDeployed,
      staleTime: 30_000,
      select: (data): Address[] => (data as Address[]) ?? [],
    },
  });

  if (DEMO_MODE) {
    void version; // re-run when the mock chain updates
    return {
      data: mockMarkets(),
      isLoading: false,
      error: null,
    };
  }

  return wagmiQuery;
}
