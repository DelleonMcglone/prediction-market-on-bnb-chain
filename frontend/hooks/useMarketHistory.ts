"use client";

import { useMemo } from "react";
import { usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { parseAbiItem, type Address, type Log } from "viem";
import { useMarketData } from "./useMarketData";
import { lmsrPrice } from "@/lib/lmsr";
import { deployedBlock } from "@/lib/contracts";

const BOUGHT_EVENT = parseAbiItem(
  "event Bought(address indexed trader, uint8 outcome, uint256 shareAmount, uint256 cost, uint256 fee)",
);
const SOLD_EVENT = parseAbiItem(
  "event Sold(address indexed trader, uint8 outcome, uint256 shareAmount, uint256 payout, uint256 fee)",
);

export type HistoryPoint = {
  /** Unix timestamp, seconds. */
  t: number;
  /** YES price, float in [0, 1]. */
  priceYes: number;
  /** Block number, used as a stable key. */
  block: bigint;
};

export type TradeRecord = {
  kind: "Bought" | "Sold";
  trader: Address;
  outcome: 0 | 1;
  shareAmount: bigint;
  cost: bigint;
  fee: bigint;
  block: bigint;
  txHash: `0x${string}`;
  timestamp: number;
};

/**
 * Reads Bought/Sold events for a market, reconstructs LMSR quantities over
 * time, and returns both the raw trade list and a price-vs-time series
 * suitable for recharts. Caches via TanStack Query per market address.
 */
export function useMarketHistory(market: Address | undefined) {
  const client = usePublicClient();
  const { data: marketData } = useMarketData(market);

  const b = marketData?.question !== undefined ? 100n * 10n ** 18n : undefined;
  // b is a constant in our demo (100e18), but we only compute history once we
  // have market metadata loaded so the hook doesn't fire on every mount.

  return useQuery({
    queryKey: ["market-history", market],
    enabled: !!client && !!market && !!b,
    staleTime: 15_000,
    refetchInterval: 15_000,
    queryFn: async () => {
      if (!client || !market || !b) return { history: [], trades: [] };

      // Pull both event types. `getContractEvents` with fromBlock=0n is fine on
      // a low-traffic market; for production we'd pin fromBlock to the
      // deployment block recorded in deployments/.
      const [boughtLogs, soldLogs] = await Promise.all([
        client.getLogs({
          address: market,
          event: BOUGHT_EVENT,
          fromBlock: deployedBlock,
          toBlock: "latest",
        }),
        client.getLogs({
          address: market,
          event: SOLD_EVENT,
          fromBlock: deployedBlock,
          toBlock: "latest",
        }),
      ]);

      const all = [...boughtLogs, ...soldLogs].sort(byBlockThenLog);

      // Reconstruct per-step quantities and prices. Block timestamps are
      // fetched in parallel (one call per unique block).
      const uniqBlocks = Array.from(new Set(all.map((l) => l.blockNumber ?? 0n)));
      const blockTimestamps = new Map<bigint, number>();
      await Promise.all(
        uniqBlocks.map(async (bn) => {
          const blk = await client.getBlock({ blockNumber: bn });
          blockTimestamps.set(bn, Number(blk.timestamp));
        }),
      );

      let qNo = 0n;
      let qYes = 0n;
      const history: HistoryPoint[] = [
        // Seed with the neutral starting price so the chart has a baseline.
        { t: 0, priceYes: 0.5, block: 0n },
      ];
      const trades: TradeRecord[] = [];

      for (const log of all) {
        const block = log.blockNumber ?? 0n;
        const t = blockTimestamps.get(block) ?? 0;
        const decoded = decodeLog(log);
        if (!decoded) continue;

        const { kind, outcome, shareAmount } = decoded;
        const delta = kind === "Bought" ? shareAmount : -shareAmount;
        if (outcome === 1) qYes += delta;
        else qNo += delta;

        const priceYes = lmsrPrice(qNo, qYes, b, 1);
        history.push({ t, priceYes, block });

        trades.push({
          kind,
          trader: decoded.trader,
          outcome,
          shareAmount,
          cost: decoded.costOrPayout,
          fee: decoded.fee,
          block,
          txHash: log.transactionHash ?? "0x",
          timestamp: t,
        });

        // Give the seed point a real timestamp once we see the first event.
        if (history.length === 2 && history[0].t === 0) {
          history[0] = { ...history[0], t };
        }
      }

      return { history, trades };
    },
    select: (data) => data ?? { history: [], trades: [] },
  });
}

function byBlockThenLog(a: Log, b: Log): number {
  const ab = a.blockNumber ?? 0n;
  const bb = b.blockNumber ?? 0n;
  if (ab !== bb) return ab < bb ? -1 : 1;
  const ai = a.logIndex ?? 0;
  const bi = b.logIndex ?? 0;
  return ai - bi;
}

type Decoded = {
  kind: "Bought" | "Sold";
  trader: Address;
  outcome: 0 | 1;
  shareAmount: bigint;
  costOrPayout: bigint;
  fee: bigint;
};

function decodeLog(log: Log): Decoded | null {
  // viem's getLogs returns decoded args when `event` is passed. We re-narrow.
  const args = (log as unknown as { args?: Record<string, unknown>; eventName?: string }).args;
  const eventName = (log as unknown as { eventName?: string }).eventName;
  if (!args) return null;

  const trader = args.trader as Address | undefined;
  const outcome = args.outcome as number | undefined;
  const shareAmount = args.shareAmount as bigint | undefined;
  const fee = args.fee as bigint | undefined;
  const cost = (args.cost ?? args.payout) as bigint | undefined;

  if (!trader || outcome === undefined || shareAmount === undefined || fee === undefined || cost === undefined) {
    return null;
  }

  // Distinguish Bought vs Sold. If eventName isn't populated, infer from the
  // arg shape: Bought has `cost`, Sold has `payout`.
  const kind: "Bought" | "Sold" = eventName === "Sold" || "payout" in args ? "Sold" : "Bought";

  return {
    kind,
    trader,
    outcome: (outcome === 1 ? 1 : 0) as 0 | 1,
    shareAmount,
    costOrPayout: cost,
    fee,
  };
}

/** Memoized sample for recharts: if we have many points, downsample. */
export function useSampledHistory(history: HistoryPoint[], maxPoints = 200): HistoryPoint[] {
  return useMemo(() => {
    if (history.length <= maxPoints) return history;
    const stride = Math.ceil(history.length / maxPoints);
    return history.filter((_, i) => i % stride === 0 || i === history.length - 1);
  }, [history, maxPoints]);
}
