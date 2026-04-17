"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { erc20Abi, parseUnits, type Address } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { formatUsdc, formatShares, formatPricePercent } from "@/lib/format";
import { addresses } from "@/lib/contracts";
import type { MarketData } from "@/hooks/useMarketData";
import { useBuyPreview, useSellPreview, applySlippage } from "@/hooks/usePreview";
import { useApprove, useBuy, useSell } from "@/hooks/useTrade";
import { useAllowance } from "@/hooks/useAllowance";
import { useSlippage } from "@/hooks/useSlippage";
import { SharesAbi } from "@/lib/abis";

type Mode = "buy" | "sell";

export function TradeForm({
  market,
  onRequestFunds,
}: {
  market: MarketData;
  onRequestFunds: () => void;
}) {
  const { address, isConnected } = useAccount();
  const [mode, setMode] = useState<Mode>("buy");
  const [outcome, setOutcome] = useState<0 | 1>(1);
  const [rawInput, setRawInput] = useState(""); // share amount as a string
  const [debouncedShares, setDebouncedShares] = useState<bigint>(0n);
  const { bps, setBps } = useSlippage();
  const [showSettings, setShowSettings] = useState(false);

  // Debounce amount changes.
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedShares(parseShares(rawInput));
    }, 250);
    return () => clearTimeout(handle);
  }, [rawInput]);

  // ----- Reads -----

  const { data: usdcBalance } = useReadContract({
    address: addresses.mockUSDC,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  const { data: shareBalance } = useReadContract({
    address: addresses.shares,
    abi: SharesAbi,
    functionName: "balanceOf",
    args: address ? [address, encodeId(market.address, outcome)] : undefined,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  const { data: allowance } = useAllowance(addresses.mockUSDC, address, market.address);

  const buyPreview = useBuyPreview(
    mode === "buy" ? market.address : undefined,
    outcome,
    debouncedShares,
  );
  const sellPreview = useSellPreview(
    mode === "sell" ? market.address : undefined,
    outcome,
    debouncedShares,
  );

  // ----- Writes -----
  const { approve, isPending: approving } = useApprove(market.address);
  const { buy, isPending: buying, isConfirming: buyConfirming } = useBuy(market.address);
  const { sell, isPending: selling, isConfirming: sellConfirming } = useSell(market.address);

  // ----- Derived state -----

  const preview = mode === "buy" ? buyPreview.preview : sellPreview.preview;
  const needsApproval =
    mode === "buy" && !!preview && (allowance ?? 0n) < preview.total;
  const hasZeroUsdc = !!address && (usdcBalance ?? 0n) === 0n;
  const priceImpact = useMemo(() => {
    if (!preview) return null;
    const current = outcome === 1 ? market.priceYes : market.priceNo;
    const after = preview.priceAfter;
    const delta = after > current ? after - current : current - after;
    return Number(delta) / 1e18;
  }, [preview, outcome, market.priceYes, market.priceNo]);

  // ----- Handlers -----

  const onExecute = useCallback(async () => {
    if (!preview) return;
    try {
      if (mode === "buy") {
        const maxCost = applySlippage(preview.total, bps, "up");
        await buy(
          outcome,
          debouncedShares,
          maxCost,
          `Bought ${formatShares(debouncedShares)} ${outcome === 1 ? "YES" : "NO"} for ${formatUsdc(preview.total)}`,
        );
      } else {
        const minPayout = applySlippage(preview.total, bps, "down");
        await sell(
          outcome,
          debouncedShares,
          minPayout,
          `Sold ${formatShares(debouncedShares)} ${outcome === 1 ? "YES" : "NO"} for ${formatUsdc(preview.total)}`,
        );
      }
      setRawInput("");
    } catch {
      // toast already raised
    }
  }, [mode, preview, bps, outcome, debouncedShares, buy, sell]);

  // ----- Disabled states + CTA -----

  const marketBlocked = market.paused || market.resolved;
  const parsedShares = parseShares(rawInput);
  const inputInvalid = parsedShares === 0n && rawInput !== "";
  const insufficientShares =
    mode === "sell" && !!parsedShares && (shareBalance ?? 0n) < parsedShares;
  const txBusy = approving || buying || selling || buyConfirming || sellConfirming;

  let cta: { label: string; onClick?: () => void; variant?: "primary" | "yes" | "no" | "secondary"; disabled?: boolean; loading?: boolean };
  if (!isConnected) cta = { label: "Connect a wallet", disabled: true };
  else if (marketBlocked) cta = { label: market.resolved ? "Market resolved" : "Market paused", disabled: true };
  else if (hasZeroUsdc && mode === "buy") cta = { label: "Get test funds", onClick: onRequestFunds, variant: "secondary" };
  else if (parsedShares === 0n) cta = { label: "Enter an amount", disabled: true };
  else if (inputInvalid) cta = { label: "Invalid amount", disabled: true };
  else if (insufficientShares) cta = { label: "Insufficient shares", disabled: true };
  else if (!preview) cta = { label: "Calculating…", disabled: true, loading: true };
  else if (needsApproval) cta = { label: "Approve USDC", onClick: approve, variant: "secondary", loading: approving };
  else if (txBusy)
    cta = { label: "Submitting…", disabled: true, loading: true };
  else {
    cta = {
      label:
        mode === "buy"
          ? `Buy ${outcome === 1 ? "YES" : "NO"} for ${formatUsdc(preview.total)}`
          : `Sell ${outcome === 1 ? "YES" : "NO"} for ${formatUsdc(preview.total)}`,
      onClick: onExecute,
      variant: outcome === 1 ? "yes" : "no",
    };
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <CardTitle>Trade</CardTitle>
        <button
          type="button"
          onClick={() => setShowSettings((v) => !v)}
          className="text-xs text-muted hover:text-fg transition-colors"
          aria-label="Slippage settings"
        >
          {bps / 100}% slip ⚙
        </button>
      </div>

      {showSettings ? (
        <div className="mb-4 p-3 rounded-md bg-white/5 border border-white/10">
          <label className="block text-xs text-muted mb-1">Slippage tolerance (%)</label>
          <Input
            type="number"
            step="0.1"
            min="0.1"
            max="20"
            value={(bps / 100).toString()}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) setBps(Math.round(n * 100));
            }}
          />
        </div>
      ) : null}

      {/* Mode tabs */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-md bg-white/5 mb-4">
        <TabButton active={mode === "buy"} onClick={() => setMode("buy")}>
          Buy
        </TabButton>
        <TabButton active={mode === "sell"} onClick={() => setMode("sell")}>
          Sell
        </TabButton>
      </div>

      {/* Outcome picker */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <OutcomeButton
          label="YES"
          price={market.priceYes}
          selected={outcome === 1}
          variant="yes"
          onClick={() => setOutcome(1)}
        />
        <OutcomeButton
          label="NO"
          price={market.priceNo}
          selected={outcome === 0}
          variant="no"
          onClick={() => setOutcome(0)}
        />
      </div>

      {/* Amount */}
      <label className="block text-xs text-muted mb-1">
        Shares{mode === "sell" && shareBalance !== undefined ? (
          <>
            {" "}
            <button
              type="button"
              onClick={() => setRawInput(formatShares(shareBalance, 4))}
              className="text-accent hover:underline ml-1"
            >
              max {formatShares(shareBalance)}
            </button>
          </>
        ) : null}
      </label>
      <Input
        type="number"
        inputMode="decimal"
        step="0.01"
        placeholder="0.00"
        value={rawInput}
        onChange={(e) => setRawInput(e.target.value)}
      />

      {/* Preview */}
      <PreviewPanel
        mode={mode}
        preview={preview}
        priceImpact={priceImpact}
        market={market}
      />

      <Button
        className="w-full mt-4"
        onClick={cta.onClick}
        disabled={cta.disabled}
        isLoading={cta.loading}
        variant={cta.variant ?? "primary"}
        size="lg"
      >
        {cta.label}
      </Button>

      {/* Balances footer */}
      <div className="mt-3 text-xs text-muted flex justify-between">
        <span>USDC balance: {formatUsdc(usdcBalance ?? 0n)}</span>
        <span>{outcome === 1 ? "YES" : "NO"} held: {formatShares(shareBalance ?? 0n)}</span>
      </div>
    </Card>
  );
}

// ------- Sub-components -------

function TabButton({ active, children, ...props }: { active: boolean; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "h-8 rounded-sm text-sm font-medium transition-colors",
        active ? "bg-white/10 text-fg" : "text-muted hover:text-fg",
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function OutcomeButton({
  label,
  price,
  selected,
  variant,
  onClick,
}: {
  label: string;
  price: bigint;
  selected: boolean;
  variant: "yes" | "no";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1 rounded-md border px-3 py-2 text-left transition-colors",
        selected
          ? variant === "yes"
            ? "border-yes bg-yes/10"
            : "border-no bg-no/10"
          : "border-white/10 hover:border-white/20",
      )}
    >
      <span
        className={cn("text-xs font-medium", variant === "yes" ? "text-yes" : "text-no")}
      >
        {label}
      </span>
      <span className="text-lg font-semibold tabular-nums">
        {formatPricePercent(price, 0)}
      </span>
    </button>
  );
}

function PreviewPanel({
  mode,
  preview,
  priceImpact,
  market,
}: {
  mode: Mode;
  preview: { cost: bigint; fee: bigint; total: bigint; priceAfter: bigint } | undefined;
  priceImpact: number | null;
  market: MarketData;
}) {
  if (!preview) {
    return (
      <div className="mt-3 p-3 rounded-md border border-white/5 bg-white/[0.02] text-xs text-muted min-h-[5.5rem] flex items-center justify-center">
        Enter a share amount to see a cost preview.
      </div>
    );
  }

  const impactWarn = priceImpact !== null && priceImpact > 0.05;

  return (
    <div className="mt-3 p-3 rounded-md border border-white/5 bg-white/[0.02] text-xs space-y-1.5">
      <Row
        label={mode === "buy" ? "Cost" : "Gross payout"}
        value={formatUsdc(preview.cost)}
      />
      <Row label="Fee (1%)" value={formatUsdc(preview.fee)} />
      <Row
        label={mode === "buy" ? "Total" : "Net payout"}
        value={<span className="font-semibold text-fg">{formatUsdc(preview.total)}</span>}
      />
      <Row
        label="Price after"
        value={formatPricePercent(preview.priceAfter)}
      />
      {impactWarn ? (
        <p className="pt-1 text-accent">
          ⚠ Price impact ≈ {(priceImpact! * 100).toFixed(1)}%. Consider a smaller trade.
        </p>
      ) : null}
      {/* Suppress unused warning for market; kept for future fee-destination display */}
      <span className="hidden">{market.address}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

// ------- Helpers -------

function parseShares(raw: string): bigint {
  if (!raw) return 0n;
  try {
    return parseUnits(raw, 18);
  } catch {
    return 0n;
  }
}

function encodeId(market: Address, outcome: 0 | 1): bigint {
  return (BigInt(market) << 1n) | BigInt(outcome);
}
