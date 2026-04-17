"use client";

import { useReadContract } from "wagmi";
import { keccak256, toBytes, type Address } from "viem";
import { MarketFactoryAbi } from "@/lib/abis";
import { addresses, isDeployed } from "@/lib/contracts";
import { DEMO_MODE } from "@/lib/demoMode";
import { mockIsOperator } from "@/lib/mockChain";

const OPERATOR_ROLE = keccak256(toBytes("OPERATOR_ROLE"));

/**
 * In demo mode, the visitor is the operator — they can exercise the admin
 * panel. Otherwise, checks OPERATOR_ROLE on the MarketFactory.
 */
export function useIsOperator(address: Address | undefined) {
  const wagmiQuery = useReadContract({
    address: addresses.marketFactory,
    abi: MarketFactoryAbi,
    functionName: "hasRole",
    args: address ? [OPERATOR_ROLE, address] : undefined,
    query: {
      enabled: !DEMO_MODE && isDeployed && !!address,
      staleTime: 30_000,
    },
  });

  if (DEMO_MODE) {
    return {
      data: address ? mockIsOperator(address) : false,
      isLoading: false,
      error: null,
    };
  }

  return wagmiQuery;
}
