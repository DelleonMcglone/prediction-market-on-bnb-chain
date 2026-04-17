import { describe, it, expect } from "vitest";
import { encodeErrorResult, BaseError, ContractFunctionRevertedError, type Abi } from "viem";
import { decodeError } from "./decodeError";
import { MarketAbi, ResolutionAbi, DispenserAbi } from "@/lib/abis";

function makeRevert(abi: Abi, errorName: string, args: readonly unknown[]) {
  // Cast through `as never`: viem's encodeErrorResult is strictly-typed against
  // the specific ABI, but we want to reuse this helper for several ABIs.
  const data = encodeErrorResult({ abi, errorName, args } as never);
  const reverted = new ContractFunctionRevertedError({
    abi,
    data,
    functionName: "buy",
  });
  return new BaseError("reverted", { cause: reverted });
}

describe("decodeError", () => {
  it("returns a friendly string for SlippageExceeded", () => {
    const err = makeRevert(MarketAbi, "SlippageExceeded", [
      5_500_000n, // cost $5.50
      5_000_000n, // max $5.00
    ]);
    const msg = decodeError(err);
    expect(msg).toMatch(/slippage/i);
    expect(msg).toMatch(/5\.50/);
    expect(msg).toMatch(/5\.00/);
  });

  it("returns a friendly string for AmountZero", () => {
    const err = makeRevert(MarketAbi, "AmountZero", []);
    expect(decodeError(err)).toMatch(/greater than zero/);
  });

  it("returns a friendly string for AlreadyServed (Dispenser)", () => {
    const err = makeRevert(DispenserAbi, "AlreadyServed", []);
    expect(decodeError(err)).toMatch(/already claimed/);
  });

  it("returns a friendly string for AlreadyProposed (Resolution)", () => {
    const err = makeRevert(ResolutionAbi, "AlreadyProposed", []);
    expect(decodeError(err)).toMatch(/already been proposed/);
  });

  it("falls back to the first line of unknown errors", () => {
    const err = new Error("totally unknown\nsecond line should be cut");
    expect(decodeError(err)).toBe("totally unknown");
  });

  it("recognizes user-rejected transactions", () => {
    const err = new Error("User rejected the request");
    expect(decodeError(err)).toBe("Transaction cancelled.");
  });

  it("stringifies non-Errors gracefully", () => {
    expect(decodeError("boom")).toBe("boom");
    expect(decodeError({ blah: 1 })).toBe("[object Object]");
  });
});
