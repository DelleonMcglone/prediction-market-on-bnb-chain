"use client";

import { useReadContract } from "wagmi";
import { erc20Abi, type Address } from "viem";
import { addresses, isDeployed } from "@/lib/contracts";
import { DEMO_MODE } from "@/lib/demoMode";
import { mockUsdcBalance, mockSharesOf } from "@/lib/mockChain";
import { SharesAbi } from "@/lib/abis";
import { useMockChainVersion } from "./useMockChain";

/** USDC balance for a holder. Demo-aware. */
export function useUsdcBalance(holder: Address | undefined) {
  const version = useMockChainVersion();

  const wagmiQuery = useReadContract({
    address: addresses.mockUSDC,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: holder ? [holder] : undefined,
    query: {
      enabled: !DEMO_MODE && isDeployed && !!holder,
      refetchInterval: 10_000,
    },
  });

  if (DEMO_MODE) {
    void version;
    return {
      data: holder ? mockUsdcBalance(holder) : 0n,
      isLoading: false,
      error: null,
    };
  }
  return wagmiQuery;
}

/** Shares balance for `holder` in `market` for `outcome`. Demo-aware. */
export function useSharesBalance(
  market: Address | undefined,
  holder: Address | undefined,
  outcome: 0 | 1,
) {
  const version = useMockChainVersion();
  const id = market && encodeId(market, outcome);

  const wagmiQuery = useReadContract({
    address: addresses.shares,
    abi: SharesAbi,
    functionName: "balanceOf",
    args: holder && id !== undefined ? [holder, id] : undefined,
    query: {
      enabled: !DEMO_MODE && isDeployed && !!holder && !!market,
      refetchInterval: 10_000,
    },
  });

  if (DEMO_MODE) {
    void version;
    if (!holder || !market) return { data: 0n, isLoading: false, error: null };
    const bucket = mockSharesOf(market, holder);
    return { data: outcome === 1 ? bucket.yes : bucket.no, isLoading: false, error: null };
  }
  return wagmiQuery;
}

function encodeId(market: Address, outcome: 0 | 1): bigint {
  return (BigInt(market) << 1n) | BigInt(outcome);
}
