import { BaseError, ContractFunctionRevertedError, decodeErrorResult } from "viem";
import { MarketAbi, ResolutionAbi, DispenserAbi, SharesAbi, MarketFactoryAbi } from "@/lib/abis";

/**
 * Map every known custom-error selector in the contract set to a human-readable
 * message. Viem can usually decode these automatically from the ABI, but we
 * wrap that with our own error-name → copy mapping so users see actionable text
 * instead of the raw error name.
 */
const ERROR_COPY: Record<string, (args: readonly unknown[]) => string> = {
  // Market
  InvalidOutcome: () => "Invalid outcome selected.",
  AmountZero: () => "Amount must be greater than zero.",
  NotActive: () => "Market isn't accepting trades right now.",
  AlreadyResolved: () => "Market is already resolved.",
  NotOperator: () => "Only the market operator can do that.",
  NotResolution: () => "Only the resolution contract can do that.",
  SlippageExceeded: (args) => {
    const [cost, maxCost] = args as [bigint, bigint];
    return `Price moved beyond your slippage limit — cost ${usdcShort(cost)}, max ${usdcShort(
      maxCost,
    )}. Try again with a higher slippage setting.`;
  },
  PayoutTooLow: (args) => {
    const [payout, minPayout] = args as [bigint, bigint];
    return `Payout ${usdcShort(payout)} is below your minimum of ${usdcShort(minPayout)}.`;
  },
  SubsidyExhausted: () => "Market capacity reached — trade is too large for the current subsidy.",
  InsufficientShares: () => "You don't hold enough shares for that trade.",

  // Resolution
  AlreadyProposed: () => "An outcome has already been proposed for this market.",
  NotProposed: () => "Market resolution hasn't been submitted yet.",
  DisputeWindowActive: (args) => {
    const [endsAt] = args as [bigint];
    const seconds = Number(endsAt) - Math.floor(Date.now() / 1000);
    return `Dispute window is still active (${Math.max(0, seconds)}s remaining).`;
  },
  AlreadyFinalized: () => "Market is already finalized.",

  // Dispenser
  AlreadyServed: () => "This wallet has already claimed test funds. Try a different address.",
  InsufficientReserves: () => "Dispenser is out of testnet BNB. Please let the operator know.",
  TransferFailed: () => "Transfer failed — try again.",

  // Shares
  // (InvalidOutcome shared with Market)
};

const ABIS = [MarketAbi, ResolutionAbi, DispenserAbi, SharesAbi, MarketFactoryAbi] as const;

/**
 * Decode any error thrown by a contract call into a friendly string. Falls back
 * to the original message when the error doesn't match a known custom selector.
 */
export function decodeError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);

  // Walk viem's error chain to find the innermost ContractFunctionRevertedError.
  if (err instanceof BaseError) {
    const revertError = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revertError instanceof ContractFunctionRevertedError) {
      const errorName = revertError.data?.errorName;
      if (errorName && ERROR_COPY[errorName]) {
        const args = revertError.data?.args ?? [];
        return ERROR_COPY[errorName](args);
      }
      if (revertError.reason) return revertError.reason;
    }
  }

  // Try manual decode against each ABI for raw-data errors.
  const maybeData = extractDataHex(err);
  if (maybeData) {
    for (const abi of ABIS) {
      try {
        const decoded = decodeErrorResult({ abi, data: maybeData });
        const fn = ERROR_COPY[decoded.errorName];
        if (fn) return fn(decoded.args ?? []);
        return decoded.errorName;
      } catch {
        // try next ABI
      }
    }
  }

  // Last resort: shorten user-rejected-request variants.
  const msg = err.message ?? "Transaction failed";
  if (/user rejected|user denied/i.test(msg)) return "Transaction cancelled.";
  return msg.split("\n")[0];
}

function extractDataHex(err: unknown): `0x${string}` | undefined {
  if (err && typeof err === "object") {
    const maybe = (err as Record<string, unknown>).data;
    if (typeof maybe === "string" && maybe.startsWith("0x")) return maybe as `0x${string}`;
    const cause = (err as Record<string, unknown>).cause;
    if (cause) return extractDataHex(cause);
  }
  return undefined;
}

function usdcShort(amount: bigint): string {
  const whole = amount / 10n ** 6n;
  const frac = (amount % 10n ** 6n) / 10n ** 4n; // 2 decimals
  return `$${whole}.${frac.toString().padStart(2, "0")}`;
}
