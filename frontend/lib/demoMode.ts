/**
 * Build-time flag controlled by NEXT_PUBLIC_DEMO_MODE.
 *
 * When on:
 *  - No wallet connection is required; a fake demo address is auto-"connected"
 *  - All reads/writes route through lib/mockChain.ts instead of wagmi
 *  - Dispute windows use DEMO_DISPUTE_WINDOW_SEC for snappy lifecycle demos
 *  - Contract addresses and chain IDs are synthetic placeholders
 *
 * When off, the app works exactly as it did before — wagmi + viem against a
 * real RPC.
 */

export const DEMO_MODE: boolean =
  (process.env.NEXT_PUBLIC_DEMO_MODE ?? "").toLowerCase() === "1" ||
  (process.env.NEXT_PUBLIC_DEMO_MODE ?? "").toLowerCase() === "true";

/** Dispute window shown to demo visitors — long enough to read the UI, short enough to finalize in one sitting. */
export const DEMO_DISPUTE_WINDOW_SEC = 10;

/** The "demo wallet" address displayed in the header. Deterministic. */
export const DEMO_WALLET_ADDRESS = "0xDEM0A6BCde1234567890aAbbCcDdEeFf00112233" as const;

export const DEMO_WALLET_LABEL = "Demo visitor";
