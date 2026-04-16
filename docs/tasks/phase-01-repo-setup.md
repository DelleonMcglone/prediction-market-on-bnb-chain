# Phase 01 · Repo Setup

**Goal:** A monorepo skeleton that future phases can drop code into without touching scaffolding.

## Prerequisites

None. This is the first phase.

## Deliverables

### Directory structure

```
/
├── .github/workflows/ci.yml
├── .gitignore
├── README.md
├── package.json              # root — pnpm workspaces or npm workspaces
├── contracts/
│   ├── foundry.toml
│   ├── remappings.txt
│   ├── src/                  # (empty — Phase 02)
│   ├── test/                 # (empty — Phase 02)
│   ├── script/               # (empty — Phase 02)
│   └── lib/                  # forge install targets
├── frontend/
│   ├── package.json          # Next.js 15, React 19, Tailwind, wagmi, viem, reown
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.mjs
│   └── app/                  # minimal placeholder page — Phase 04 fleshes it out
├── deployments/
│   └── .gitkeep              # bnbTestnet.json lands here in Phase 03
└── docs/
    ├── 001-demo-mvp-prediction-market.md
    ├── architecture.md       # scaffold per this phase
    ├── contracts.md          # scaffold; populated in Phase 02
    └── tasks/                # this directory
```

### Files to author

- **`README.md`** — Project title, one-paragraph pitch, "one-command setup" section (`pnpm install && pnpm dev`), links to case study PDF placeholder and to `docs/001-demo-mvp-prediction-market.md`. Placeholder for live URL and contract addresses.
- **`package.json` (root)** — Workspace config, pinned versions. Scripts: `dev`, `build`, `test`, `lint`, `typecheck`. Node 20+.
- **`.gitignore`** — `node_modules`, `.next`, `out`, `cache`, `broadcast`, `.env`, `.env.local`, `foundry.out` equivalents, editor files.
- **`contracts/foundry.toml`** — Solidity 0.8.26, optimizer 200 runs, via-IR on, verbosity defaults, `fs_permissions` for deployment artifact writes.
- **`contracts/remappings.txt`** — OZ + forge-std + solmate paths.
- **`frontend/package.json`** — Pinned: `next@15`, `react@19`, `wagmi@^2`, `viem@^2`, `@reown/appkit`, `@reown/appkit-adapter-wagmi`, `@tanstack/react-query`, `tailwindcss@^4`, `recharts`.
- **`docs/architecture.md`** — Scaffolded with three sections: Contracts, Frontend, Deployment. Each references the spec. Fill detail in later phases.
- **`.github/workflows/ci.yml`** — Two jobs: `contracts` (forge fmt --check, forge build, forge test) and `frontend` (install, typecheck, lint, build). Runs on every push and PR.

## Acceptance criteria

- [ ] `pnpm install` at root installs both workspaces without errors.
- [ ] `cd contracts && forge build` succeeds (no source files yet — just lib imports compile).
- [ ] `cd frontend && pnpm dev` starts Next.js and serves a placeholder page on `localhost:3000`.
- [ ] `cd frontend && pnpm typecheck && pnpm lint && pnpm build` all pass.
- [ ] CI pipeline runs green on a push to `main` with no code changes beyond this phase.
- [ ] `README.md` has a "Getting started" section that works on a fresh checkout.

## Tests

No unit tests yet — the artifact is the scaffolding itself. CI green on the empty project is the test.

## Risks / gotchas

- **Solidity version pin:** 0.8.26 matches OZ v5 and solmate. Lock this early.
- **Reown + wagmi compatibility:** Reown AppKit v1+ requires wagmi v2. Pin exact minors.
- **Next.js 15 + React 19:** App Router only. Some older wagmi hook patterns need `'use client'` — noted for Phase 04.
- **Workspace protocol:** Use `pnpm` (workspaces via `pnpm-workspace.yaml`) or npm 10+ workspaces. Don't mix.
- **BSC testnet chain ID is 97.** Hardcode in one config file only.

## Decisions recorded

- **Package manager:** pnpm (faster installs, cleaner workspace handling).
- **Solidity:** 0.8.26.
- **Node:** 20 LTS.

## Exit criteria

Commit message: `chore: phase 01 repo scaffold`. Push. CI green. Move to Phase 02.
