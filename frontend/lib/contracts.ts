/**
 * Contract addresses on BNB testnet.
 *
 * Reads from the committed deployment artifact. Until Phase 03 lands real addresses,
 * the fields are zero and read hooks no-op.
 */
// Frontend-local copy of the testnet deployment artifact so Vercel builds with
// rootDirectory=frontend don't need to pull files from outside the root.
// After a new testnet deploy, copy deployments/bnbTestnet.json → lib/deployment.json.
import deployment from "./deployment.json" with { type: "json" };
import type { Address } from "viem";
import { DEMO_MODE } from "./demoMode";
import { MOCK_ADDRESSES } from "./mockChain";

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

export const addresses = DEMO_MODE
  ? ({
      mockUSDC: MOCK_ADDRESSES.mockUSDC as Address,
      shares: MOCK_ADDRESSES.shares as Address,
      resolution: MOCK_ADDRESSES.resolution as Address,
      marketFactory: MOCK_ADDRESSES.marketFactory as Address,
      dispenser: MOCK_ADDRESSES.dispenser as Address,
    } as const)
  : ({
      mockUSDC: d.mockUSDC ?? ZERO,
      shares: d.shares ?? ZERO,
      resolution: d.resolution ?? ZERO,
      marketFactory: d.marketFactory ?? ZERO,
      dispenser: d.dispenser ?? ZERO,
    } as const);

/**
 * Block at which contracts were deployed. Event queries use this as their
 * `fromBlock` to avoid scanning millions of blocks on public RPCs.
 * Defaults to 0n for local Anvil (chain starts clean).
 */
export const deployedBlock: bigint = d.deployedBlock ? BigInt(d.deployedBlock) : 0n;

/**
 * True once Phase 03 has committed real testnet addresses. Demo mode
 * synthesizes placeholder addresses via MOCK_ADDRESSES, so it's always "deployed".
 */
export const isDeployed: boolean =
  DEMO_MODE ||
  (addresses.marketFactory !== ZERO && addresses.mockUSDC !== ZERO);
