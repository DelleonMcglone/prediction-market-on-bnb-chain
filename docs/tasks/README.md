# Implementation Task Docs

Phase-by-phase briefs for building the demo MVP. Each doc is self-contained: goal, prerequisites, deliverables, acceptance criteria, tests, and risks. Source of truth for scope is [`../001-demo-mvp-prediction-market.md`](../001-demo-mvp-prediction-market.md).

## Phases

| # | Doc | Closes with |
|---|-----|-------------|
| 01 | [Repo Setup](phase-01-repo-setup.md) | Monorepo scaffold, CI green on empty project |
| 02 | [Contracts (TDD)](phase-02-contracts.md) | All contracts + E2E Foundry test + deploy script |
| 03 | [Contract Deployment](phase-03-deployment.md) | Verified contracts on BNB testnet, 3 seeded markets |
| 04 | [Frontend Foundation](phase-04-frontend-foundation.md) | Next.js app shell connects wallet, reads chain |
| 05 | [Market Read Flow](phase-05-market-read-flow.md) | Homepage, market detail, portfolio all render real data |
| 06 | [Market Write Flow](phase-06-market-write-flow.md) | Buy, sell, claim, dispenser all work end-to-end |
| 07 | [Admin Panel](phase-07-admin-panel.md) | Role-gated `/admin` can create, pause, resolve, finalize |
| 08 | [Polish & Handoff](phase-08-polish-handoff.md) | Live URL, polished copy, README with faucet instructions |

## Workflow per phase

1. Read the task doc.
2. Write tests for the acceptance criteria (where applicable).
3. Implement until tests pass.
4. Commit with message referencing the phase number.
5. Update the phase doc with any decisions made mid-flight.
