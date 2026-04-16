# Architecture

Design-decisions log. Fleshed out phase by phase. Source of truth for scope lives in [`001-demo-mvp-prediction-market.md`](001-demo-mvp-prediction-market.md); this doc records the *how*.

---

## System overview

Three layers, single network:

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (Vercel) — Next.js 15 · wagmi v2 · Reown      │
└────────────────────────┬────────────────────────────────┘
                         │ direct on-chain reads/writes
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Contracts (BNB testnet, chain 97)                      │
│  MarketFactory → Market(s) ↔ Shares (ERC-1155)          │
│                ↕                                        │
│             Resolution                                  │
│                ↕                                        │
│  MockUSDC (collateral)    Dispenser (faucet)            │
└─────────────────────────────────────────────────────────┘
```

No indexer, no backend service. Chain is the source of truth; frontend reads directly via multicall.

---

## Contracts

_Populated in Phase 02._

Placeholder layout:
- `MockUSDC.sol` — 6-decimal ERC20, public `mint()`.
- `Shares.sol` — ERC-1155, per-market YES/NO token IDs.
- `LMSRPricing.sol` — stateless library, `cost` / `price` / `deltaCost` (PRBMath-backed).
- `Market.sol` — one per market; `buy`, `sell`, `pause`, `previewBuy`, `previewSell`.
- `MarketFactory.sol` — `OPERATOR_ROLE`-gated market creation; registry.
- `Resolution.sol` — outcome submission, dispute window, claim.
- `Dispenser.sol` — one-time MockUSDC + tBNB drip per address.

**Access control:** OpenZeppelin `AccessControl`. `DEFAULT_ADMIN_ROLE` = deployer, `OPERATOR_ROLE` = admin panel.
**Guards:** `ReentrancyGuard` on buy/sell/claim; `whenNotPaused` on Market trades.
**Tokens:** `SafeERC20` for all transfers.

Full contract-by-contract reference lands in [`contracts.md`](contracts.md) during Phase 03.

### LMSR parameters (per spec § 6)

| Parameter | Value |
|-----------|-------|
| Liquidity constant `b` | `100 * 10^18` |
| Max subsidy / market | `500 USDC` |
| Trading fee | `1%` (100 bps) |
| Dispute window | 2 min (testnet) |

### Math notes

- Fixed-point: PRBMath `SD59x18`. Signed, 18-decimal, built-in `exp` / `ln`.
- Collateral is 6-decimal USDC; internal quantities / prices are 18-decimal. Conversion happens at the `Market` boundary.
- `exp(q/b)` overflow guard: revert if `|q/b| > ~130` (≈ 99.99% certainty).

---

## Frontend

_Populated in Phase 04._

- **Framework:** Next.js 15, App Router, React 19, TypeScript.
- **Wallet:** Reown AppKit (WalletConnect) configured for BNB testnet only.
- **Chain interaction:** wagmi v2 + viem v2.
- **Server state:** TanStack Query v5 wraps wagmi's reads.
- **Styling:** Tailwind 3.4 (JS config). Dark-first palette, CSS variables for semantic tokens (`--bg`, `--fg`, `--accent`, `--yes`, `--no`).
- **Charts:** recharts 2.x, client-only.

### Routes

| Path | Purpose |
|------|---------|
| `/` | Market list |
| `/market/[address]` | Single market — price, chart, trade form |
| `/portfolio` | Connected wallet's open + resolved positions |
| `/admin` | `OPERATOR_ROLE`-gated create / pause / resolve |
| `/about` | Links to case study PDF |

### ABI flow

Contracts are built by Foundry (`contracts/out/`). A build-time script `pnpm sync:abis` copies ABIs to `frontend/lib/abis/` as `as const` TS modules so wagmi / viem can infer types. ABIs are committed so Vercel builds don't need Foundry.

---

## Deployment

_Populated in Phase 03._

- **Frontend:** Vercel. Domain TBD (spec § 12 open).
- **Contracts:** BNB testnet (chain 97) via `forge script`. Addresses committed to [`../deployments/bnbTestnet.json`](../deployments/) and linked from `contracts.md`.
- **Verification:** BscScan via `forge verify-contract`. Library linking requires explicit `--libraries` flag.

---

## Security posture

Testnet artifact, production-discipline boilerplate:
- Role-based access via OZ `AccessControl`.
- `ReentrancyGuard` on all state-changing entrypoints that move collateral.
- `SafeERC20` on every transfer.
- No upgradeable proxy (documented in case study as production concern).
- No admin backdoor beyond `pause` and operator roles.
- NatSpec on public APIs.

---

## Deviations from spec

Logged as they happen so review is easy.

- **Tailwind v3.4 instead of v4** (spec § 5.2 says `^4`). Install reliability on a fresh repo; v4's CSS-first config is fine but `tailwind.config.ts` in Phase 01 deliverables implies v3 ergonomics. Revisit in Phase 08 polish if warranted.
- **`previewBuy` / `previewSell` view functions added to `Market`** (spec § 5.1 table doesn't name them). Required for the UI price preview in Phase 06; documented in Phase 02 task doc.

---

## Open architectural questions

Tracked as they surface; resolved decisions move up into the sections above.

- Domain / subdomain for the live demo (spec § 12).
- Analytics — Plausible or none (spec § 12).
- Whether to add a thin event cache layer if chain-only reads get too slow on the public page (revisit if Phase 05 performance is poor).
