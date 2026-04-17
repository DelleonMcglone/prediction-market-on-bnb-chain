"use client";

import { useMemo } from "react";
import { useBalance, useReadContracts } from "wagmi";
import { erc20Abi } from "viem";
import { useMarkets } from "./useMarkets";
import { MarketAbi } from "@/lib/abis";
import { addresses, isDeployed } from "@/lib/contracts";

export type AdminStats = {
  totalMarkets: number;
  activeMarkets: number;
  pausedMarkets: number;
  resolvedMarkets: number;
  dispenserBnb: bigint;
  dispenserUsdc: bigint;
};

/**
 * Aggregate counts for the admin overview card. Batches the per-market
 * `paused` / `resolved` reads via multicall when available (public testnet),
 * falls back to individual eth_calls on Anvil.
 */
export function useAdminStats(): { data: AdminStats | undefined; isLoading: boolean } {
  const { data: markets, isLoading: loadingMarkets } = useMarkets();

  const { data: flags, isLoading: loadingFlags } = useReadContracts({
    allowFailure: false,
    contracts: (markets ?? []).flatMap((m) => [
      { address: m, abi: MarketAbi, functionName: "paused" as const },
      { address: m, abi: MarketAbi, functionName: "resolved" as const },
    ]),
    query: {
      enabled: !!markets && markets.length > 0,
      refetchInterval: 15_000,
      staleTime: 10_000,
    },
  });

  const { data: bnbBal } = useBalance({
    address: addresses.dispenser,
    query: { enabled: isDeployed, refetchInterval: 15_000 },
  });

  const { data: usdcBal } = useReadContracts({
    allowFailure: false,
    contracts: [
      {
        address: addresses.mockUSDC,
        abi: erc20Abi,
        functionName: "balanceOf" as const,
        args: [addresses.dispenser] as const,
      },
    ],
    query: { enabled: isDeployed, refetchInterval: 15_000 },
  });

  const data = useMemo<AdminStats | undefined>(() => {
    if (!markets) return undefined;
    let active = 0;
    let paused = 0;
    let resolved = 0;
    for (let i = 0; i < markets.length; i++) {
      const isPaused = flags?.[i * 2] as boolean | undefined;
      const isResolved = flags?.[i * 2 + 1] as boolean | undefined;
      if (isResolved) resolved++;
      else if (isPaused) paused++;
      else active++;
    }
    return {
      totalMarkets: markets.length,
      activeMarkets: active,
      pausedMarkets: paused,
      resolvedMarkets: resolved,
      dispenserBnb: bnbBal?.value ?? 0n,
      dispenserUsdc: (usdcBal?.[0] as bigint | undefined) ?? 0n,
    };
  }, [markets, flags, bnbBal, usdcBal]);

  return { data, isLoading: loadingMarkets || loadingFlags };
}
