"use client";

import { useCallback, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { erc20Abi, type Address } from "viem";
import { MarketAbi, ResolutionAbi, DispenserAbi } from "@/lib/abis";
import { addresses } from "@/lib/contracts";
import { txUrl } from "@/lib/explorer";
import { useToast } from "@/components/ui/Toast";
import { decodeError } from "@/lib/decodeError";
import { DEMO_MODE, DEMO_WALLET_ADDRESS } from "@/lib/demoMode";
import {
  mockApprove,
  mockBuy,
  mockSell,
  mockClaim,
  mockDrip,
  MOCK_ADDRESSES,
} from "@/lib/mockChain";

type TxKind = "approve" | "buy" | "sell" | "claim" | "drip";

type Options = {
  successTitle?: string;
  onSubmitted?: (hash: `0x${string}`) => void;
  onConfirmed?: (hash: `0x${string}`) => void;
};

/**
 * Low-level hook used by buy / sell / claim / drip. Wraps wagmi's
 * writeContract + waitForTransactionReceipt with toast + cache invalidation.
 * In demo mode, callers invoke the appropriate mock function directly; this
 * hook exposes the same shape so component code stays identical.
 */
function useWriteTx(kind: TxKind) {
  const { writeContractAsync, data: hash, isPending: wagmiPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: waitError } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !DEMO_MODE && !!hash },
  });
  const toast = useToast();
  const qc = useQueryClient();
  const [demoPending, setDemoPending] = useState(false);

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

  /** Demo-mode equivalent of `run`. Takes a thunk that resolves to a hash. */
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

  if (!DEMO_MODE && isSuccess && hash) {
    qc.invalidateQueries();
  }

  return {
    run,
    runDemo,
    hash,
    isPending: DEMO_MODE ? demoPending : wagmiPending,
    isConfirming: DEMO_MODE ? false : isConfirming,
    isSuccess,
    waitError,
    reset,
  };
}

// ---------- Public hooks ----------

export function useApprove(market: Address | undefined) {
  const { run, runDemo, ...rest } = useWriteTx("approve");
  return {
    approve: () => {
      if (DEMO_MODE) {
        return runDemo(
          () => mockApprove(DEMO_WALLET_ADDRESS, market!, 2n ** 256n - 1n),
          "Approval confirmed",
        );
      }
      return run(
        {
          address: addresses.mockUSDC,
          abi: erc20Abi,
          functionName: "approve",
          args: [market!, 2n ** 256n - 1n],
        },
        { successTitle: "Approval confirmed" },
      );
    },
    ...rest,
  };
}

export function useBuy(market: Address | undefined) {
  const { run, runDemo, ...rest } = useWriteTx("buy");
  return {
    buy: (outcome: 0 | 1, shareAmount: bigint, maxCost: bigint, successTitle?: string) => {
      if (DEMO_MODE) {
        return runDemo(
          () => mockBuy(market!, DEMO_WALLET_ADDRESS, outcome, shareAmount, maxCost),
          successTitle,
        );
      }
      return run(
        {
          address: market!,
          abi: MarketAbi,
          functionName: "buy",
          args: [outcome, shareAmount, maxCost],
        },
        { successTitle },
      );
    },
    ...rest,
  };
}

export function useSell(market: Address | undefined) {
  const { run, runDemo, ...rest } = useWriteTx("sell");
  return {
    sell: (outcome: 0 | 1, shareAmount: bigint, minPayout: bigint, successTitle?: string) => {
      if (DEMO_MODE) {
        return runDemo(
          () => mockSell(market!, DEMO_WALLET_ADDRESS, outcome, shareAmount, minPayout),
          successTitle,
        );
      }
      return run(
        {
          address: market!,
          abi: MarketAbi,
          functionName: "sell",
          args: [outcome, shareAmount, minPayout],
        },
        { successTitle },
      );
    },
    ...rest,
  };
}

export function useClaim() {
  const { run, runDemo, ...rest } = useWriteTx("claim");
  return {
    claim: (market: Address) => {
      if (DEMO_MODE) {
        return runDemo(async () => {
          const result = await mockClaim(market, DEMO_WALLET_ADDRESS);
          return result.hash;
        }, "Claim confirmed");
      }
      return run(
        {
          address: addresses.resolution,
          abi: ResolutionAbi,
          functionName: "claim",
          args: [market],
        },
        { successTitle: "Claim confirmed" },
      );
    },
    ...rest,
  };
}

export function useDrip() {
  const { run, runDemo, ...rest } = useWriteTx("drip");
  return {
    drip: () => {
      if (DEMO_MODE) {
        return runDemo(() => mockDrip(DEMO_WALLET_ADDRESS), "Test funds received");
      }
      return run(
        {
          address: addresses.dispenser,
          abi: DispenserAbi,
          functionName: "drip",
        },
        { successTitle: "Test funds received" },
      );
    },
    ...rest,
  };
}

// Expose mock addresses for components that need to reference them visually.
export { MOCK_ADDRESSES };
