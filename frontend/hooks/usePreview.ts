"use client";

import { useReadContract } from "wagmi";
import type { Address } from "viem";
import { MarketAbi } from "@/lib/abis";
import { DEMO_MODE } from "@/lib/demoMode";
import { mockMarket } from "@/lib/mockChain";
import { useMockChainVersion } from "./useMockChain";

export type TradePreview = {
  cost: bigint;         // USDC 6-dec
  fee: bigint;          // USDC 6-dec
  total: bigint;        // cost + fee (buy) | cost - fee (sell net)
  priceAfter: bigint;   // 18-dec
};

const SCALE = 1_000_000_000_000n; // 1e12
const BPS = 10_000n;

function demoPreview(
  market: Address | undefined,
  outcome: 0 | 1,
  shareAmount: bigint,
  kind: "buy" | "sell",
): TradePreview | undefined {
  if (!market || shareAmount <= 0n) return undefined;
  const m = mockMarket(market);
  if (!m) return undefined;

  const qNoAfter = kind === "buy"
    ? (outcome === 0 ? m.qNo + shareAmount : m.qNo)
    : (outcome === 0 ? m.qNo - shareAmount : m.qNo);
  const qYesAfter = kind === "buy"
    ? (outcome === 1 ? m.qYes + shareAmount : m.qYes)
    : (outcome === 1 ? m.qYes - shareAmount : m.qYes);

  const u0Before = Number(m.qNo) / Number(m.b);
  const u1Before = Number(m.qYes) / Number(m.b);
  const costBefore = Number(m.b) * Math.log(Math.exp(u0Before) + Math.exp(u1Before));

  const u0After = Number(qNoAfter) / Number(m.b);
  const u1After = Number(qYesAfter) / Number(m.b);
  const costAfter = Number(m.b) * Math.log(Math.exp(u0After) + Math.exp(u1After));

  const rawDelta = costAfter - costBefore;
  const mag = Math.abs(rawDelta);
  // Convert 18-dec internal to 6-dec USDC (ceil for buy, floor for sell).
  const usdcAmount = kind === "buy"
    ? BigInt(Math.ceil(mag / Number(SCALE)))
    : BigInt(Math.floor(mag / Number(SCALE)));

  const fee = (usdcAmount * m.feeBps + BPS - 1n) / BPS;

  // Compute post-trade price in 18-dec
  const priceYesAfter = Math.exp(u1After) / (Math.exp(u0After) + Math.exp(u1After));
  const priceAfter = BigInt(Math.round((outcome === 1 ? priceYesAfter : 1 - priceYesAfter) * 1e18));

  return {
    cost: usdcAmount,
    fee,
    total: kind === "buy" ? usdcAmount + fee : usdcAmount - fee,
    priceAfter,
  };
}

/**
 * Previews the cost of buying `shareAmount` of `outcome` in `market`.
 * In demo mode, computes the preview locally against the mock chain.
 */
export function useBuyPreview(
  market: Address | undefined,
  outcome: 0 | 1,
  shareAmount: bigint,
) {
  const version = useMockChainVersion();

  const { data, ...rest } = useReadContract({
    address: market,
    abi: MarketAbi,
    functionName: "previewBuy",
    args: market && shareAmount > 0n ? [outcome, shareAmount] : undefined,
    query: {
      enabled: !DEMO_MODE && !!market && shareAmount > 0n,
      staleTime: 3_000,
    },
  });

  if (DEMO_MODE) {
    void version;
    return { preview: demoPreview(market, outcome, shareAmount, "buy"), isLoading: false, error: null };
  }

  const preview: TradePreview | undefined = data
    ? {
        cost: (data as readonly [bigint, bigint, bigint])[0],
        fee: (data as readonly [bigint, bigint, bigint])[1],
        total:
          (data as readonly [bigint, bigint, bigint])[0] +
          (data as readonly [bigint, bigint, bigint])[1],
        priceAfter: (data as readonly [bigint, bigint, bigint])[2],
      }
    : undefined;

  return { preview, ...rest };
}

/**
 * Previews the payout of selling `shareAmount` of `outcome`.
 */
export function useSellPreview(
  market: Address | undefined,
  outcome: 0 | 1,
  shareAmount: bigint,
) {
  const version = useMockChainVersion();

  const { data, ...rest } = useReadContract({
    address: market,
    abi: MarketAbi,
    functionName: "previewSell",
    args: market && shareAmount > 0n ? [outcome, shareAmount] : undefined,
    query: {
      enabled: !DEMO_MODE && !!market && shareAmount > 0n,
      staleTime: 3_000,
    },
  });

  if (DEMO_MODE) {
    void version;
    return { preview: demoPreview(market, outcome, shareAmount, "sell"), isLoading: false, error: null };
  }

  const preview: TradePreview | undefined = data
    ? {
        cost: (data as readonly [bigint, bigint, bigint])[0],
        fee: (data as readonly [bigint, bigint, bigint])[1],
        total:
          (data as readonly [bigint, bigint, bigint])[0] -
          (data as readonly [bigint, bigint, bigint])[1],
        priceAfter: (data as readonly [bigint, bigint, bigint])[2],
      }
    : undefined;

  return { preview, ...rest };
}

/** Apply slippage tolerance (basis points) to a total. */
export function applySlippage(total: bigint, bps: number, direction: "up" | "down"): bigint {
  const delta = (total * BigInt(bps)) / 10_000n;
  return direction === "up" ? total + delta : total - delta;
}
