import { describe, it, expect } from "vitest";
import { formatUsdc, formatPriceCents, formatPricePercent, formatShares } from "./format";

describe("formatUsdc (6-decimal USDC)", () => {
  it("formats zero", () => {
    expect(formatUsdc(0n)).toBe("$0.00");
  });

  it("formats whole dollars", () => {
    expect(formatUsdc(1_000_000n)).toBe("$1.00");
    expect(formatUsdc(100_000_000n)).toBe("$100.00");
  });

  it("formats fractional", () => {
    expect(formatUsdc(1_500_000n)).toBe("$1.50");
    expect(formatUsdc(2_505_000n, 3)).toBe("$2.505");
  });
});

describe("formatPriceCents (18-decimal price)", () => {
  it("zero price → 0¢", () => {
    expect(formatPriceCents(0n)).toBe("0¢");
  });

  it("half → 50¢", () => {
    expect(formatPriceCents(5n * 10n ** 17n)).toBe("50¢");
  });

  it("one → 100¢", () => {
    expect(formatPriceCents(10n ** 18n)).toBe("100¢");
  });

  it("52.3% → 52¢ (truncates per cent precision)", () => {
    expect(formatPriceCents(523_000_000_000_000_000n)).toBe("52¢");
  });
});

describe("formatPricePercent", () => {
  it("half → 50.0%", () => {
    expect(formatPricePercent(5n * 10n ** 17n)).toBe("50.0%");
  });

  it("exotic value → precise %", () => {
    expect(formatPricePercent(731_058_578_630_004_896n)).toBe("73.1%");
  });
});

describe("formatShares (18-decimal)", () => {
  it("whole shares", () => {
    expect(formatShares(42n * 10n ** 18n)).toBe("42.00");
  });

  it("fractional shares", () => {
    expect(formatShares(4_230_000_000_000_000_000n)).toBe("4.23");
  });
});
