import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { addresses, isDeployed } from "@/lib/contracts";
import { addressUrl } from "@/lib/explorer";

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-muted">
          Igbo Labs · Case Study № 007
        </p>
        <h1 className="text-3xl font-semibold mt-2">Prediction Market Demo</h1>
      </header>

      <section className="space-y-4 text-sm leading-relaxed text-fg">
        <p>
          An LMSR-backed binary prediction market deployed to BNB testnet. It
          exists to show three things working together end-to-end:
        </p>
        <ol className="list-decimal pl-6 space-y-1 text-muted">
          <li>Continuous prices from trade #1 under low liquidity.</li>
          <li>Full lifecycle — create, trade, resolve, claim.</li>
          <li>Trustworthy UX, not hackathon-tier.</li>
        </ol>
        <p className="text-muted">
          Full spec:{" "}
          <a
            href="https://github.com/"
            className="text-accent underline"
            target="_blank"
            rel="noreferrer"
          >
            docs/001-demo-mvp-prediction-market.md
          </a>
          .
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold mb-3">Contracts</h2>
        {isDeployed ? (
          <div className="space-y-2 font-mono text-xs">
            <Addr label="MockUSDC" addr={addresses.mockUSDC} />
            <Addr label="Shares" addr={addresses.shares} />
            <Addr label="Resolution" addr={addresses.resolution} />
            <Addr label="MarketFactory" addr={addresses.marketFactory} />
            <Addr label="Dispenser" addr={addresses.dispenser} />
          </div>
        ) : (
          <Card>
            <CardTitle>Not yet deployed</CardTitle>
            <CardDescription>
              Addresses land after the Phase 03 testnet deploy.
            </CardDescription>
          </Card>
        )}
      </section>
    </div>
  );
}

function Addr({ label, addr }: { label: string; addr: `0x${string}` }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted">{label}</span>
      <a
        href={addressUrl(addr)}
        target="_blank"
        rel="noreferrer"
        className="hover:text-fg transition-colors truncate"
      >
        {addr}
      </a>
    </div>
  );
}
