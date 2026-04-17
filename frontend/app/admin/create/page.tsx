"use client";

import { CreateMarketForm } from "@/components/CreateMarketForm";

export default function AdminCreatePage() {
  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Create market</h1>
        <p className="text-sm text-muted mt-1">
          Deploys a new Market contract via the factory and pulls the subsidy from your wallet in
          the same transaction.
        </p>
      </header>
      <CreateMarketForm />
    </>
  );
}
