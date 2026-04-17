"use client";

import Link from "next/link";
import { useDemoAccount as useAccount } from "@/hooks/useDemoAccount";
import { useIsOperator } from "@/hooks/useIsOperator";
import { ConnectButton } from "@/components/ConnectButton";
import { cn } from "@/lib/cn";

export function Header() {
  const { address, isConnected } = useAccount();
  const { data: isOperator } = useIsOperator(address);

  return (
    <header className="border-b border-white/10">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-mono text-sm font-semibold">
          Igbo Labs <span className="text-muted font-normal">· prediction market</span>
        </Link>

        <nav className="flex items-center gap-5 text-sm">
          <NavLink href="/">Markets</NavLink>
          {isConnected ? <NavLink href="/portfolio">Portfolio</NavLink> : null}
          {isOperator ? <NavLink href="/admin">Admin</NavLink> : null}
          <NavLink href="/about">About</NavLink>
          <ConnectButton />
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn("text-muted hover:text-fg transition-colors", className)}
    >
      {children}
    </Link>
  );
}
