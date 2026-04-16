# Phase 05 · Market Read Flow

**Goal:** Every read-only surface renders real on-chain data: homepage market list, market detail with price chart, portfolio view with P&L. No writes yet.

## Prerequisites

- Phase 04 complete — providers, typed hooks scaffold, base UI primitives.
- 3 markets seeded on BNB testnet.

## Deliverables

### Hooks (fleshed out)

- **`useMarkets()`** — `MarketFactory.markets()` → `address[]`. Cached by TanStack Query with a 30s stale time.
- **`useMarketData(address)`** — Multicall fetch returning:
  ```ts
  type MarketData = {
    address: Address;
    question: string;
    qYes: bigint;            // 18-decimal
    qNo: bigint;             // 18-decimal
    priceYes: bigint;        // 18-decimal, [0, 1e18]
    priceNo: bigint;         // 18-decimal
    collateralBalance: bigint;
    subsidyRemaining: bigint;
    paused: boolean;
    resolved: boolean;
    winningOutcome?: 0 | 1;
    disputeEndsAt?: bigint;
  };
  ```
  Revalidate every 10s on the detail page, every 30s on the list.
- **`useMarketHistory(address)`** — Returns `{ timestamp, priceYes }[]`. Built by listening to `Bought` + `Sold` events and deriving implied price at each event via the LMSR state transitions. Cache per market in sessionStorage.
- **`usePortfolio(wallet)`** — Iterates `useMarkets()` → for each, reads `Shares.balanceOf(wallet, idFor(market, 0))` and `Shares.balanceOf(wallet, idFor(market, 1))`. Returns positions with current P&L.

### Pages

#### `app/page.tsx` — Homepage / Market list

- **Hero:** One line — "Prediction markets on BNB testnet. No real money. LMSR-priced."
- **Testnet banner:** Persistent yellow strip — "This is a BNB testnet demo. Need test funds? [Get them here]" linking to Dispenser flow (Phase 06 wires the button).
- **Market grid:** 3-column on desktop, 1-column on mobile. Each card:
  - Question (prominent, 2 lines max with `line-clamp-2`).
  - YES price as large number (e.g., "52¢"), with live tick indicator.
  - Small bar: yes vs no price split visualization.
  - Volume / trade count (if cheap to compute; else skip for MVP).
  - Resolution badge if resolved.
  - Paused badge if paused.
- **Empty state:** "No active markets yet. Operators can create one at `/admin`."
- **Loading state:** Skeleton cards.

#### `app/market/[address]/page.tsx` — Market detail

- **Header:** Question, resolution status, market address with BscScan link.
- **Price display:**
  - Large YES/NO price pair.
  - Implied probability wording: "The market thinks YES is 52% likely."
- **Price chart (recharts):**
  - Line chart of `priceYes` over time.
  - X-axis: timestamp. Y-axis: 0 to 1.
  - Hover tooltip shows exact price and timestamp.
  - Empty state when market has no trades yet — show a flat line at 0.5 with "No trades yet. Be the first."
- **Market metadata panel:**
  - Liquidity parameter `b`.
  - Trading fee %.
  - Subsidy remaining / subsidy max.
  - Dispute window length.
  - Operator address.
- **Trade form placeholder:** Empty card labeled "Trade (Phase 06)". Phase 06 fills in.
- **Recent trades list:** Latest 10 `Bought`/`Sold` events, outcome, amount, wallet (linked), BscScan tx link.

#### `app/portfolio/page.tsx` — Portfolio

- **Disconnected state:** "Connect a wallet to see your positions."
- **Wrong network:** `NetworkGuard` handles this.
- **Connected state:**
  - **Open positions table:** Market question | Outcome (YES/NO chip) | Shares held | Current price | Unrealized value | Entry cost (if we track it via events — else N/A).
  - **Resolved positions table:** Market question | Outcome held | Winning outcome | Status (Won/Lost) | Claimable amount | Claim button placeholder (Phase 06).
  - **Empty state:** "You don't hold any positions yet. Browse markets →"

### Components

- **`MarketCard.tsx`** — Used on homepage.
- **`PriceChart.tsx`** — Wraps recharts with our styling.
- **`PriceDisplay.tsx`** — Large YES/NO number pair with split bar.
- **`PositionRow.tsx`** — Single row in portfolio tables.
- **`TradeHistory.tsx`** — Recent trades panel.
- **`MarketMetadata.tsx`** — Sidebar panel on detail page.

## Acceptance criteria

- [ ] Homepage renders 3 market cards with live prices matching on-chain state.
- [ ] Market detail page shows question, prices, metadata, chart, and recent trades for each seeded market.
- [ ] Price chart renders without errors even for a market with 0 events (shows flat line at 0.5).
- [ ] Portfolio page renders correctly for: disconnected, empty, one position, multiple positions.
- [ ] All reads use multicall where possible (confirm network tab shows consolidated RPC calls).
- [ ] Every BscScan link opens the correct contract / address / tx page.
- [ ] Time-to-interactive ≤ 2s on a cold load (Vercel Analytics or manual Lighthouse check).
- [ ] No hydration warnings in browser console.

## Tests

- **Component tests:**
  - `MarketCard` renders title, YES price, split bar given mock data.
  - `PriceChart` renders with 0, 1, and 50 data points.
  - `PositionRow` renders correct chip color for YES vs NO, correct P&L sign.
- **Hook tests (against Anvil fork):**
  - `useMarkets()` returns seeded addresses.
  - `useMarketData()` returns consistent price pair summing to ~1e18.
  - `usePortfolio()` returns positions after mock trades.
- **Visual regression (optional):** Playwright screenshot of `/` and `/market/[address]`.

## Risks / gotchas

- **Event-derived price history cost:** Pulling all `Bought`/`Sold` events since genesis on every page load is slow. Use `fromBlock = blockOfDeployment` stored in `deployments/bnbTestnet.json`. Cache aggressively.
- **Recharts + Next.js SSR:** Recharts is client-only. Wrap in `'use client'` and dynamic import with `ssr: false`.
- **Price rounding display:** Show as "52¢" (nearest cent) or "52.3%" — pick one and be consistent. Recommend: cents on cards, percent on detail.
- **BigInt serialization:** TanStack Query + BigInt needs a JSON replacer. Or store as hex strings in cache.
- **Mobile layout:** Tables overflow. Stack into cards below 640px.

## Decisions recorded

- **No indexer** — all reads are direct chain calls with event scans for history. MongoDB stays deferred.
- **Price display:** cents on list views, percent on detail view. Document in `docs/architecture.md`.
- **History cache:** sessionStorage keyed by market address. Invalidate when Phase 06 writes a trade.

## Exit criteria

Commit `feat: phase 05 market read flow`. Demo URL shows live markets. Move to Phase 06.
