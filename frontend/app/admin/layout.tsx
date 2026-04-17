"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDemoAccount as useAccount } from "@/hooks/useDemoAccount";
import { NetworkGuard } from "@/components/NetworkGuard";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useIsOperator } from "@/hooks/useIsOperator";
import { cn } from "@/lib/cn";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!isOperator) {
    return (
      <div className="max-w-md mx-auto px-6 py-16">
        <Card className="border-no/30 bg-no/5">
          <CardTitle>Not authorized</CardTitle>
          <CardDescription>
            This wallet does not hold <code className="font-mono">OPERATOR_ROLE</code> on the
            factory. On-chain gating rejects admin calls from non-operator wallets; this UI
            mirrors that for clarity.
          </CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <NetworkGuard>
      <div className="max-w-6xl mx-auto px-6 py-6">
        <AdminNav />
        <div className="mt-6">{children}</div>
      </div>
    </NetworkGuard>
  );
}

function AdminNav() {
  const pathname = usePathname();
  const tabs: { href: string; label: string }[] = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/markets", label: "Markets" },
    { href: "/admin/create", label: "Create" },
  ];

  return (
    <nav className="flex items-center gap-1 border-b border-white/10 pb-1">
      {tabs.map((t) => {
        const active = pathname === t.href || (t.href !== "/admin" && pathname.startsWith(t.href));
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "px-3 py-2 text-sm transition-colors border-b-2 -mb-[1px]",
              active
                ? "border-accent text-fg"
                : "border-transparent text-muted hover:text-fg",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
