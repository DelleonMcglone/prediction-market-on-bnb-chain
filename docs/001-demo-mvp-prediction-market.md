# Demo MVP Spec — Prediction Market on BNB Chain

**Doc ID:** `001-demo-mvp-prediction-market`
**Project:** Igbo Labs · Prediction Market Case Study № 007
**Purpose:** Define the scope, architecture, and acceptance criteria for a public-facing demo MVP that accompanies the case study document. The demo is a live, interactive proof-of-concept that a prospective partner can click through end-to-end.

---

## 1. Objective

Build a deployed, publicly accessible demo that proves three things simultaneously:

1. **The pricing mechanism works under low liquidity** — an LMSR-backed market produces continuous, sensible prices from trade #1, not after volume builds up.
2. **The end-to-end flow is complete** — a user can create, trade, resolve, and claim without hitting scaffolding or stubs.
3. **The UX feels trustworthy** — the interface meets the bar set by Polymarket, not the bar set by a hackathon submission.

**Out of scope for the demo:** multi-collateral markets, mainnet deployment, third-party audit, oracle integrations, mobile optimization beyond "works on a phone."

---

## 2. Success Criteria

The demo is considered complete when all of the following are true and demonstrable from a live URL:

- [ ] A visitor lands on a public Vercel URL and sees a list of at least 3 seeded active markets.
- [ ] A visitor can connect a wallet (Reown/WalletConnect) configured for BNB testnet.
- [ ] A visitor can buy YES or NO shares in any active market using testnet stablecoin (mock USDC or tBNB-backed equivalent).
- [ ] Market price updates continuously with each trade — no discontinuities greater than 5 cents per $10 of trade volume in a seeded market.
- [ ] A visitor can view their open positions with real-time price and unrealized P&L.
- [ ] An operator can access a role-gated admin view, create a new market, and resolve an existing one.
- [ ] A resolved market allows winning position holders to claim their payout in a single transaction.
- [ ] All contracts are verified on BscScan (testnet).
- [ ] Source repo is public on GitHub with a one-command local setup.

---

## 3. Failure Conditions

The demo fails if any of the following occur during a walkthrough:

- Price discontinuity exceeds the threshold above (suggests LMSR parameters are miscalibrated).
- Any on-chain call reverts without a user-friendly error surface in the UI.
- Wallet connection fails on a fresh browser/incognito session.
- Admin actions can be triggered by a non-admin wallet.
- A user cannot exit a position (sell back) without accepting a haircut greater than 2× the configured fee.
- A resolved market leaves any claimable funds unreachable.

---

## 4. Edge Cases to Handle

| Edge Case | Required Behavior |
|-----------|-------------------|
| User buys when subsidy is near-exhausted | Transaction reverts with clear message; UI shows "Market capacity reached" |
| User attempts to sell more shares than held | UI disables button; contract reverts as backstop |
| Market is paused mid-trade | UI shows paused state; no trade entrypoints are active |
| Operator submits outcome on already-resolved market | Contract reverts; admin UI surfaces error |
| Dispute window active — user attempts to claim | UI shows countdown; claim button disabled until window closes |
| User holds shares in a resolved-losing outcome | UI clearly shows position as lost; no claim button shown |
| Wallet on wrong network | UI prompts network switch; no trade UI rendered |

---

## 5. Architecture Overview

Demo uses the same three-layer architecture described in Case Study № 007, scoped down to a single-collateral, single-network slice.

### 5.1 Smart Contracts (BNB Testnet)

All contracts deployed to BNB Chain testnet (chain ID 97) with sources verified on BscScan.

| Contract | Responsibility |
|----------|----------------|
| `MarketFactory.sol` | Creates new markets; maintains registry |
| `Market.sol` | One instance per market; buy/sell entrypoints; subsidy accounting |
| `LMSRPricing.sol` | Stateless pricing library; cost function and price queries |
| `Shares.sol` | ERC-1155 for YES/NO position tokens across all markets |
| `Resolution.sol` | Outcome submission, dispute window, claim flow |
| `MockUSDC.sol` | Testnet collateral token with a public faucet for demo visitors |
| `Dispenser.sol` | Drips MockUSDC + small amount of tBNB to fresh visitor wallets on demand (added per decision on Section 12 open question) |

**Access control:** OpenZeppelin `AccessControl` with two roles — `DEFAULT_ADMIN_ROLE` (deployer) and `OPERATOR_ROLE` (admin panel users). No upgradeable proxy in the demo — the MVP deploys fixed contracts to keep the scope tight and the audit surface obvious. Upgradeability is documented in the case study as a production concern.

### 5.2 Frontend (Vercel)

- **Framework:** Next.js 15 (App Router), TypeScript, Tailwind
- **Wallet:** Reown AppKit (WalletConnect) configured for BNB testnet only
- **Contract interaction:** Wagmi v2 + Viem
- **State:** TanStack Query for chain reads; React state for UI
- **Data layer:** Direct on-chain reads for all market state; no separate indexer in the MVP. MongoDB is deferred — chain is the source of truth for the demo.

**Routes:**

```
/                    → Market list (homepage)
/market/[address]    → Single market detail (trade UI)
/portfolio           → Connected wallet's open + resolved positions
/admin               → Role-gated operator panel (create/resolve)
/about               → Link back to the case study PDF
```

### 5.3 Deployment

- **Frontend:** Vercel, custom subdomain (e.g., `demo.igbolabs.xyz` or similar)
- **Contracts:** BNB testnet, deployed via Foundry scripts, addresses committed to the repo as a JSON config
- **Faucet link:** Prominent banner pointing visitors to the BNB testnet faucet so they can actually try it

---

## 6. LMSR Parameters for the Demo

The pricing core is the most important thing the demo *proves*. Parameters must be chosen so the demo feels responsive without being reckless.

| Parameter | Demo Value | Rationale |
|-----------|-----------|-----------|
| Liquidity constant `b` | `100 * 10^18` (100 USDC equivalent) | Low enough that trades visibly move prices; high enough to absorb normal clicking without wild jumps |
| Max operator subsidy per market | `500 USDC` | Caps demo exposure; visible in admin panel |
| Trading fee | `1%` | Realistic; not so high that it distorts the feel of the market |
| Dispute window | `2 minutes` (testnet only) | Short enough to demo the full lifecycle in one sitting; documented as "24–72hr in production" |

These values are all config constants — change them in one file and redeploy.

---

## 7. Seeded Demo Content

The demo launches with 3 pre-created markets chosen to be evergreen and low-risk (no political/sports content that could age badly):

1. **"Will the demo market #1 be resolved YES?"** — an obviously trivial market used to showcase the full lifecycle from a visitor's perspective.
2. **"Will this market have more than 20 trades by the end of the week?"** — a self-referential market that demonstrates how prices evolve with activity.
3. **"Will the next block mined on BSC testnet have an even block number?"** — a fully deterministic market for showing the resolution flow end-to-end.

Each seeded market starts with the full subsidy applied so prices render meaningfully from the first visitor.

---

## 8. Implementation Checklist

Organized by phase. Each phase closes with a commit and a testable artifact. Every phase includes a task doc in `docs/tasks/`.

### Phase 01 · Repo Setup
- [ ] `.gitignore`, `package.json` with pinned dependencies, README with one-command setup
- [ ] Monorepo structure: `/contracts` (Foundry), `/frontend` (Next.js), `/docs`
- [ ] `docs/architecture.md` scaffolded with decisions from this spec
- [ ] CI: lint + typecheck + contract tests on every push

### Phase 02 · Contracts (TDD)
- [ ] `MockUSDC.sol` with public `mint()` for the faucet
- [ ] `Shares.sol` (ERC-1155) with per-market token ID encoding
- [ ] `LMSRPricing.sol` as a library; unit tested against a reference implementation
- [ ] `Market.sol` — `buy()`, `sell()`, `pause()`; invariant tests on price bounds and share sum
- [ ] `MarketFactory.sol` with `OPERATOR_ROLE` gating
- [ ] `Resolution.sol` with outcome submission, dispute window, claim flow
- [ ] `Dispenser.sol` — MockUSDC + tBNB drip for fresh visitor wallets
- [ ] End-to-end Foundry test: create → 10 trades → resolve → claim
- [ ] Deploy script writes addresses to `deployments/bnbTestnet.json`

### Phase 03 · Contract Deployment
- [ ] Deploy all contracts to BNB testnet
- [ ] Verify all sources on BscScan
- [ ] Seed the 3 demo markets with subsidy
- [ ] Fund Dispenser with MockUSDC allowance and a tBNB balance
- [ ] Commit deployment artifacts to the repo

### Phase 04 · Frontend Foundation
- [ ] Next.js app with Reown AppKit wired to BNB testnet
- [ ] Wagmi/Viem config, typed contract hooks generated from ABIs
- [ ] Base layout, nav, typography system matching the case study aesthetic
- [ ] Error boundary, toast system, network-switch prompt

### Phase 05 · Market Read Flow
- [ ] Homepage: market list with live prices, volume, resolution status
- [ ] Market detail page: price chart (recharts), order entry form, market metadata
- [ ] Portfolio page: open positions with unrealized P&L, resolved positions with claim state

### Phase 06 · Market Write Flow
- [ ] Buy flow: amount input → price preview → approve collateral → execute trade
- [ ] Sell flow: share amount input → payout preview → execute trade
- [ ] Claim flow: single button on resolved winning positions
- [ ] Dispenser "Get test funds" flow wired to UI on first visit
- [ ] All flows have optimistic UI + confirmation toast + explorer link

### Phase 07 · Admin Panel
- [ ] `/admin` route gated by `OPERATOR_ROLE` check
- [ ] Create market form: question, subsidy amount, dispute window override
- [ ] Active market list with pause / resolve actions
- [ ] Dispute window status and finalize button when window closes

### Phase 08 · Polish & Handoff
- [ ] Copy pass across every UI state
- [ ] Loading skeletons, empty states, error states
- [ ] `/about` page linking to the case study PDF
- [ ] Open Graph image + meta tags for sharing
- [ ] README updated with live URL, contract addresses, and faucet instructions
- [ ] Architecture doc reviewed and aligned with shipped code

---

## 9. Testing Requirements

Per Igbo Labs development standards — TDD throughout.

### 9.1 Contract Tests
- Unit tests for every public function in every contract
- Invariant tests: price sum ≤ 1 unit of collateral, subsidy never goes negative, share supply matches cost function
- Fuzz tests on buy/sell with randomized amounts and sequences
- Gas profile report committed per entrypoint

### 9.2 Frontend Tests
- Component tests for all form and display components
- Integration test hitting a local Anvil fork for at least the buy + claim flow
- Manual smoke test checklist committed to the repo

### 9.3 Verification Before Demo-Ready
- [ ] Full walkthrough on BNB testnet from a fresh wallet
- [ ] Price continuity check: execute 50 sequential $1 trades, graph the price, confirm monotonic and smooth
- [ ] Admin action test: non-admin wallet cannot access `/admin` routes or admin contract functions
- [ ] Dispute window test: outcome submitted → wait → finalize → claim all work as specified

---

## 10. Documentation Deliverables

- `README.md` — project overview, live URL, one-command setup
- `docs/architecture.md` — full design decisions log
- `docs/contracts.md` — contract-by-contract API reference
- `docs/tasks/` — one task doc per implementation phase above
- `docs/promptHistory/` — refined prompts used during the build
- Deployed contract addresses in `/deployments/bnbTestnet.json`
- Public BscScan verification links for every contract

---

## 11. Security Posture

The demo is a testnet artifact, not a production system. Still, it follows production discipline as a credibility signal:

- Role-based access control via OpenZeppelin `AccessControl`
- ReentrancyGuard on buy/sell/claim entrypoints
- SafeERC20 for all token transfers
- Input validation on all user-facing calls
- No admin backdoor functions; no upgradeability in the demo to keep the attack surface obvious
- Comments on every non-trivial function; NatSpec on the public API

Anything beyond this — formal audit, timelock, multisig admin, incident response playbook — is documented in the case study as production work, not built into the demo.

---

## 12. Open Questions

Items to resolve before implementation starts:

- [x] **Collateral choice:** MockUSDC we deploy ourselves. (Cleaner for demo clarity than piggybacking on existing testnet token.)
- [ ] **Domain:** Does the demo get its own subdomain or live under a path on the Igbo Labs site? — *unresolved, does not block implementation*
- [ ] **Analytics:** Do we want minimal privacy-respecting analytics (Plausible) on the demo to see traffic, or skip it? — *unresolved, does not block implementation*
- [x] **Fallback UX if a visitor has no testnet funds:** Deploy a Dispenser contract that drips both MockUSDC and a small amount of tBNB for gas. See `Dispenser.sol` in Section 5.1.

---

## 13. Out of Scope (Explicit Non-Goals)

To prevent scope creep during the build:

- Mainnet deployment
- Upgradeable proxy pattern
- Third-party audit
- Mobile-first design (works on mobile ≠ designed for mobile)
- Real-money markets
- Oracle integration (UMA, Chainlink, etc.)
- Multi-collateral markets
- Order book or limit orders
- Automated market resolution (manual operator-submitted only)
- Indexer / separate backend service
- Full Polymarket feature parity (social features, categories, search, follows)

Every item above is intentional — it is the *production* build, not the *demo*. Each is already addressed in Case Study № 007.
