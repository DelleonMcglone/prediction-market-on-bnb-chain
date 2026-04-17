import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { addresses, isDeployed } from "@/lib/contracts";
import { addressUrl } from "@/lib/explorer";

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-12">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted">
          Igbo Labs · Case Study № 007
        </p>
        <h1 className="text-3xl font-semibold mt-2">Prediction Market Demo</h1>
        <p className="text-muted mt-4 leading-relaxed">
          A clickable proof-of-concept that accompanies the case study. Deployed to BNB testnet,
          no real money. You can create a market, trade, resolve, and claim &mdash; the whole
          lifecycle from a public URL.
        </p>
      </header>

      <section>
        <h2 className="text-lg font-semibold mb-4">What it proves</h2>
        <ol className="list-decimal pl-6 space-y-3 text-sm leading-relaxed text-muted">
          <li>
            <span className="text-fg">Continuous pricing under low liquidity.</span> LMSR prices
            are defined from the first share and move smoothly with every trade, with no warmup
            period and no depth-of-book tricks.
          </li>
          <li>
            <span className="text-fg">A complete lifecycle.</span> Operators create markets,
            traders buy and sell, the operator submits an outcome, a short dispute window
            elapses, and winning shares claim collateral 1-for-1. Every flow is reachable from
            the UI.
          </li>
          <li>
            <span className="text-fg">Trustworthy UX.</span> Polymarket-tier polish, not
            hackathon-tier. Error states decoded, empty states explained, approvals once per
            market, slippage configurable.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">How it works</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <HowCard
            title="LMSR pricing"
            body="Stateless cost function on PRB Math SD59x18. price(yes) + price(no) = 1 by construction. b = 100e18 for the demo."
          />
          <HowCard
            title="ERC-1155 shares"
            body="Token IDs encode (market, outcome). Only the market contract at the address in the ID can mint or burn its shares — no separate registry."
          />
          <HowCard
            title="On-chain reads"
            body="No indexer. Wagmi + viem read directly via multicall. Event-derived price history for the chart, pinned to deploy block."
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Contracts</h2>
        {isDeployed ? (
          <Card className="font-mono text-xs space-y-2">
            <Addr label="MockUSDC" addr={addresses.mockUSDC} />
            <Addr label="Shares" addr={addresses.shares} />
            <Addr label="Resolution" addr={addresses.resolution} />
            <Addr label="MarketFactory" addr={addresses.marketFactory} />
            <Addr label="Dispenser" addr={addresses.dispenser} />
          </Card>
        ) : (
          <Card>
            <CardTitle>Contracts not yet deployed</CardTitle>
            <CardDescription>
              Addresses land here once the operator deploys the core contracts to BNB testnet.
            </CardDescription>
          </Card>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Built with</h2>
        <ul className="grid gap-2 sm:grid-cols-2 text-sm text-muted">
          <Built name="Foundry" detail="Solidity 0.8.26, OpenZeppelin v5, PRB Math" />
          <Built name="Next.js 15" detail="App Router, React 19, TypeScript" />
          <Built name="wagmi v2 + viem" detail="Typed contract hooks, multicall" />
          <Built name="Reown AppKit" detail="WalletConnect, BNB testnet only" />
          <Built name="TanStack Query" detail="Server-state caching, refetch intervals" />
          <Built name="recharts" detail="Event-derived price chart" />
        </ul>
      </section>

      <section className="border-t border-white/10 pt-6">
        <h2 className="text-lg font-semibold mb-3">Scope &amp; trade-offs</h2>
        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-fg mb-1">What&apos;s in</p>
            <ul className="text-muted space-y-1">
              <li>2-outcome LMSR markets</li>
              <li>Single collateral (MockUSDC)</li>
              <li>Operator-submitted resolution + dispute window</li>
              <li>One-shot dispenser for fresh wallets</li>
            </ul>
          </div>
          <div>
            <p className="text-fg mb-1">What&apos;s deliberately out</p>
            <ul className="text-muted space-y-1">
              <li>Mainnet, upgradeable proxies, third-party audit</li>
              <li>Multi-outcome markets, limit orders</li>
              <li>Oracle integration — operator is the oracle</li>
              <li>Indexer / separate backend service</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

function HowCard({ title, body }: { title: string; body: string }) {
  return (
    <Card className="py-4">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted mt-1.5 leading-relaxed">{body}</p>
    </Card>
  );
}

function Built({ name, detail }: { name: string; detail: string }) {
  return (
    <li className="flex justify-between gap-3">
      <span className="text-fg">{name}</span>
      <span className="truncate">{detail}</span>
    </li>
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
