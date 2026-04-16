"use client";

import { useReadContract } from "wagmi";
import { keccak256, toBytes, type Address } from "viem";
import { MarketFactoryAbi } from "@/lib/abis";
import { addresses, isDeployed } from "@/lib/contracts";

const OPERATOR_ROLE = keccak256(toBytes("OPERATOR_ROLE"));

/**
 * Returns true iff `address` holds OPERATOR_ROLE on the MarketFactory.
 * The chain is the source of truth; this is a UI convenience check only —
 * on-chain gating enforces the real access control.
 */
export function useIsOperator(address: Address | undefined) {
  return useReadContract({
    address: addresses.marketFactory,
    abi: MarketFactoryAbi,
    functionName: "hasRole",
    args: address ? [OPERATOR_ROLE, address] : undefined,
    query: {
      enabled: isDeployed && !!address,
      staleTime: 30_000,
    },
  });
}
