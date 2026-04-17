"use client";

import { useReadContract } from "wagmi";
import type { Address } from "viem";
import { MarketAbi } from "@/lib/abis";

export type TradePreview = {
  cost: bigint;         // USDC 6-dec
  fee: bigint;          // USDC 6-dec
  total: bigint;        // cost + fee
  priceAfter: bigint;   // 18-dec
};

/**
 * Previews the cost of buying `shareAmount` of `outcome` in `market`.
 * Debounced via TanStack Query's staleTime — callers should debounce the
 * `shareAmount` input themselves to avoid firing on every keystroke.
 */
export function useBuyPreview(
  market: Address | undefined,
  outcome: 0 | 1,
  shareAmount: bigint,
) {
  const { data, ...rest } = useReadContract({
    address: market,
    abi: MarketAbi,
    functionName: "previewBuy",
    args: market && shareAmount > 0n ? [outcome, shareAmount] : undefined,
    query: {
      enabled: !!market && shareAmount > 0n,
      staleTime: 3_000,
    },
  });

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
 * `cost` on the returned preview represents the gross payout; `total` is
 * the net to the seller after fee.
 */
export function useSellPreview(
  market: Address | undefined,
  outcome: 0 | 1,
  shareAmount: bigint,
) {
  const { data, ...rest } = useReadContract({
    address: market,
    abi: MarketAbi,
    functionName: "previewSell",
    args: market && shareAmount > 0n ? [outcome, shareAmount] : undefined,
    query: {
      enabled: !!market && shareAmount > 0n,
      staleTime: 3_000,
    },
  });

  const preview: TradePreview | undefined = data
    ? {
        cost: (data as readonly [bigint, bigint, bigint])[0], // gross payout
        fee: (data as readonly [bigint, bigint, bigint])[1],
        total:
          (data as readonly [bigint, bigint, bigint])[0] -
          (data as readonly [bigint, bigint, bigint])[1], // net payout
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
