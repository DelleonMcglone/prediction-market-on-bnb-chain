# Phase 07 · Admin Panel

**Goal:** An operator wallet can create markets, pause/unpause, submit outcomes, and finalize — all from `/admin`. Non-operator wallets see a 404-style "not authorized" page.

## Prerequisites

- Phase 06 complete — the public flows work and the operator has something to manage.
- `OPERATOR_ROLE` granted to the deployer wallet (from Phase 03).

## Deliverables

### Route guard

- **`app/admin/layout.tsx`** — Client component. Uses `useIsOperator()`. While loading → skeleton. If not operator → "Not authorized" page with a link home. If operator → renders children.
- The guard is cosmetic; the real enforcement is on-chain. Non-operator calls to factory/resolution revert. This is documented in copy so visitors understand.

### Pages

#### `app/admin/page.tsx` — Overview

- Stats row: total markets, active markets, paused markets, resolved markets, Dispenser balance (USDC + tBNB).
- Quick actions: "Create market", "Fund Dispenser", "Withdraw from Dispenser".
- Recent operator actions log (sourced from `MarketCreated`, `Paused`, `OutcomeSubmitted`, `Finalized` events).

#### `app/admin/markets/page.tsx` — Market management table

Columns:
- Question (truncated, link to public `/market/[address]`).
- Status badge (Active / Paused / Proposed / Finalized).
- YES price.
- Subsidy remaining / total.
- Actions column:
  - Active → **Pause**, **Submit outcome**.
  - Paused → **Unpause**.
  - Proposed (outcome submitted, dispute window ticking) → Shows countdown; **Finalize** button active once countdown hits 0.
  - Finalized → no actions; "Resolved as YES/NO".

#### `app/admin/create/page.tsx` — Create market form

Fields:
- **Question** (required, 3-200 chars).
- **Subsidy amount** (in USDC, min 50, max 500 per spec).
- **Trading fee** (bps, default 100 = 1%, range 0-500).
- **Liquidity parameter `b`** (display only — fixed at 100e18 per spec; show as read-only with a tooltip).
- **Dispute window** (minutes, default 2, range 1-1440).

Submit flow:
1. Validate inputs client-side.
2. Check operator has enough MockUSDC; if not, "Mint USDC" button → `MockUSDC.mint(operator, subsidy)`.
3. Check factory allowance; if insufficient, approve.
4. Call `MarketFactory.createMarket(...)`.
5. On success: toast with link to the new market's public page, refresh the admin market list.

#### Submit outcome modal

- Triggered from the markets table "Submit outcome" action.
- Radio: YES / NO.
- Warning copy: "This starts the {disputeWindow}-minute dispute window. Cannot be undone unless there's a challenge mechanism (not in this demo)."
- Confirm → `Resolution.submitOutcome(market, outcomeIndex)`.

#### Dispenser management

- On `app/admin/page.tsx` (or a `/admin/dispenser` subroute):
  - Current USDC balance + tBNB balance of Dispenser.
  - "Fund USDC" — mint and transfer.
  - "Fund tBNB" — send tBNB from operator wallet.
  - "Withdraw leftover" — pull everything back.
  - Number of unique wallets served (read from `Dripped` events).

### Components

- **`AdminStatsCard.tsx`**
- **`MarketRowActions.tsx`** — Dropdown of context-appropriate actions.
- **`CreateMarketForm.tsx`** — With zod validation.
- **`SubmitOutcomeDialog.tsx`**
- **`DispenserPanel.tsx`**

### Events log

- **`hooks/useOperatorEventLog.ts`** — Subscribes to operator-relevant events across factory + resolution + dispenser. Returns a chronological feed. Used in the admin overview.

## Acceptance criteria

- [ ] Connecting a non-operator wallet to `/admin/*` shows "Not authorized" for every page.
- [ ] Operator can create a new market end-to-end; it appears on the homepage within 10s.
- [ ] Operator can pause a market; public detail page reflects paused state and disables trading.
- [ ] Operator can submit an outcome; the market's public page shows dispute countdown.
- [ ] After dispute window, Finalize succeeds; public portfolio shows Claim buttons for winners.
- [ ] Double-submission of outcome reverts with a clear error.
- [ ] Dispenser withdraw transfers remaining funds back to the operator.
- [ ] Operator action log reflects the last 20 admin events with timestamps.

## Tests

- **Component tests:**
  - `CreateMarketForm` validation: rejects empty question, rejects subsidy > 500, rejects dispute window > 1440.
  - `MarketRowActions` shows correct actions for each status.
- **Integration (Anvil fork):**
  - Non-operator address → `/admin` renders "Not authorized".
  - Operator creates a market → shows up in `useMarkets()`.
  - Pause → public `/market/[addr]` disables trade form.
  - Submit outcome → finalize after time warp → claim works.

## Risks / gotchas

- **Dispute window countdown precision:** relies on `block.timestamp`. Poll every 2-3s. Don't let the UI show "Finalize" before the chain allows it — check the tx simulation first.
- **Accidental destructive actions:** Pause, Submit Outcome, Withdraw Dispenser all need confirmation dialogs with the action summarized.
- **Operator dev vs prod keys:** For the demo, operator is the same wallet as deployer. Document this clearly in the case study — production would use a multisig.
- **Role revocation:** No UI for granting/revoking roles in the demo. Out of scope. If needed, use `cast send`.
- **Event log pagination:** Querying all historical events on every page load is slow. Cap at last 500 blocks or use block ranges.

## Decisions recorded

- **Single operator wallet** — same as deployer. Multi-operator is explicitly out of scope; would require a grant/revoke UI.
- **No upgradability, no timelock** — admin actions are immediate. Trade-off accepted for demo clarity; production concern documented in case study.
- **Client-side guard is cosmetic** — the chain is the authority. Copy on the Not Authorized page says so.

## Exit criteria

Commit `feat: phase 07 admin panel`. Operator can run a full market lifecycle without leaving `/admin`. Move to Phase 08.
