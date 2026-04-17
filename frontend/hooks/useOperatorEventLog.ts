"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { parseAbiItem, type Address } from "viem";
import { addresses, deployedBlock, isDeployed } from "@/lib/contracts";
import { DEMO_MODE } from "@/lib/demoMode";
import { mockOperatorEvents } from "@/lib/mockChain";
import { useMockChainVersion } from "./useMockChain";

export type OperatorEvent = {
  kind: "MarketCreated" | "OutcomeSubmitted" | "Finalized" | "Dripped" | "Withdrawn";
  txHash: `0x${string}`;
  block: bigint;
  timestamp: number;
  summary: string;
  market?: Address;
};

const MARKET_CREATED = parseAbiItem(
  "event MarketCreated(address indexed market, address indexed operator, string question, uint256 b, uint256 subsidy, uint256 feeBps, uint256 disputeWindow)",
);
const OUTCOME_SUBMITTED = parseAbiItem(
  "event OutcomeSubmitted(address indexed market, uint8 outcome, uint64 disputeEndsAt)",
);
const FINALIZED = parseAbiItem("event Finalized(address indexed market, uint8 outcome)");
const DRIPPED = parseAbiItem(
  "event Dripped(address indexed recipient, uint256 usdcAmount, uint256 bnbAmount)",
);
const WITHDRAWN = parseAbiItem(
  "event Withdrawn(address indexed to, uint256 usdcAmount, uint256 bnbAmount)",
);

/**
 * Operator-relevant activity across factory, resolution, and dispenser.
 * Returns the most recent `limit` events, newest first. Cached 15s.
 */
export function useOperatorEventLog(limit = 20) {
  const client = usePublicClient();
  const version = useMockChainVersion();

  const wagmiQuery = useQuery({
    queryKey: ["operator-event-log", limit, addresses.marketFactory],
    enabled: !DEMO_MODE && !!client && isDeployed,
    staleTime: 15_000,
    refetchInterval: 20_000,
    queryFn: async (): Promise<OperatorEvent[]> => {
      if (!client) return [];

      const fromBlock = deployedBlock;

      const [created, submitted, finalized, dripped, withdrawn] = await Promise.all([
        client.getLogs({
          address: addresses.marketFactory,
          event: MARKET_CREATED,
          fromBlock,
          toBlock: "latest",
        }),
        client.getLogs({
          address: addresses.resolution,
          event: OUTCOME_SUBMITTED,
          fromBlock,
          toBlock: "latest",
        }),
        client.getLogs({
          address: addresses.resolution,
          event: FINALIZED,
          fromBlock,
          toBlock: "latest",
        }),
        client.getLogs({
          address: addresses.dispenser,
          event: DRIPPED,
          fromBlock,
          toBlock: "latest",
        }),
        client.getLogs({
          address: addresses.dispenser,
          event: WITHDRAWN,
          fromBlock,
          toBlock: "latest",
        }),
      ]);

      const all = [...created, ...submitted, ...finalized, ...dripped, ...withdrawn];
      // Fetch timestamps for unique blocks.
      const uniq = Array.from(new Set(all.map((l) => l.blockNumber ?? 0n)));
      const tsMap = new Map<bigint, number>();
      await Promise.all(
        uniq.map(async (bn) => {
          const blk = await client.getBlock({ blockNumber: bn });
          tsMap.set(bn, Number(blk.timestamp));
        }),
      );

      const decoded: OperatorEvent[] = [];

      for (const log of created) {
        const args = (log as unknown as { args: { market: Address; question: string } }).args;
        decoded.push({
          kind: "MarketCreated",
          txHash: log.transactionHash ?? "0x",
          block: log.blockNumber ?? 0n,
          timestamp: tsMap.get(log.blockNumber ?? 0n) ?? 0,
          summary: `Created "${truncate(args.question, 40)}"`,
          market: args.market,
        });
      }

      for (const log of submitted) {
        const args = (log as unknown as { args: { market: Address; outcome: number } }).args;
        decoded.push({
          kind: "OutcomeSubmitted",
          txHash: log.transactionHash ?? "0x",
          block: log.blockNumber ?? 0n,
          timestamp: tsMap.get(log.blockNumber ?? 0n) ?? 0,
          summary: `Proposed ${args.outcome === 1 ? "YES" : "NO"} outcome`,
          market: args.market,
        });
      }

      for (const log of finalized) {
        const args = (log as unknown as { args: { market: Address; outcome: number } }).args;
        decoded.push({
          kind: "Finalized",
          txHash: log.transactionHash ?? "0x",
          block: log.blockNumber ?? 0n,
          timestamp: tsMap.get(log.blockNumber ?? 0n) ?? 0,
          summary: `Finalized as ${args.outcome === 1 ? "YES" : "NO"}`,
          market: args.market,
        });
      }

      for (const log of dripped) {
        const args = (log as unknown as { args: { recipient: Address } }).args;
        decoded.push({
          kind: "Dripped",
          txHash: log.transactionHash ?? "0x",
          block: log.blockNumber ?? 0n,
          timestamp: tsMap.get(log.blockNumber ?? 0n) ?? 0,
          summary: `Dispenser drip → ${truncate(args.recipient, 10)}`,
        });
      }

      for (const log of withdrawn) {
        decoded.push({
          kind: "Withdrawn",
          txHash: log.transactionHash ?? "0x",
          block: log.blockNumber ?? 0n,
          timestamp: tsMap.get(log.blockNumber ?? 0n) ?? 0,
          summary: `Dispenser withdraw`,
        });
      }

      decoded.sort((a, b) => Number(b.block - a.block));
      return decoded.slice(0, limit);
    },
  });

  if (DEMO_MODE) {
    void version;
    const events: OperatorEvent[] = mockOperatorEvents().slice(0, limit).map((e) => ({
      kind: e.kind,
      txHash: e.txHash,
      block: 0n,
      timestamp: e.timestamp,
      summary: e.summary,
      market: e.market,
    }));
    return { data: events, isLoading: false, error: null };
  }

  return wagmiQuery;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
