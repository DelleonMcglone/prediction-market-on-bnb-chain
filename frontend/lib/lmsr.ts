/**
 * LMSR price recomputation in JS, for deriving price-at-time from trade events.
 * Mirrors contracts/src/LMSRPricing.sol but in float math — precision matters
 * less here than on-chain, and quantities are bounded by the subsidy budget.
 */

/**
 * Price of `outcome` (0 = NO, 1 = YES) in an LMSR market with shares
 * `qNo` and `qYes` outstanding and liquidity parameter `b`.
 * All inputs are bigint 18-decimal fixed-point. Returns a float in [0, 1].
 */
export function lmsrPrice(qNo: bigint, qYes: bigint, b: bigint, outcome: 0 | 1): number {
  const u0 = bigintToNum(qNo, b);
  const u1 = bigintToNum(qYes, b);
  const e0 = Math.exp(u0);
  const e1 = Math.exp(u1);
  const p = outcome === 1 ? e1 / (e0 + e1) : e0 / (e0 + e1);
  return p;
}

/** Converts an 18-decimal bigint `q` into a JS number representing q / b (unitless). */
function bigintToNum(q: bigint, b: bigint): number {
  // Downshift to avoid Number-precision loss for large q.
  // q and b are both 18-decimal, so q/b is roughly O(1) in the demo range.
  // We do the division in fixed-point with 6 decimals of precision.
  const scale = 10n ** 6n;
  const scaled = (q * scale) / b;
  return Number(scaled) / Number(scale);
}
