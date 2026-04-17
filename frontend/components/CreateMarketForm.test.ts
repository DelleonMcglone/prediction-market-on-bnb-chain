import { describe, it, expect } from "vitest";
import { validateCreateMarket, type CreateMarketInput } from "./CreateMarketForm";

const base: CreateMarketInput = {
  question: "Will X happen?",
  subsidy: "500",
  feeBps: "100",
  disputeMinutes: "2",
};

describe("validateCreateMarket", () => {
  it("accepts valid input", () => {
    expect(validateCreateMarket(base)).toEqual({});
  });

  it("rejects too-short questions", () => {
    expect(validateCreateMarket({ ...base, question: "ab" })).toHaveProperty("question");
    expect(validateCreateMarket({ ...base, question: "" })).toHaveProperty("question");
  });

  it("rejects too-long questions", () => {
    expect(validateCreateMarket({ ...base, question: "a".repeat(201) })).toHaveProperty("question");
    expect(validateCreateMarket({ ...base, question: "a".repeat(200) })).not.toHaveProperty("question");
  });

  it("enforces subsidy bounds 50–500 USDC", () => {
    expect(validateCreateMarket({ ...base, subsidy: "49" })).toHaveProperty("subsidy");
    expect(validateCreateMarket({ ...base, subsidy: "50" })).not.toHaveProperty("subsidy");
    expect(validateCreateMarket({ ...base, subsidy: "500" })).not.toHaveProperty("subsidy");
    expect(validateCreateMarket({ ...base, subsidy: "501" })).toHaveProperty("subsidy");
    expect(validateCreateMarket({ ...base, subsidy: "abc" })).toHaveProperty("subsidy");
  });

  it("enforces feeBps bounds 0–500", () => {
    expect(validateCreateMarket({ ...base, feeBps: "-1" })).toHaveProperty("feeBps");
    expect(validateCreateMarket({ ...base, feeBps: "0" })).not.toHaveProperty("feeBps");
    expect(validateCreateMarket({ ...base, feeBps: "500" })).not.toHaveProperty("feeBps");
    expect(validateCreateMarket({ ...base, feeBps: "501" })).toHaveProperty("feeBps");
  });

  it("enforces dispute window 1–1440 minutes", () => {
    expect(validateCreateMarket({ ...base, disputeMinutes: "0" })).toHaveProperty("disputeMinutes");
    expect(validateCreateMarket({ ...base, disputeMinutes: "1" })).not.toHaveProperty("disputeMinutes");
    expect(validateCreateMarket({ ...base, disputeMinutes: "1440" })).not.toHaveProperty("disputeMinutes");
    expect(validateCreateMarket({ ...base, disputeMinutes: "1441" })).toHaveProperty("disputeMinutes");
  });

  it("collects all errors at once", () => {
    const errors = validateCreateMarket({
      question: "",
      subsidy: "10",
      feeBps: "9999",
      disputeMinutes: "0",
    });
    expect(errors).toHaveProperty("question");
    expect(errors).toHaveProperty("subsidy");
    expect(errors).toHaveProperty("feeBps");
    expect(errors).toHaveProperty("disputeMinutes");
  });
});
