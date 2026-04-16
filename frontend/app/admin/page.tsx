"use client";

import { useAccount } from "wagmi";
import { NetworkGuard } from "@/components/NetworkGuard";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { useIsOperator } from "@/hooks/useIsOperator";

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const { data: isOperator, isLoading } = useIsOperator(address);

  if (!isConnected) {
    return (
      <div className="max-w-md mx-auto px-6 py-16">
        <Card>
          <CardTitle>Operator only</CardTitle>
          <CardDescription>Connect an operator wallet to continue.</CardDescription>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto px-6 py-16 text-sm text-muted">
        Checking operator role…
      </div>
    );
  }

  if (!isOperator) {
    return (
      <div className="max-w-md mx-auto px-6 py-16">
        <Card>
          <CardTitle>Not authorized</CardTitle>
          <CardDescription>
            This wallet does not hold OPERATOR_ROLE on the factory. On-chain gating
            rejects admin calls from non-operator wallets; this UI mirrors that for
            clarity.
          </CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <NetworkGuard>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted mt-1">
          Create markets, pause, and resolve. Phase 07 fills this in.
        </p>
      </div>
    </NetworkGuard>
  );
}
