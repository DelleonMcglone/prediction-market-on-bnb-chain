import Link from "next/link";
import { addressUrl } from "@/lib/explorer";
import { addresses, isDeployed } from "@/lib/contracts";

export function Footer() {
  return (
    <footer className="border-t border-white/10 mt-16">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row gap-6 md:items-center md:justify-between text-xs text-muted">
        <div>
          <p>
            <span className="text-fg font-medium">Testnet only.</span> No real funds
            involved. Part of Igbo Labs Case Study № 007.
          </p>
          {isDeployed ? (
            <p className="mt-1">
              Factory:{" "}
              <a
                href={addressUrl(addresses.marketFactory)}
                target="_blank"
                rel="noreferrer"
                className="font-mono hover:text-fg transition-colors"
              >
                {addresses.marketFactory}
              </a>
            </p>
          ) : (
            <p className="mt-1 italic">Contracts not yet deployed to testnet.</p>
          )}
        </div>
        <nav className="flex gap-4">
          <Link href="/about" className="hover:text-fg transition-colors">
            About
          </Link>
          <a
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-fg transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://www.bnbchain.org/en/testnet-faucet"
            target="_blank"
            rel="noreferrer"
            className="hover:text-fg transition-colors"
          >
            tBNB faucet
          </a>
        </nav>
      </div>
    </footer>
  );
}
