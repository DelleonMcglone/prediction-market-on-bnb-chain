import { describe, it, expect } from "vitest";
import { applySlippage } from "./usePreview";

describe("applySlippage", () => {
  const total = 100n * 1_000_000n; // $100 in USDC (6-dec)

  it("adds tolerance upward for buys", () => {
    expect(applySlippage(total, 200, "up")).toBe(102n * 1_000_000n); // +2%
    expect(applySlippage(total, 50, "up")).toBe(100_500_000n); // +0.5%
  });

  it("subtracts tolerance downward for sells", () => {
    expect(applySlippage(total, 200, "down")).toBe(98n * 1_000_000n); // -2%
    expect(applySlippage(total, 1_000, "down")).toBe(90n * 1_000_000n); // -10%
  });

  it("preserves zero at 0 bps", () => {
    expect(applySlippage(total, 0, "up")).toBe(total);
    expect(applySlippage(total, 0, "down")).toBe(total);
  });

  it("handles tiny amounts without underflow", () => {
    expect(applySlippage(1n, 200, "up")).toBe(1n); // 1 * 200 / 10000 = 0; +0
    expect(applySlippage(1n, 200, "down")).toBe(1n);
  });
});
