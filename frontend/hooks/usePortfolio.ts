"use client";

import { useReadContracts } from "wagmi";
import type { Address } from "viem";
import { SharesAbi } from "@/lib/abis";
import { addresses, isDeployed } from "@/lib/contracts";
import { useMarkets } from "./useMarkets";

export type Position = {
  market: Address;
  noShares: bigint;
  yesShares: bigint;
};

/**
 * Reads the caller's per-market NO/YES share balances across every market
 * known to the factory. Phase 05 expands this with market metadata + P&L.
 */
export function usePortfolio(wallet: Address | undefined) {
  const { data: markets } = useMarkets();

  const calls = markets && wallet
    ? markets.flatMap((market) => [
        {
          address: addresses.shares,
          abi: SharesAbi,
          functionName: "balanceOf" as const,
          args: [wallet, encodeId(market, 0)],
        },
        {
          address: addresses.shares,
          abi: SharesAbi,
          functionName: "balanceOf" as const,
          args: [wallet, encodeId(market, 1)],
        },
      ])
    : [];

  return useReadContracts({
    allowFailure: false,
    contracts: calls,
    query: {
      enabled: isDeployed && !!wallet && !!markets && markets.length > 0,
      refetchInterval: 15_000,
      select: (data): Position[] => {
        if (!markets) return [];
        const positions: Position[] = [];
        for (let i = 0; i < markets.length; i++) {
          const noShares = (data[i * 2] as bigint) ?? 0n;
          const yesShares = (data[i * 2 + 1] as bigint) ?? 0n;
          if (noShares > 0n || yesShares > 0n) {
            positions.push({ market: markets[i], noShares, yesShares });
          }
        }
        return positions;
      },
    },
  });
}

/** Mirrors Shares.idFor(market, outcome). */
function encodeId(market: Address, outcome: 0 | 1): bigint {
  return (BigInt(market) << 1n) | BigInt(outcome);
}
