"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { parseUnits } from "viem";
import { useDemoAccount as useAccount } from "@/hooks/useDemoAccount";
import { useUsdcBalance } from "@/hooks/useUsdcBalance";
import { useAllowance } from "@/hooks/useAllowance";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useMintUsdc, useApproveForFactory, useCreateMarket } from "@/hooks/useAdmin";
import { addresses } from "@/lib/contracts";
import { formatUsdc } from "@/lib/format";

/** Validation rules pulled out so the tests can import them. */
export type CreateMarketInput = {
  question: string;
  subsidy: string; // USDC as a string
  feeBps: string;
  disputeMinutes: string;
};

export type CreateMarketErrors = Partial<Record<keyof CreateMarketInput, string>>;

export function validateCreateMarket(input: CreateMarketInput): CreateMarketErrors {
  const errors: CreateMarketErrors = {};
  const q = input.question.trim();
  if (q.length < 3) errors.question = "Question is too short.";
  else if (q.length > 200) errors.question = "Question is too long (max 200 chars).";

  const subsidy = Number(input.subsidy);
  if (!Number.isFinite(subsidy) || subsidy < 50) errors.subsidy = "Subsidy must be ≥ 50 USDC.";
  else if (subsidy > 500) errors.subsidy = "Subsidy cap is 500 USDC for the demo.";

  const fee = Number(input.feeBps);
  if (!Number.isFinite(fee) || fee < 0 || fee > 500)
    errors.feeBps = "Fee must be between 0 and 500 bps.";

  const window_ = Number(input.disputeMinutes);
  if (!Number.isFinite(window_) || window_ < 1 || window_ > 1_440)
    errors.disputeMinutes = "Window must be between 1 minute and 24 hours.";

  return errors;
}

const B = 100n * 10n ** 18n; // Fixed per spec § 6.

export function CreateMarketForm() {
  const router = useRouter();
  const { address } = useAccount();

  const [input, setInput] = useState<CreateMarketInput>({
    question: "",
    subsidy: "500",
    feeBps: "100",
    disputeMinutes: "2",
  });
  const errors = useMemo(() => validateCreateMarket(input), [input]);
  const isValid = Object.keys(errors).length === 0;

  const subsidyUnits = useMemo(() => {
    try {
      return parseUnits(input.subsidy || "0", 6);
    } catch {
      return 0n;
    }
  }, [input.subsidy]);

  const { data: usdcBalance } = useUsdcBalance(address);
  const { data: factoryAllowance } = useAllowance(addresses.mockUSDC, address, addresses.marketFactory);

  const needsMint = (usdcBalance ?? 0n) < subsidyUnits;
  const needsApproval = !needsMint && (factoryAllowance ?? 0n) < subsidyUnits;

  const { mint, isPending: minting, isConfirming: mintConfirming } = useMintUsdc();
  const { approve, isPending: approving, isConfirming: approveConfirming } = useApproveForFactory();
  const { createMarket, isPending: creating, isConfirming: createConfirming } = useCreateMarket();

  const busy =
    minting ||
    mintConfirming ||
    approving ||
    approveConfirming ||
    creating ||
    createConfirming;

  const onCreate = async () => {
    if (!isValid) return;
    try {
      await createMarket(
        input.question.trim(),
        B,
        subsidyUnits,
        BigInt(input.feeBps),
        BigInt(Number(input.disputeMinutes) * 60),
      );
      router.push("/admin/markets");
    } catch {
      // toast handled
    }
  };

  let cta: { label: string; onClick?: () => void };
  if (!address) cta = { label: "Connect a wallet" };
  else if (!isValid) cta = { label: "Fix errors above" };
  else if (needsMint)
    cta = {
      label: `Mint ${formatUsdc(subsidyUnits)} USDC`,
      onClick: () => address && mint(address, subsidyUnits).catch(() => {}),
    };
  else if (needsApproval)
    cta = {
      label: `Approve ${formatUsdc(subsidyUnits)} USDC`,
      onClick: () => approve(subsidyUnits).catch(() => {}),
    };
  else cta = { label: `Create market with ${formatUsdc(subsidyUnits)} subsidy`, onClick: onCreate };

  return (
    <Card className="max-w-2xl">
      <CardTitle>Create a new market</CardTitle>
      <div className="mt-4 space-y-4">
        <Field
          label="Question"
          description="3–200 characters. Evergreen phrasing recommended."
          error={errors.question}
        >
          <Input
            value={input.question}
            onChange={(e) => setInput((v) => ({ ...v, question: e.target.value }))}
            placeholder="Will the demo market #4 be resolved YES?"
          />
        </Field>

        <Field
          label="Subsidy (USDC)"
          description="Operator deposit. Demo cap: 50–500 USDC."
          error={errors.subsidy}
        >
          <Input
            type="number"
            min="50"
            max="500"
            step="50"
            value={input.subsidy}
            onChange={(e) => setInput((v) => ({ ...v, subsidy: e.target.value }))}
          />
        </Field>

        <Field
          label="Trading fee (bps)"
          description="100 bps = 1%. Range 0–500."
          error={errors.feeBps}
        >
          <Input
            type="number"
            min="0"
            max="500"
            step="25"
            value={input.feeBps}
            onChange={(e) => setInput((v) => ({ ...v, feeBps: e.target.value }))}
          />
        </Field>

        <Field
          label="Dispute window (minutes)"
          description="Time between outcome submission and finalize. Demo default: 2 min."
          error={errors.disputeMinutes}
        >
          <Input
            type="number"
            min="1"
            max="1440"
            step="1"
            value={input.disputeMinutes}
            onChange={(e) => setInput((v) => ({ ...v, disputeMinutes: e.target.value }))}
          />
        </Field>

        <div className="p-3 rounded-md bg-white/5 border border-white/10 text-xs text-muted">
          <p>
            Liquidity parameter <span className="font-mono text-fg">b</span> is fixed at{" "}
            <span className="font-mono text-fg">100 × 10¹⁸</span> per spec § 6. Change it in
            contracts and re-deploy if you need something different.
          </p>
        </div>

        <Button
          onClick={cta.onClick}
          isLoading={busy}
          disabled={!cta.onClick || busy}
          size="lg"
          className="w-full"
        >
          {cta.label}
        </Button>

        <div className="text-xs text-muted flex justify-between">
          <span>USDC balance: {formatUsdc(usdcBalance ?? 0n)}</span>
          <span>Factory allowance: {formatUsdc(factoryAllowance ?? 0n)}</span>
        </div>
      </div>
    </Card>
  );
}

function Field({
  label,
  description,
  error,
  children,
}: {
  label: string;
  description?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm text-fg">{label}</span>
      {description ? <span className="block text-xs text-muted mt-0.5">{description}</span> : null}
      <div className="mt-1.5">{children}</div>
      {error ? <p className="text-xs text-no mt-1">{error}</p> : null}
    </label>
  );
}
