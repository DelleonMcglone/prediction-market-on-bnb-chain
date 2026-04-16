# Phase 04 · Frontend Foundation

**Goal:** Next.js app that connects a wallet on BNB testnet, reads any contract the spec defines via typed hooks, and has the base visual system + error/toast infrastructure in place. No trading UI yet — that's Phase 05 / 06.

## Prerequisites

- Phase 01 scaffold (`frontend/` exists with pinned deps).
- Phase 03 complete — `deployments/bnbTestnet.json` committed.

## Deliverables

### Configuration

- **`frontend/lib/wagmi.ts`** — `createConfig` with `bscTestnet` chain (chain ID 97) as the only chain. Reown AppKit adapter wired. Public RPC + user-provided fallback via `NEXT_PUBLIC_BNB_TESTNET_RPC_URL`.
- **`frontend/lib/reown.ts`** — `createAppKit` with project ID from `NEXT_PUBLIC_REOWN_PROJECT_ID`. Branded metadata: name = "Igbo Labs Prediction Market Demo", url = live URL placeholder.
- **`frontend/lib/contracts.ts`** — Reads `deployments/bnbTestnet.json` at build time (via `import` or a codegen step), exports typed addresses.
- **`frontend/lib/abis/`** — ABIs for each contract, sourced from `contracts/out/` via a script `pnpm sync:abis`. Committed so Vercel builds don't need Foundry.

### Codegen

- **`scripts/sync-abis.ts`** — Reads `contracts/out/*.sol/*.json`, extracts ABIs, writes them to `frontend/lib/abis/` as typed TS constants with `as const` for viem/wagmi inference.
- Root `package.json` script: `"sync:abis": "tsx scripts/sync-abis.ts"`.

### Providers

- **`frontend/app/providers.tsx`** — Client component. Wraps `WagmiProvider`, `QueryClientProvider`, Reown AppKit provider.
- **`frontend/app/layout.tsx`** — Imports providers, sets up global Tailwind styles, defines metadata.

### Base UI system

- **`frontend/app/globals.css`** — Tailwind layers. Custom CSS variables for the brand palette. Dark mode by default (Polymarket-style neutral dark), light mode toggle optional.
- **`frontend/components/ui/`** — Primitives: `Button`, `Card`, `Input`, `Select`, `Dialog` (headless UI or radix), `Skeleton`, `Badge`, `Toast`. Style with Tailwind + CSS variables.
- **`frontend/components/layout/Header.tsx`** — Logo, nav (`/`, `/portfolio`, `/admin` (conditional), `/about`), Connect Wallet button (Reown).
- **`frontend/components/layout/Footer.tsx`** — Case study link, BscScan links, "Testnet only" banner.
- **Typography system:** one sans-serif (Inter or the case study's chosen font), one mono (JetBrains Mono). Type scale documented in `globals.css`.

### Infrastructure

- **`frontend/components/ErrorBoundary.tsx`** — React error boundary wrapping the route tree. Renders a friendly error card with a retry button.
- **`frontend/components/NetworkGuard.tsx`** — Checks `useAccount().chain?.id === 97`. If not, renders a blocking modal "Switch to BNB Testnet" with a `switchChain` button. Used on any route that needs chain interaction.
- **`frontend/components/Toast.tsx` + `useToast` hook** — Minimal toast system. Variants: info, success, error. Used for txn confirmations in Phase 06.
- **`frontend/lib/explorer.ts`** — `txUrl(hash)`, `addressUrl(address)` helpers for BscScan testnet links.

### Typed hooks (scaffold only, not used yet)

- **`frontend/hooks/useMarkets.ts`** — Reads `MarketFactory.markets()` and returns `address[]`. Does not fetch per-market data yet.
- **`frontend/hooks/useMarketData.ts`** — Signature `(address) => { question, qYes, qNo, price, paused, resolved }`. Scaffold returns undefined; Phase 05 fills in multicall.
- **`frontend/hooks/usePortfolio.ts`** — Signature `(wallet) => Position[]`. Scaffold returns empty array.
- **`frontend/hooks/useIsOperator.ts`** — Calls `MarketFactory.hasRole(OPERATOR_ROLE, address)`. Returns `boolean | undefined`.

### Placeholder pages

- **`app/page.tsx`** — "Demo — coming together" hero with wallet connect and a placeholder market list. Static for now.
- **`app/market/[address]/page.tsx`** — Empty state "Market detail — Phase 05".
- **`app/portfolio/page.tsx`** — Empty state "Portfolio — Phase 05".
- **`app/admin/page.tsx`** — `useIsOperator` gate already wired; empty state "Admin — Phase 07" for operators, 404 for others.
- **`app/about/page.tsx`** — Link to the case study PDF. Placeholder.

## Acceptance criteria

- [ ] `pnpm dev` serves `localhost:3000` and renders the header with working Connect Wallet.
- [ ] Connecting a WalletConnect-compatible wallet on BNB testnet succeeds in a fresh incognito session.
- [ ] A wallet on the wrong chain sees the NetworkGuard modal and can switch.
- [ ] `useIsOperator` returns `true` for the deployer wallet, `false` for others (live against deployed contracts).
- [ ] ABIs under `frontend/lib/abis/` match the deployed contracts (run `pnpm sync:abis`, commit, confirm no diff when re-run).
- [ ] `pnpm build` produces a static-optimized output with no type errors.
- [ ] Vercel preview deploy succeeds from a PR.

## Tests

- **Component tests** (Vitest + React Testing Library):
  - `Button` — variants render; disabled state blocks click.
  - `NetworkGuard` — renders modal when chain mismatches, renders children when matched.
  - `Toast` — shows and auto-dismisses.
- **Integration:** `useIsOperator` tested against an Anvil fork with known operator/non-operator addresses.

## Risks / gotchas

- **Reown AppKit project ID:** required and must be created at cloud.reown.com. Store only in env, never committed.
- **Vercel env vars:** `NEXT_PUBLIC_REOWN_PROJECT_ID`, `NEXT_PUBLIC_BNB_TESTNET_RPC_URL` must be set in Vercel project. Document in README.
- **SSR + wagmi:** Mark any component that uses wagmi hooks `'use client'`. Use the App Router pattern of putting `providers.tsx` at the root and client boundaries on leaves.
- **Hydration warnings on wallet state:** Gate client-only data behind `useEffect` or `suppressHydrationWarning` where warranted.
- **ABI drift:** If contracts change later, running `pnpm sync:abis` will produce a diff. Enforce in CI.

## Decisions recorded

- **ABIs committed to repo** (not built at deploy time) — removes Foundry dependency from Vercel builds.
- **Dark mode default** — matches Polymarket aesthetic. Light mode is a nice-to-have for Phase 08.
- **No design system library** (no shadcn, no mantine) — hand-rolled primitives in `components/ui/`. Keeps the bundle small and the aesthetic tight.

## Exit criteria

Commit `feat: phase 04 frontend foundation`. Vercel preview URL pasted into the README. Move to Phase 05.
