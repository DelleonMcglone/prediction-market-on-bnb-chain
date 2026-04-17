"use client";

import { useReadContract } from "wagmi";
import { erc20Abi, type Address } from "viem";
import { DEMO_MODE } from "@/lib/demoMode";
import { mockAllowance } from "@/lib/mockChain";
import { useMockChainVersion } from "./useMockChain";

/**
 * Reads the ERC-20 allowance for `spender` on `token` from `owner`.
 * In demo mode, reads from the mock chain's allowance map.
 */
export function useAllowance(
  token: Address | undefined,
  owner: Address | undefined,
  spender: Address | undefined,
) {
  const version = useMockChainVersion();

  const wagmiQuery = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "allowance",
    args: owner && spender ? [owner, spender] : undefined,
    query: {
      enabled: !DEMO_MODE && !!token && !!owner && !!spender,
      staleTime: 5_000,
    },
  });

  if (DEMO_MODE) {
    void version;
    return {
      data: owner && spender ? mockAllowance(owner, spender) : 0n,
      isLoading: false,
      error: null,
    };
  }

  return wagmiQuery;
}
