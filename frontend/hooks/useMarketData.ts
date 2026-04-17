"use client";

import { useReadContracts } from "wagmi";
import type { Address } from "viem";
import { MarketAbi } from "@/lib/abis";
import { DEMO_MODE } from "@/lib/demoMode";
import { mockMarketData } from "@/lib/mockChain";
import { useMockChainVersion } from "./useMockChain";

export type MarketData = {
  address: Address;
  question: string;
  qNo: bigint;
  qYes: bigint;
  priceNo: bigint;
  priceYes: bigint;
  collateralBalance: bigint;
  subsidyBudget: bigint;
  paused: boolean;
  resolved: boolean;
  winningOutcome: 0 | 1;
  disputeWindow: bigint;
};

/**
 * Batch-read the state of a single market. In demo mode, pulls from the local
 * mock store. Otherwise, uses multicall against the deployed Market contract.
 */
export function useMarketData(address: Address | undefined) {
  const version = useMockChainVersion();

  const wagmiQuery = useReadContracts({
    allowFailure: false,
    contracts: address
      ? [
          { address, abi: MarketAbi, functionName: "question" },
          { address, abi: MarketAbi, functionName: "qNo" },
          { address, abi: MarketAbi, functionName: "qYes" },
          { address, abi: MarketAbi, functionName: "priceOf", args: [0] },
          { address, abi: MarketAbi, functionName: "priceOf", args: [1] },
          { address, abi: MarketAbi, functionName: "collateralBalance" },
          { address, abi: MarketAbi, functionName: "subsidyBudget" },
          { address, abi: MarketAbi, functionName: "paused" },
          { address, abi: MarketAbi, functionName: "resolved" },
          { address, abi: MarketAbi, functionName: "winningOutcome" },
          { address, abi: MarketAbi, functionName: "disputeWindow" },
        ]
      : [],
    query: {
      enabled: !DEMO_MODE && !!address,
      refetchInterval: 10_000,
      staleTime: 5_000,
      select: (data): MarketData | undefined => {
        if (!address) return undefined;
        const [
          question,
          qNo,
          qYes,
          priceNo,
          priceYes,
          collateralBalance,
          subsidyBudget,
          paused,
          resolved,
          winningOutcome,
          disputeWindow,
        ] = data as [
          string,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          boolean,
          boolean,
          number,
          bigint,
        ];
        return {
          address,
          question,
          qNo,
          qYes,
          priceNo,
          priceYes,
          collateralBalance,
          subsidyBudget,
          paused,
          resolved,
          winningOutcome: (winningOutcome ? 1 : 0) as 0 | 1,
          disputeWindow,
        };
      },
    },
  });

  if (DEMO_MODE) {
    void version;
    const data = address ? (mockMarketData(address) as MarketData | undefined) : undefined;
    return { data, isLoading: false, error: null };
  }

  return wagmiQuery;
}
