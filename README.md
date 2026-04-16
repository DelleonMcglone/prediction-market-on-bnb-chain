# Prediction Market Demo — BNB Chain

An LMSR-backed prediction market demo deployed to BNB Chain testnet. Accompanies **Igbo Labs Case Study № 007**.

**Status:** 🚧 under construction — Phase 01 scaffold.

**Live demo:** _TBD — Phase 08_
**Contract addresses:** _TBD — Phase 03 (see [`deployments/bnbTestnet.json`](deployments/))_

---

## What this is

A deployed, clickable proof-of-concept that shows three things:

1. **LMSR pricing works under low liquidity** — continuous, sensible prices from trade #1.
2. **The lifecycle is complete** — create, trade, resolve, claim.
3. **The UX is trustworthy** — Polymarket-tier polish, not hackathon-tier.

Full spec: [`docs/001-demo-mvp-prediction-market.md`](docs/001-demo-mvp-prediction-market.md).

## Stack

- **Contracts:** Foundry, Solidity 0.8.26, OpenZeppelin v5, PRBMath (LMSR fixed-point)
- **Frontend:** Next.js 15 (App Router), React 19, wagmi v2, viem, Reown AppKit, Tailwind, recharts
- **Chain:** BNB testnet (chain ID 97)

## Getting started

Requires Node ≥ 20, pnpm ≥ 10, Foundry ≥ 1.0.

```bash
# Clone and install
pnpm install

# Install Foundry libs (first time only)
cd contracts && forge install && cd ..

# Build contracts
pnpm contracts:build

# Run contract tests (once Phase 02 lands)
pnpm test:contracts

# Start the frontend dev server
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Next.js dev server |
| `pnpm build` | Production build of the frontend |
| `pnpm lint` | ESLint on the frontend |
| `pnpm typecheck` | TypeScript type-check |
| `pnpm contracts:build` | `forge build` |
| `pnpm contracts:fmt` | `forge fmt` |
| `pnpm test:contracts` | `forge test` |
| `pnpm test:frontend` | Frontend unit tests |
| `pnpm test` | All tests |
| `pnpm sync:abis` | Copy ABIs from `contracts/out/` into `frontend/lib/abis/` |

## Project layout

```
contracts/       Foundry project — smart contracts, tests, deploy scripts
frontend/        Next.js 15 app — UI, wallet, contract interaction
deployments/     Committed deployment artifacts (bnbTestnet.json)
docs/            Spec, architecture, phase-by-phase task docs
  001-demo-mvp-prediction-market.md   ← source of truth for scope
  architecture.md                     ← design decisions log
  tasks/                              ← per-phase implementation briefs
scripts/         Repo-level automation (abi sync, etc.)
.github/         CI workflows
```

## Getting testnet funds

_Once deployed (Phase 03+):_

- **tBNB for gas:** [BNB testnet faucet](https://www.bnbchain.org/en/testnet-faucet)
- **MockUSDC for trading:** Click "Get test funds" on the live demo — the in-app Dispenser drips 100 MockUSDC and a small amount of tBNB once per wallet.

## Documentation

- [Spec — 001](docs/001-demo-mvp-prediction-market.md) — scope, success criteria, edge cases
- [Architecture](docs/architecture.md) — design decisions log
- [Task docs](docs/tasks/README.md) — phase-by-phase implementation briefs

## License

MIT.
