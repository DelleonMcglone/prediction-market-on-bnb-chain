# Prediction Market Demo — BNB Chain

An LMSR-backed prediction market demo. Accompanies **Igbo Labs Case Study № 007**.

> **Two supported modes:**
> - **Demo mode** (`NEXT_PUBLIC_DEMO_MODE=1`) — standalone, no wallet, no chain, no gas. Backed by an in-browser mock chain that mirrors the real contracts. **This is the mode the live URL runs.**
> - **Testnet mode** (`NEXT_PUBLIC_DEMO_MODE=0`) — same UI, wired to real BNB testnet contracts via wagmi + Reown AppKit. Requires operator deploy + a funded wallet.

**Live demo:** _TBD — any Vercel deploy with `NEXT_PUBLIC_DEMO_MODE=1` works._
**Testnet contracts:** _optional; see [`docs/deploy-runbook.md`](docs/deploy-runbook.md) if a client wants real on-chain._

---

## What this is

A clickable proof-of-concept that shows three things:

1. **LMSR pricing holds up under low liquidity** — continuous, sensible prices from trade #1.
2. **The lifecycle is complete** — create, trade, resolve, claim. All flows reachable from the UI.
3. **The UX is trustworthy** — Polymarket-tier polish, not hackathon-tier. Decoded errors, configurable slippage, one-shot dispenser for fresh wallets.

Full spec: [`docs/001-demo-mvp-prediction-market.md`](docs/001-demo-mvp-prediction-market.md).

## Stack

- **Contracts:** Foundry, Solidity 0.8.26, OpenZeppelin v5, PRB Math (LMSR fixed-point)
- **Frontend:** Next.js 15 App Router, React 19, wagmi v2, viem, Reown AppKit, Tailwind, recharts
- **Chain:** BNB testnet (chain ID 97)
- **Toolchain:** pnpm workspaces, Vitest, `forge test` (unit / invariant / fuzz / E2E)

## Getting started (demo mode)

The fastest path — no Foundry, no wallet, no deploy. Requires Node ≥ 20 and pnpm ≥ 10.

```bash
pnpm install

# Point the frontend at the in-browser mock chain
echo "NEXT_PUBLIC_DEMO_MODE=1" > frontend/.env.local
echo "NEXT_PUBLIC_REOWN_PROJECT_ID=ci-placeholder" >> frontend/.env.local

pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). You're pre-connected as a demo visitor with $1,000 mUSDC and operator rights — trade any market, create new ones from `/admin`, submit and finalize outcomes (dispute window is accelerated to 10s).

## Deploying to Vercel (demo mode)

1. Push to GitHub, import in Vercel.
2. Set one environment variable: `NEXT_PUBLIC_DEMO_MODE=1`.
3. Set the build command to `pnpm --filter frontend build` and the install command to `pnpm install` at the repo root.
4. Deploy. Every preview URL is a working demo — share as-is with prospects.

## Getting started (testnet mode)

For clients who want to see real on-chain behavior. Also requires Foundry ≥ 1.0.

```bash
pnpm install
cd contracts && forge install --no-git && cd ..
pnpm contracts:build && pnpm sync:abis
pnpm test
pnpm dev
```

Out of the box the UI is pointed at BNB testnet; for a local development loop against an Anvil fork see [Local development against Anvil](#local-development-against-anvil) below.

## Scripts

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Next.js dev server |
| `pnpm build` | Production build of the frontend |
| `pnpm lint` | ESLint on the frontend |
| `pnpm typecheck` | TypeScript type-check |
| `pnpm test` | Contract tests + frontend tests |
| `pnpm test:contracts` | `forge test` |
| `pnpm test:frontend` | Vitest |
| `pnpm contracts:build` | `forge build` |
| `pnpm contracts:fmt` | `forge fmt` |
| `pnpm sync:abis` | Copy ABIs from `contracts/out/` to `frontend/lib/abis/` |

## Project layout

```
contracts/       Foundry — sources, tests, deploy scripts
frontend/        Next.js 15 — UI, wallet, contract interaction
deployments/     Committed deployment artifact (bnbTestnet.json)
docs/            Spec, architecture, task docs, runbooks
  001-demo-mvp-prediction-market.md   ← source of truth for scope
  architecture.md                     ← design decisions + deviations
  contracts.md                        ← per-contract API reference
  deploy-runbook.md                   ← step-by-step testnet deploy
  smoke-test.md                       ← 13-section manual walkthrough
  tasks/                              ← per-phase implementation briefs
scripts/         Repo-level automation (abi sync, anvil dev chain)
.github/         CI workflows
```

## How demo mode works

A single env var flips every contract hook between wagmi/viem and an in-browser mock:

- [`frontend/lib/mockChain.ts`](frontend/lib/mockChain.ts) — JS reimplementation of the contracts' behavior, state persisted to localStorage. Mirrors `MockUSDC`, `Shares`, `Market`, `MarketFactory`, `Resolution`, and `Dispenser` closely enough that the UI doesn't know the difference.
- [`frontend/hooks/`](frontend/hooks/) — every read/write hook branches on `DEMO_MODE` at the top and routes to `mockChain` when on. Components stay agnostic.
- [`frontend/hooks/useDemoAccount.ts`](frontend/hooks/useDemoAccount.ts) — drop-in replacement for `useAccount()` that auto-connects a deterministic demo wallet.
- Dispute window accelerated to 10 seconds so the full market lifecycle (propose → wait → finalize → claim) is demonstrable in one sitting.

The mock chain is tested against the same analytic LMSR fixtures as the Solidity contracts (`lib/mockChain.test.ts`).

## Local development against Anvil

The frontend's `lib/contracts.ts` reads from `deployments/bnbTestnet.json`. For a loop against a local chain:

```bash
# Terminal 1 — start Anvil with chain-id 97
./scripts/dev-chain.sh

# Terminal 2 — deploy contracts + seed 3 markets + fund dispenser
./scripts/dev-chain.sh setup

# Terminal 3 — point the frontend at Anvil and start dev server
echo "NEXT_PUBLIC_BNB_TESTNET_RPC_URL=http://127.0.0.1:8545" > frontend/.env.local
echo "NEXT_PUBLIC_REOWN_PROJECT_ID=ci-placeholder" >> frontend/.env.local
pnpm dev
```

The frontend's `reown.ts` detects the local RPC override and drops `multicall3` from the chain descriptor so wagmi's batched reads don't hit a non-existent contract on fresh Anvil.

When you're done, `git checkout deployments/bnbTestnet.json` restores the committed addresses.

## Deploying to BNB testnet

See [`docs/deploy-runbook.md`](docs/deploy-runbook.md) for the step-by-step.

Short version:

1. Create a fresh wallet with `cast wallet new`.
2. Fund it with 0.05 tBNB from the [QuickNode faucet](https://faucet.quicknode.com/binance-smart-chain/bnb-testnet) — avoid the official faucet, it requires a mainnet balance check.
3. Get a free BscScan API key at https://bscscan.com/myapikey.
4. Copy `contracts/.env.example` to `contracts/.env` and fill in the three vars.
5. `forge script script/Deploy.s.sol --broadcast` → `SeedMarkets.s.sol` → `FundDispenser.s.sol`.
6. `./script/verify-all.sh` or `VERIFIER=sourcify ./script/verify-all.sh` (BscScan-independent).
7. `pnpm sync:abis && git commit -am "feat: phase 03 deploy"`.

## Getting testnet funds (as a visitor)

- **tBNB for gas:** [QuickNode faucet](https://faucet.quicknode.com/binance-smart-chain/bnb-testnet) (no mainnet balance required, ≥0.05 tBNB per claim, 12h cooldown)
- **mUSDC for trading:** Click "Get test funds" on the live demo. The in-app Dispenser sends ~100 mUSDC + a small amount of tBNB, once per wallet.

## Documentation

- [Spec](docs/001-demo-mvp-prediction-market.md) — scope, success criteria, edge cases
- [Architecture](docs/architecture.md) — design decisions log with "Deviations from spec" tracker
- [Contracts reference](docs/contracts.md) — per-contract API, role grants, events
- [Deploy runbook](docs/deploy-runbook.md) — prerequisites + testnet deploy + manual verify fallback
- [Smoke-test checklist](docs/smoke-test.md) — manual walkthrough for launch readiness
- [Task docs](docs/tasks/README.md) — per-phase implementation briefs (01–08)

## Security posture

This is a **testnet artifact**, not a production system. Still, it follows production discipline:

- Role-based access control via OpenZeppelin `AccessControl`
- `ReentrancyGuard` on every state-changing entrypoint that moves collateral
- `SafeERC20` on every transfer
- No upgradeable proxy, no admin backdoor — the attack surface is the surface
- Full NatSpec on the public API

Audit, timelock, multisig admin, incident-response — all documented in the case study as production concerns, not built into the demo.

## License

MIT.
