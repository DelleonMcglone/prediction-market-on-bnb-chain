/**
 * Contract addresses on BNB testnet.
 *
 * Reads from the committed deployment artifact. Until Phase 03 lands real addresses,
 * the fields are zero and read hooks no-op.
 */
import deployment from "../../deployments/bnbTestnet.json" with { type: "json" };
import type { Address } from "viem";

type Deployment = {
  chainId: number;
  /** Block number at which the core contracts were deployed. */
  deployedBlock?: number | string;
  mockUSDC?: Address;
  shares?: Address;
  resolution?: Address;
  marketFactory?: Address;
  dispenser?: Address;
};

const d = deployment as Deployment;

const ZERO = "0x0000000000000000000000000000000000000000" as Address;

export const CHAIN_ID = 97 as const;

export const addresses = {
  mockUSDC: d.mockUSDC ?? ZERO,
  shares: d.shares ?? ZERO,
  resolution: d.resolution ?? ZERO,
  marketFactory: d.marketFactory ?? ZERO,
  dispenser: d.dispenser ?? ZERO,
} as const;

/**
 * Block at which contracts were deployed. Event queries use this as their
 * `fromBlock` to avoid scanning millions of blocks on public RPCs.
 * Defaults to 0n for local Anvil (chain starts clean).
 */
export const deployedBlock: bigint = d.deployedBlock ? BigInt(d.deployedBlock) : 0n;

/** True once Phase 03 has committed real testnet addresses. */
export const isDeployed: boolean =
  addresses.marketFactory !== ZERO && addresses.mockUSDC !== ZERO;
