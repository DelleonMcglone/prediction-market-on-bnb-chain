"use client";

import { useCallback, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { erc20Abi, type Address } from "viem";

import { MarketAbi, MarketFactoryAbi, ResolutionAbi, DispenserAbi } from "@/lib/abis";
import { addresses } from "@/lib/contracts";
import { txUrl } from "@/lib/explorer";
import { useToast } from "@/components/ui/Toast";
import { decodeError } from "@/lib/decodeError";
import { DEMO_MODE, DEMO_WALLET_ADDRESS } from "@/lib/demoMode";
import {
  mockMint,
  mockApprove,
  mockCreateMarket,
  mockPause,
  mockUnpause,
  mockSubmitOutcome,
  mockFinalize,
  mockWithdrawDispenser,
  MOCK_ADDRESSES,
} from "@/lib/mockChain";

/**
 * Admin-side write hooks. Mirrors the pattern in useTrade.ts — submitting toast,
 * confirmation toast, decoded errors, cache invalidation. Branches on DEMO_MODE
 * so admin flows work against the in-memory mock chain.
 */
function useWriteTx(kind: string) {
  const { writeContractAsync, data: hash, isPending: wagmiPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !DEMO_MODE && !!hash },
  });
  const toast = useToast();
  const qc = useQueryClient();
  const [demoPending, setDemoPending] = useState(false);

  const run = useCallback(
    async (args: Parameters<typeof writeContractAsync>[0], successTitle?: string) => {
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

  const runDemo = useCallback(
    async (tx: () => Promise<`0x${string}`>, successTitle?: string) => {
      setDemoPending(true);
      const submittingId = toast.push({
        title: "Transaction submitted…",
        description: "Demo mode — simulated confirmation.",
        variant: "info",
        persistent: true,
      });
      try {
        const h = await tx();
        toast.dismiss(submittingId);
        toast.push({
          title: successTitle ?? `${kind} confirmed`,
          description: "Demo transaction mined.",
          variant: "success",
        });
        qc.invalidateQueries();
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
      } finally {
        setDemoPending(false);
      }
    },
    [kind, toast, qc],
  );

  if (!DEMO_MODE && isSuccess && hash) qc.invalidateQueries();

  return {
    run,
    runDemo,
    hash,
    isPending: DEMO_MODE ? demoPending : wagmiPending,
    isConfirming: DEMO_MODE ? false : isConfirming,
    isSuccess,
    reset,
  };
}

// ---------- MockUSDC ----------

export function useMintUsdc() {
  const { run, runDemo, ...rest } = useWriteTx("mint");
  return {
    mint: (to: Address, amount: bigint) => {
      if (DEMO_MODE) return runDemo(() => mockMint(to, amount), "Minted USDC");
      return run(
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
      );
    },
    ...rest,
  };
}

export function useApproveForFactory() {
  const { run, runDemo, ...rest } = useWriteTx("approve");
  return {
    approve: (amount: bigint) => {
      if (DEMO_MODE) {
        return runDemo(
          () => mockApprove(DEMO_WALLET_ADDRESS, MOCK_ADDRESSES.marketFactory as Address, amount),
          "Approved factory",
        );
      }
      return run(
        {
          address: addresses.mockUSDC,
          abi: erc20Abi,
          functionName: "approve",
          args: [addresses.marketFactory, amount],
        },
        "Approved factory",
      );
    },
    ...rest,
  };
}

// ---------- MarketFactory ----------

export function useCreateMarket() {
  const { run, runDemo, ...rest } = useWriteTx("create market");
  return {
    createMarket: (
      question: string,
      b: bigint,
      subsidy: bigint,
      feeBps: bigint,
      disputeWindow: bigint,
    ) => {
      if (DEMO_MODE) {
        return runDemo(async () => {
          const result = await mockCreateMarket(
            DEMO_WALLET_ADDRESS,
            question,
            b,
            subsidy,
            feeBps,
            disputeWindow,
          );
          return result.hash;
        }, "Market created");
      }
      return run(
        {
          address: addresses.marketFactory,
          abi: MarketFactoryAbi,
          functionName: "createMarket",
          args: [question, b, subsidy, feeBps, disputeWindow],
        },
        "Market created",
      );
    },
    ...rest,
  };
}

// ---------- Market (pause / unpause) ----------

export function usePauseMarket(market: Address | undefined) {
  const { run, runDemo, ...rest } = useWriteTx("pause");
  return {
    pause: () => {
      if (DEMO_MODE) return runDemo(() => mockPause(market!), "Market paused");
      return run(
        {
          address: market!,
          abi: MarketAbi,
          functionName: "pause",
        },
        "Market paused",
      );
    },
    ...rest,
  };
}

export function useUnpauseMarket(market: Address | undefined) {
  const { run, runDemo, ...rest } = useWriteTx("unpause");
  return {
    unpause: () => {
      if (DEMO_MODE) return runDemo(() => mockUnpause(market!), "Market unpaused");
      return run(
        {
          address: market!,
          abi: MarketAbi,
          functionName: "unpause",
        },
        "Market unpaused",
      );
    },
    ...rest,
  };
}

// ---------- Resolution ----------

export function useSubmitOutcome() {
  const { run, runDemo, ...rest } = useWriteTx("submit outcome");
  return {
    submitOutcome: (market: Address, outcome: 0 | 1) => {
      if (DEMO_MODE) return runDemo(() => mockSubmitOutcome(market, outcome), "Outcome submitted");
      return run(
        {
          address: addresses.resolution,
          abi: ResolutionAbi,
          functionName: "submitOutcome",
          args: [market, outcome],
        },
        "Outcome submitted",
      );
    },
    ...rest,
  };
}

export function useFinalize() {
  const { run, runDemo, ...rest } = useWriteTx("finalize");
  return {
    finalize: (market: Address) => {
      if (DEMO_MODE) return runDemo(() => mockFinalize(market), "Market finalized");
      return run(
        {
          address: addresses.resolution,
          abi: ResolutionAbi,
          functionName: "finalize",
          args: [market],
        },
        "Market finalized",
      );
    },
    ...rest,
  };
}

// ---------- Dispenser ----------

export function useWithdrawDispenser() {
  const { run, runDemo, ...rest } = useWriteTx("withdraw");
  return {
    withdraw: (to: Address) => {
      if (DEMO_MODE) return runDemo(() => mockWithdrawDispenser(to), "Dispenser drained");
      return run(
        {
          address: addresses.dispenser,
          abi: DispenserAbi,
          functionName: "withdraw",
          args: [to],
        },
        "Dispenser drained",
      );
    },
    ...rest,
  };
}
