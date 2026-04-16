"use client";

import { useReadContract } from "wagmi";
import type { Address } from "viem";
import { MarketFactoryAbi } from "@/lib/abis";
import { addresses, isDeployed } from "@/lib/contracts";

/**
 * Returns the list of market addresses created by the factory.
 * Returns an empty list while the factory address is the zero placeholder.
 */
export function useMarkets() {
  return useReadContract({
    address: addresses.marketFactory,
    abi: MarketFactoryAbi,
    functionName: "markets",
    query: {
      enabled: isDeployed,
      staleTime: 30_000,
      select: (data): Address[] => (data as Address[]) ?? [],
    },
  });
}
