"use client";

import { useCallback } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { erc20Abi, type Address } from "viem";
import { MarketAbi, ResolutionAbi, DispenserAbi } from "@/lib/abis";
import { addresses } from "@/lib/contracts";
import { txUrl } from "@/lib/explorer";
import { useToast } from "@/components/ui/Toast";
import { decodeError } from "@/lib/decodeError";

type TxKind = "approve" | "buy" | "sell" | "claim" | "drip";

type Options = {
  /** Human-readable confirmation message, e.g. "Bought 10 YES for $5.50". */
  successTitle?: string;
  /** Called with the tx hash after the wallet returns. */
  onSubmitted?: (hash: `0x${string}`) => void;
  /** Called after the tx is mined successfully. */
  onConfirmed?: (hash: `0x${string}`) => void;
};

/**
 * Low-level hook used by buy / sell / claim / drip. Wraps wagmi's
 * writeContract + waitForTransactionReceipt with toast + cache invalidation.
 */
function useWriteTx(kind: TxKind) {
  const { writeContractAsync, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: waitError } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });
  const toast = useToast();
  const qc = useQueryClient();

  const run = useCallback(
    async (args: Parameters<typeof writeContractAsync>[0], opts?: Options) => {
      const submittingId = toast.push({
        title: "Transaction submitted…",
        description: "Waiting for confirmation.",
        variant: "info",
        persistent: true,
      });

      try {
        const h = await writeContractAsync(args);
        opts?.onSubmitted?.(h);
        toast.dismiss(submittingId);
        toast.push({
          title: opts?.successTitle ?? `${kind} confirmed`,
          description: "Transaction is being mined.",
          variant: "success",
          action: { label: "View on BscScan", href: txUrl(h) },
        });
        return h;
      } catch (err) {
        toast.dismiss(submittingId);
        toast.push({
          title: `${kind} failed`,
          description: decodeError(err),
          variant: "error",
          persistent: true,
        });
        throw err;
      }
    },
    [writeContractAsync, kind, toast],
  );

  // Invalidate affected caches once the tx is mined.
  if (isSuccess && hash) {
    qc.invalidateQueries();
  }

  return {
    run,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    waitError,
    reset,
  };
}

/** Approve the market contract to spend the caller's USDC. Max-approval. */
export function useApprove(market: Address | undefined) {
  const { run, ...rest } = useWriteTx("approve");
  return {
    approve: () =>
      run(
        {
          address: addresses.mockUSDC,
          abi: erc20Abi,
          functionName: "approve",
          args: [market!, 2n ** 256n - 1n],
        },
        { successTitle: "Approval confirmed" },
      ),
    ...rest,
  };
}

/** Buy shares on a market. */
export function useBuy(market: Address | undefined) {
  const { run, ...rest } = useWriteTx("buy");
  return {
    buy: (outcome: 0 | 1, shareAmount: bigint, maxCost: bigint, successTitle?: string) =>
      run(
        {
          address: market!,
          abi: MarketAbi,
          functionName: "buy",
          args: [outcome, shareAmount, maxCost],
        },
        { successTitle },
      ),
    ...rest,
  };
}

/** Sell shares on a market. */
export function useSell(market: Address | undefined) {
  const { run, ...rest } = useWriteTx("sell");
  return {
    sell: (outcome: 0 | 1, shareAmount: bigint, minPayout: bigint, successTitle?: string) =>
      run(
        {
          address: market!,
          abi: MarketAbi,
          functionName: "sell",
          args: [outcome, shareAmount, minPayout],
        },
        { successTitle },
      ),
    ...rest,
  };
}

/** Claim winnings on a resolved market via the Resolution contract. */
export function useClaim() {
  const { run, ...rest } = useWriteTx("claim");
  return {
    claim: (market: Address) =>
      run(
        {
          address: addresses.resolution,
          abi: ResolutionAbi,
          functionName: "claim",
          args: [market],
        },
        { successTitle: "Claim confirmed" },
      ),
    ...rest,
  };
}

/** Drip MockUSDC + tBNB to the caller from the Dispenser. */
export function useDrip() {
  const { run, ...rest } = useWriteTx("drip");
  return {
    drip: () =>
      run(
        {
          address: addresses.dispenser,
          abi: DispenserAbi,
          functionName: "drip",
        },
        { successTitle: "Test funds received" },
      ),
    ...rest,
  };
}
