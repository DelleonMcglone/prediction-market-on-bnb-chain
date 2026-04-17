"use client";

import { useMemo } from "react";
import { usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { parseAbiItem, type Address, type Log } from "viem";
import { useMarketData } from "./useMarketData";
import { lmsrPrice } from "@/lib/lmsr";
import { deployedBlock } from "@/lib/contracts";
import { DEMO_MODE } from "@/lib/demoMode";
import { mockMarket, mockTrades, type MockTrade } from "@/lib/mockChain";
import { useMockChainVersion } from "./useMockChain";

const BOUGHT_EVENT = parseAbiItem(
  "event Bought(address indexed trader, uint8 outcome, uint256 shareAmount, uint256 cost, uint256 fee)",
);
const SOLD_EVENT = parseAbiItem(
  "event Sold(address indexed trader, uint8 outcome, uint256 shareAmount, uint256 payout, uint256 fee)",
);

export type HistoryPoint = {
  t: number;
  priceYes: number;
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
 * Reads Bought/Sold events for a market and reconstructs a price-over-time
 * series. In demo mode, replays the mock chain's recorded trades.
 */
export function useMarketHistory(market: Address | undefined) {
  const client = usePublicClient();
  const { data: marketData } = useMarketData(market);
  const version = useMockChainVersion();

  const wagmiQuery = useQuery({
    queryKey: ["market-history", market],
    enabled: !DEMO_MODE && !!client && !!market && !!marketData,
    staleTime: 15_000,
    refetchInterval: 15_000,
    queryFn: async () => {
      if (!client || !market || !marketData) return { history: [], trades: [] };

      const b = 100n * 10n ** 18n;

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
      const history: HistoryPoint[] = [{ t: 0, priceYes: 0.5, block: 0n }];
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

        if (history.length === 2 && history[0].t === 0) {
          history[0] = { ...history[0], t };
        }
      }

      return { history, trades };
    },
    select: (data) => data ?? { history: [], trades: [] },
  });

  if (DEMO_MODE) {
    void version;
    return {
      data: buildDemoHistory(market),
      isLoading: false,
      error: null,
    };
  }

  return wagmiQuery;
}

function buildDemoHistory(market: Address | undefined): { history: HistoryPoint[]; trades: TradeRecord[] } {
  if (!market) return { history: [], trades: [] };
  const m = mockMarket(market);
  if (!m) return { history: [], trades: [] };
  const rawTrades = mockTrades(market);
  const b = m.b;

  let qNo = 0n;
  let qYes = 0n;
  const history: HistoryPoint[] = [{
    t: rawTrades[0]?.timestamp ?? Math.floor(Date.now() / 1000),
    priceYes: 0.5,
    block: 0n,
  }];
  const trades: TradeRecord[] = [];

  for (const t of rawTrades) {
    const delta = t.kind === "Bought" ? t.shareAmount : -t.shareAmount;
    if (t.outcome === 1) qYes += delta;
    else qNo += delta;
    history.push({ t: t.timestamp, priceYes: lmsrPrice(qNo, qYes, b, 1), block: t.block });
    trades.push(normalizeTrade(t));
  }

  return { history, trades };
}

function normalizeTrade(t: MockTrade): TradeRecord {
  return {
    kind: t.kind,
    trader: t.trader,
    outcome: t.outcome,
    shareAmount: t.shareAmount,
    cost: t.cost,
    fee: t.fee,
    block: t.block,
    txHash: t.txHash,
    timestamp: t.timestamp,
  };
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

export function useSampledHistory(history: HistoryPoint[], maxPoints = 200): HistoryPoint[] {
  return useMemo(() => {
    if (history.length <= maxPoints) return history;
    const stride = Math.ceil(history.length / maxPoints);
    return history.filter((_, i) => i % stride === 0 || i === history.length - 1);
  }, [history, maxPoints]);
}
