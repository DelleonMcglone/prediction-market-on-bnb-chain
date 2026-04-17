"use client";

import { useReadContracts } from "wagmi";
import type { Address } from "viem";
import { SharesAbi } from "@/lib/abis";
import { addresses, isDeployed } from "@/lib/contracts";
import { DEMO_MODE } from "@/lib/demoMode";
import { mockMarkets, mockSharesOf } from "@/lib/mockChain";
import { useMarkets } from "./useMarkets";
import { useMockChainVersion } from "./useMockChain";

export type Position = {
  market: Address;
  noShares: bigint;
  yesShares: bigint;
};

export function usePortfolio(wallet: Address | undefined) {
  const { data: markets } = useMarkets();
  const version = useMockChainVersion();

  const calls = markets && wallet && !DEMO_MODE
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

  const wagmiQuery = useReadContracts({
    allowFailure: false,
    contracts: calls,
    query: {
      enabled: !DEMO_MODE && isDeployed && !!wallet && !!markets && markets.length > 0,
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

  if (DEMO_MODE) {
    void version;
    if (!wallet) return { data: [] as Position[], isLoading: false, error: null };
    const positions: Position[] = [];
    for (const m of mockMarkets()) {
      const { no, yes } = mockSharesOf(m, wallet);
      if (no > 0n || yes > 0n) positions.push({ market: m, noShares: no, yesShares: yes });
    }
    return { data: positions, isLoading: false, error: null };
  }

  return wagmiQuery;
}

function encodeId(market: Address, outcome: 0 | 1): bigint {
  return (BigInt(market) << 1n) | BigInt(outcome);
}
