/**
 * Mock chain unit tests. Mirrors the contract-level invariants we want the
 * demo to respect:
 *  - Seeded markets render non-neutral prices
 *  - Buy then sell round-trips approximately
 *  - Claim pays out on winning side only
 *  - Dispute-window gating is enforced
 */
import { beforeEach, describe, it, expect } from "vitest";
import {
  resetMockChain,
  mockMarkets,
  mockMarketData,
  mockApprove,
  mockBuy,
  mockSell,
  mockDrip,
  mockSubmitOutcome,
  mockFinalize,
  mockClaim,
  mockServed,
  mockUsdcBalance,
  mockSharesOf,
} from "./mockChain";
import { DEMO_WALLET_ADDRESS } from "./demoMode";
import type { Address } from "viem";

const ALICE = DEMO_WALLET_ADDRESS as Address;

beforeEach(() => {
  // Reset between tests so localStorage persistence doesn't leak state.
  if (typeof window !== "undefined") window.localStorage?.clear?.();
  resetMockChain();
});

describe("mockChain — reads", () => {
  it("bootstraps 3 seeded markets with non-neutral leanings", () => {
    const list = mockMarkets();
    expect(list).toHaveLength(3);
    const m1 = mockMarketData(list[0])!;
    const m2 = mockMarketData(list[1])!;
    expect(m1.priceYes).toBeGreaterThan(500_000_000_000_000_000n); // > 0.50
    expect(m2.priceYes).toBeLessThan(500_000_000_000_000_000n);    // < 0.50
  });

  it("demo visitor starts with $1,000 USDC", () => {
    expect(mockUsdcBalance(ALICE)).toBe(1_000n * 1_000_000n);
  });
});

describe("mockChain — buy / sell", () => {
  it("buying YES raises priceYes", async () => {
    const market = mockMarkets()[2]; // the balanced one
    const before = mockMarketData(market)!.priceYes;
    await mockApprove(ALICE, market, 2n ** 100n);
    await mockBuy(market, ALICE, 1, 10n * 10n ** 18n, 10n * 10n ** 6n);
    const after = mockMarketData(market)!.priceYes;
    expect(after).toBeGreaterThan(before);
  });

  it("buy + sell roundtrip nets approximately to 2x fee", async () => {
    const market = mockMarkets()[2];
    const balBefore = mockUsdcBalance(ALICE);
    await mockApprove(ALICE, market, 2n ** 100n);
    await mockBuy(market, ALICE, 1, 5n * 10n ** 18n, 10n * 10n ** 6n);
    const { yes } = mockSharesOf(market, ALICE);
    await mockSell(market, ALICE, 1, yes, 0n);
    const balAfter = mockUsdcBalance(ALICE);
    const loss = balBefore - balAfter;
    // Rough bound: loss is less than 5% of the round-trip notional.
    expect(loss).toBeGreaterThan(0n);
    expect(loss).toBeLessThan(500_000n);
  });

  it("sell fails if visitor holds fewer shares than requested", async () => {
    const market = mockMarkets()[2];
    await expect(
      mockSell(market, ALICE, 1, 10n * 10n ** 18n, 0n),
    ).rejects.toThrow(/don't hold enough/);
  });
});

describe("mockChain — lifecycle", () => {
  it("dispute window blocks finalize, then finalize + claim pays the winner", async () => {
    const market = mockMarkets()[2];
    await mockApprove(ALICE, market, 2n ** 100n);
    await mockBuy(market, ALICE, 1, 20n * 10n ** 18n, 20n * 10n ** 6n);

    await mockSubmitOutcome(market, 1); // YES wins

    // Immediately finalize → dispute window still active
    await expect(mockFinalize(market)).rejects.toThrow(/still active/);

    // Fast-forward clock so the window elapses (DEMO_DISPUTE_WINDOW_SEC = 10s).
    const origDateNow = Date.now;
    Date.now = () => origDateNow() + 15_000;
    try {
      await mockFinalize(market);
      const balBefore = mockUsdcBalance(ALICE);
      const { yes } = mockSharesOf(market, ALICE);
      const { payout } = await mockClaim(market, ALICE);
      expect(payout).toBe(yes / 1_000_000_000_000n);
      expect(mockUsdcBalance(ALICE)).toBe(balBefore + payout);
    } finally {
      Date.now = origDateNow;
    }
  });
});

describe("mockChain — dispenser", () => {
  it("drip succeeds once per address, fails the second time", async () => {
    const fresh = "0xFRE5H0000000000000000000000000000000D135" as Address;
    expect(mockServed(fresh)).toBe(false);
    await mockDrip(fresh);
    expect(mockServed(fresh)).toBe(true);
    expect(mockUsdcBalance(fresh)).toBe(100n * 1_000_000n);
    await expect(mockDrip(fresh)).rejects.toThrow(/already claimed/);
  });
});
