import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PriceDisplay, SplitBar } from "./PriceDisplay";

const HALF = 5n * 10n ** 17n; // 0.5 in 18-decimal
const SEVENTY = 7n * 10n ** 17n;
const THIRTY = 3n * 10n ** 17n;

describe("PriceDisplay", () => {
  it("renders YES and NO labels", () => {
    render(<PriceDisplay priceYes={HALF} priceNo={HALF} />);
    expect(screen.getByText("YES")).toBeInTheDocument();
    expect(screen.getByText("NO")).toBeInTheDocument();
  });

  it("shows cents in compact variant", () => {
    render(<PriceDisplay priceYes={HALF} priceNo={HALF} variant="compact" />);
    expect(screen.getAllByText("50¢")).toHaveLength(2);
  });

  it("shows percent in detail variant", () => {
    render(<PriceDisplay priceYes={SEVENTY} priceNo={THIRTY} variant="detail" />);
    expect(screen.getByText("70.0%")).toBeInTheDocument();
    expect(screen.getByText("30.0%")).toBeInTheDocument();
  });
});

describe("SplitBar", () => {
  it("has an aria-label describing the split", () => {
    render(<SplitBar priceYes={SEVENTY} priceNo={THIRTY} />);
    const bar = screen.getByRole("img");
    expect(bar.getAttribute("aria-label")).toMatch(/YES 70/);
    expect(bar.getAttribute("aria-label")).toMatch(/NO 30/);
  });

  it("handles zero gracefully (falls back to 50/50)", () => {
    render(<SplitBar priceYes={0n} priceNo={0n} />);
    const bar = screen.getByRole("img");
    expect(bar.getAttribute("aria-label")).toMatch(/YES 50/);
  });
});
