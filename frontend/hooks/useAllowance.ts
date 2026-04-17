"use client";

import { useReadContract } from "wagmi";
import { erc20Abi, type Address } from "viem";

/**
 * Reads the ERC-20 allowance for `spender` on `token` from `owner`.
 * Returns 0n while params are missing.
 */
export function useAllowance(
  token: Address | undefined,
  owner: Address | undefined,
  spender: Address | undefined,
) {
  return useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "allowance",
    args: owner && spender ? [owner, spender] : undefined,
    query: {
      enabled: !!token && !!owner && !!spender,
      staleTime: 5_000,
    },
  });
}
