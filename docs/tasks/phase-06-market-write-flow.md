# Phase 06 · Market Write Flow

**Goal:** A visitor can buy, sell, claim, and tap the Dispenser for test funds — all from the UI, with previews, optimistic updates, toasts, and explorer links. This is the phase that makes the demo feel real.

## Prerequisites

- Phase 05 complete — read hooks and layout stable.
- Phase 03 — Dispenser funded on testnet.

## Deliverables

### Hooks

- **`useBuyPreview(market, outcome, shareAmount)`** — Calls `LMSRPricing` via a read-only simulation on `Market.previewBuy(outcome, shareAmount)` (add this view function in Phase 02 if missing — update `contracts/src/Market.sol` and re-deploy if needed). Returns `{ cost, fee, averagePrice, priceAfter, impact }`.
- **`useSellPreview(market, outcome, shareAmount)`** — Mirror for `previewSell`.
- **`useBuy()` / `useSell()` / `useClaim()`** — Each returns a wagmi `writeContract` mutation with:
  - Approval handling (buy only): checks `allowance`, if insufficient triggers `MockUSDC.approve` first.
  - `onMutate`: show pending toast.
  - `onSuccess`: show confirmation toast with BscScan link, invalidate `useMarketData`, `useMarketHistory`, `usePortfolio`.
  - `onError`: show error toast with decoded revert reason.
- **`useDispenser()`** — Calls `Dispenser.drip()`. Shows onboarding toast sequence.

### New/updated contract view functions (Phase 02 revision)

If not already present, add to `Market.sol`:

- `previewBuy(uint8 outcome, uint256 shareAmount) → (uint256 cost, uint256 fee, uint256 priceAfter)` — pure/view.
- `previewSell(uint8 outcome, uint256 shareAmount) → (uint256 payout, uint256 fee, uint256 priceAfter)`.

If these need to be added, this phase opens with a mini Phase 02.5: update contract, re-test, re-deploy, re-sync ABIs, update addresses. Track in a sub-checklist.

### UI components

#### Trade form (on `app/market/[address]/page.tsx`)

- **Tab toggle:** Buy | Sell.
- **Outcome picker:** two big buttons — YES (green) / NO (red). Selected state clear.
- **Amount input:**
  - On Buy: input in USDC, small toggle "Shares mode" for power users. Show resulting share count.
  - On Sell: input in shares held; max button sets to full balance.
- **Preview panel:**
  - Cost (buy) / Payout (sell).
  - Fee breakdown.
  - Average price.
  - "Price after" indicator.
  - Price impact warning if > 5% (yellow tint).
- **Primary button states:**
  1. "Connect wallet" (disconnected).
  2. "Get test funds" (connected but 0 USDC balance) → triggers Dispenser flow.
  3. "Approve USDC" (buy, insufficient allowance).
  4. "Buy YES for $X" / "Sell X shares for $Y".
  5. "Submitting…" (pending).
  6. "Market paused" / "Market resolved" / "Subsidy exhausted" (disabled with explanation).
- **Slippage handling:** `maxCost` / `minPayout` computed as `preview ± 2%` with a settings gear to change tolerance.

#### Claim flow (on `app/portfolio/page.tsx`)

- Each resolved winning position row shows a **Claim** button.
- Click → single `Resolution.claim(market)` txn. After confirmation, row updates to "Claimed ✓" with tx link.
- If dispute window active → button disabled with "Claimable in Xm Ys" countdown.
- If losing outcome → no button, show "Position expired" text.

#### Dispenser "Get test funds" flow

- Triggered from:
  - Testnet banner on homepage.
  - Trade form when USDC balance is 0.
  - Empty-state CTA on portfolio.
- Modal sequence:
  1. "We'll send you ~100 test USDC and a tiny bit of tBNB for gas. This works once per wallet."
  2. User clicks "Drip" → `Dispenser.drip()` txn.
  3. On success: "Funds received. You can now trade on any market."
- Detects already-served state and shows a friendly "You've already received funds" message with the external BNB faucet link as a fallback.

### Toasts and confirmations

- **Pending:** "Transaction submitted…" with spinner and tx hash (truncated, clickable).
- **Success:** "Bought 42.3 YES shares for $21.50" with View on BscScan link. Auto-dismiss after 8s.
- **Error:** "Transaction failed: {decoded reason}" — persistent until dismissed.

### Error decoding

- **`frontend/lib/decodeError.ts`** — Map of custom error selectors → user-friendly strings. Fallback to viem's `decodeErrorResult` then to raw message.
- Common cases: `SubsidyExhausted`, `Paused`, `InsufficientAllowance`, `MinPayoutNotMet`, `DisputeWindowActive`, `AlreadyClaimed`.

## Acceptance criteria

- [ ] A fresh wallet with 0 balance can: connect → Dispenser → buy YES → see price update → sell half → see price update → all without reloading.
- [ ] A wallet holding winning shares in a finalized market can claim in one click.
- [ ] Buying when `subsidyRemaining < cost` shows "Market capacity reached" and does not submit.
- [ ] Buying on a paused market disables the button with clear messaging.
- [ ] Approvals happen exactly once per market per wallet — subsequent buys skip the approval step.
- [ ] Price chart on detail page updates within 5s of a confirmed trade (invalidation working).
- [ ] Portfolio updates within 5s of a confirmed trade.
- [ ] All txn confirmations show a working BscScan link.
- [ ] All reverts surface user-friendly messages; no raw hex error strings visible.
- [ ] Slippage setting persists across navigations (localStorage).

## Tests

- **Component tests:**
  - Trade form disabled states for each condition.
  - Preview panel shows correct math given mock preview values.
  - Claim button conditional logic across all position states.
- **Integration (Anvil fork):**
  - Full buy flow: approve → buy → state update → portfolio reflects.
  - Full sell flow.
  - Dispenser flow: drip → buy using dripped funds.
  - Full claim flow: resolve market → warp past dispute → claim → balance increases.
- **Manual smoke test checklist:** Committed as `docs/smoke-test.md` — 15 steps covering every user-facing interaction on testnet.

## Risks / gotchas

- **Preview accuracy:** Simulated preview vs actual txn can drift if another trader slips in between. That's what `maxCost`/`minPayout` protect. Test the drift explicitly.
- **Approval UX:** First-time users approving an unfamiliar token in their wallet is a friction point. Consider max approval (infinite) vs per-transaction — recommend infinite with clear copy ("This is testnet USDC").
- **Dispenser race condition:** Two tabs clicking drip simultaneously → one reverts. Handle gracefully.
- **Wagmi + BigInt in forms:** Use viem's `parseUnits` / `formatUnits` consistently. Never do arithmetic on `Number` for on-chain amounts.
- **Dispute window UX:** The 2-minute window is short. Countdown must tick every second. Use `useEffect` with interval or `useBlockNumber`.
- **Optimistic updates vs reorgs:** BSC has fast finality (~3s); optimistic UI with invalidate-on-confirm is safe. Don't persist optimistic state.

## Decisions recorded

- **Approval strategy:** infinite approval per market, with clear "This is testnet USDC" copy in the Reown signing modal.
- **Slippage default:** 2%. User-adjustable via gear icon on the trade form.
- **Preview latency:** debounced 250ms on amount input change.

## Exit criteria

Commit `feat: phase 06 market write flow`. A stranger can land on the demo URL, drip funds, trade, and claim — all without help. Move to Phase 07.
