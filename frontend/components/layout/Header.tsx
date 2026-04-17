"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@/components/ConnectButton";
import { cn } from "@/lib/cn";

/**
 * All four nav links are always visible. Each destination handles its own
 * access / connection state in-page (Portfolio shows a "Connect a wallet"
 * card when disconnected, Admin shows "Not authorized" for non-operators,
 * etc.) so the nav itself never leaves a broken click.
 */
const NAV_LINKS = [
  { href: "/", label: "Markets" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/admin", label: "Admin" },
  { href: "/about", label: "About" },
] as const;

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-white/10">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-mono text-sm font-semibold">
          Igbo Labs <span className="text-muted font-normal">· prediction market</span>
        </Link>

        <nav className="flex items-center gap-5 text-sm">
          {NAV_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <NavLink key={link.href} href={link.href} active={active}>
                {link.label}
              </NavLink>
            );
          })}
          <ConnectButton />
        </nav>
      </div>
    </header>
  );
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLink({
  href,
  children,
  active,
  className,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "transition-colors",
        active ? "text-fg font-medium" : "text-muted hover:text-fg",
        className,
      )}
    >
      {children}
    </Link>
  );
}
