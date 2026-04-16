import { formatUnits } from "viem";

/**
 * Display helpers used across the UI. Rules (per architecture doc § Deviations):
 *   - Cents on list views  (e.g. "52¢")
 *   - Percent on detail    (e.g. "52.3%")
 *   - USDC amounts trim to a sensible precision
 */

const USDC_DECIMALS = 6;
const PRICE_DECIMALS = 18;

/** 0 → "$0.00", 1_500_000 → "$1.50" (6-decimal USDC). */
export function formatUsdc(amount: bigint, fractionDigits = 2): string {
  const asFloat = Number(formatUnits(amount, USDC_DECIMALS));
  return `$${asFloat.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

/** Price (18-decimal signed fixed-point) → "52¢". */
export function formatPriceCents(price18: bigint): string {
  const scaled = (price18 * 100n) / 10n ** BigInt(PRICE_DECIMALS);
  return `${scaled.toString()}¢`;
}

/** Price (18-decimal) → "52.3%". */
export function formatPricePercent(price18: bigint, fractionDigits = 1): string {
  const asFloat = Number(formatUnits(price18, PRICE_DECIMALS)) * 100;
  return `${asFloat.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}%`;
}

/** Share amount (18-decimal) → "42.30" with 2 decimals. */
export function formatShares(shares18: bigint, fractionDigits = 2): string {
  const asFloat = Number(formatUnits(shares18, PRICE_DECIMALS));
  return asFloat.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}
