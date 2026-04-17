import { describe, it, expect } from "vitest";
import { lmsrPrice } from "./lmsr";

const B = 100n * 10n ** 18n;
const ONE_UNIT = 10n ** 18n;

describe("lmsrPrice", () => {
  it("neutral quantities → 0.5 for both outcomes", () => {
    expect(lmsrPrice(0n, 0n, B, 0)).toBeCloseTo(0.5, 6);
    expect(lmsrPrice(0n, 0n, B, 1)).toBeCloseTo(0.5, 6);
  });

  it("prices sum to 1", () => {
    const p0 = lmsrPrice(30n * ONE_UNIT, 50n * ONE_UNIT, B, 0);
    const p1 = lmsrPrice(30n * ONE_UNIT, 50n * ONE_UNIT, B, 1);
    expect(p0 + p1).toBeCloseTo(1, 6);
  });

  it("buying YES (qYes > qNo) raises YES price", () => {
    const p = lmsrPrice(0n, 20n * ONE_UNIT, B, 1);
    expect(p).toBeGreaterThan(0.5);
  });

  it("q1 = b gives YES price ~ e / (1 + e) ≈ 0.731", () => {
    // Matches the contract's analytic fixture.
    const p = lmsrPrice(0n, B, B, 1);
    expect(p).toBeCloseTo(0.7310585786, 4);
  });
});
