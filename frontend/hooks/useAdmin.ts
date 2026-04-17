"use client";

import { useCallback } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { erc20Abi, type Address } from "viem";

import { MarketAbi, MarketFactoryAbi, ResolutionAbi, DispenserAbi } from "@/lib/abis";
import { addresses } from "@/lib/contracts";
import { txUrl } from "@/lib/explorer";
import { useToast } from "@/components/ui/Toast";
import { decodeError } from "@/lib/decodeError";

/**
 * Admin-side write hooks. Mirrors the pattern in useTrade.ts — submitting toast,
 * confirmation toast with BscScan link, decoded errors, cache invalidation.
 */
function useWriteTx(kind: string) {
  const { writeContractAsync, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });
  const toast = useToast();
  const qc = useQueryClient();

  const run = useCallback(
    async (
      args: Parameters<typeof writeContractAsync>[0],
      successTitle?: string,
    ) => {
      const submittingId = toast.push({
        title: "Transaction submitted…",
        description: "Waiting for confirmation.",
        variant: "info",
        persistent: true,
      });

      try {
        const h = await writeContractAsync(args);
        toast.dismiss(submittingId);
        toast.push({
          title: successTitle ?? `${kind} confirmed`,
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

  if (isSuccess && hash) qc.invalidateQueries();

  return { run, hash, isPending, isConfirming, isSuccess, reset };
}

// ---------- MockUSDC ----------

export function useMintUsdc() {
  const { run, ...rest } = useWriteTx("mint");
  return {
    mint: (to: Address, amount: bigint) =>
      run(
        {
          address: addresses.mockUSDC,
          abi: [
            {
              type: "function",
              name: "mint",
              stateMutability: "nonpayable",
              inputs: [
                { name: "to", type: "address" },
                { name: "amount", type: "uint256" },
              ],
              outputs: [],
            },
          ] as const,
          functionName: "mint",
          args: [to, amount],
        },
        "Minted USDC",
      ),
    ...rest,
  };
}

export function useApproveForFactory() {
  const { run, ...rest } = useWriteTx("approve");
  return {
    approve: (amount: bigint) =>
      run(
        {
          address: addresses.mockUSDC,
          abi: erc20Abi,
          functionName: "approve",
          args: [addresses.marketFactory, amount],
        },
        "Approved factory",
      ),
    ...rest,
  };
}

// ---------- MarketFactory ----------

export function useCreateMarket() {
  const { run, ...rest } = useWriteTx("create market");
  return {
    createMarket: (
      question: string,
      b: bigint,
      subsidy: bigint,
      feeBps: bigint,
      disputeWindow: bigint,
    ) =>
      run(
        {
          address: addresses.marketFactory,
          abi: MarketFactoryAbi,
          functionName: "createMarket",
          args: [question, b, subsidy, feeBps, disputeWindow],
        },
        "Market created",
      ),
    ...rest,
  };
}

// ---------- Market (pause / unpause) ----------

export function usePauseMarket(market: Address | undefined) {
  const { run, ...rest } = useWriteTx("pause");
  return {
    pause: () =>
      run(
        {
          address: market!,
          abi: MarketAbi,
          functionName: "pause",
        },
        "Market paused",
      ),
    ...rest,
  };
}

export function useUnpauseMarket(market: Address | undefined) {
  const { run, ...rest } = useWriteTx("unpause");
  return {
    unpause: () =>
      run(
        {
          address: market!,
          abi: MarketAbi,
          functionName: "unpause",
        },
        "Market unpaused",
      ),
    ...rest,
  };
}

// ---------- Resolution ----------

export function useSubmitOutcome() {
  const { run, ...rest } = useWriteTx("submit outcome");
  return {
    submitOutcome: (market: Address, outcome: 0 | 1) =>
      run(
        {
          address: addresses.resolution,
          abi: ResolutionAbi,
          functionName: "submitOutcome",
          args: [market, outcome],
        },
        "Outcome submitted",
      ),
    ...rest,
  };
}

export function useFinalize() {
  const { run, ...rest } = useWriteTx("finalize");
  return {
    finalize: (market: Address) =>
      run(
        {
          address: addresses.resolution,
          abi: ResolutionAbi,
          functionName: "finalize",
          args: [market],
        },
        "Market finalized",
      ),
    ...rest,
  };
}

// ---------- Dispenser ----------

export function useWithdrawDispenser() {
  const { run, ...rest } = useWriteTx("withdraw");
  return {
    withdraw: (to: Address) =>
      run(
        {
          address: addresses.dispenser,
          abi: DispenserAbi,
          functionName: "withdraw",
          args: [to],
        },
        "Dispenser drained",
      ),
    ...rest,
  };
}
