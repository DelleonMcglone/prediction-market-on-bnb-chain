# Smoke-Test Checklist

Manual walkthrough to run before declaring the demo launch-ready. Designed for 3 people to run independently from fresh BNB testnet wallets. ~15 minutes per pass.

**Prerequisites per tester**
- Fresh BNB testnet wallet with ≥ 0.02 tBNB (from [QuickNode faucet](https://faucet.quicknode.com/binance-smart-chain/bnb-testnet))
- Browser in incognito / a fresh profile (no existing WalletConnect sessions)
- Production URL of the demo

---

## 1 · Cold landing

- [ ] Page loads in under 2 seconds on a cabled connection
- [ ] Testnet banner is visible at the top
- [ ] Three seeded market cards render with non-neutral prices (not all 50¢)
- [ ] Each card shows a status badge (Active / Paused / Resolved)
- [ ] Split bar under each price matches the displayed percent
- [ ] Footer shows the factory address linked to BscScan
- [ ] Clicking the factory address link opens a verified contract page on BscScan

## 2 · Navigation

- [ ] Clicking a market card navigates to `/market/[address]`
- [ ] "Back to all markets" link on the detail page works
- [ ] `/about` link in the header opens the About page
- [ ] `/portfolio` appears in the header once a wallet is connected
- [ ] `/admin` is hidden in the header unless the connected wallet has OPERATOR_ROLE

## 3 · Wallet connect (disconnected → connected)

- [ ] "Connect wallet" button opens the Reown modal
- [ ] MetaMask / WalletConnect / Coinbase options all appear
- [ ] Connecting from the correct chain (BNB testnet, 97) succeeds on the first try
- [ ] After connect, the header reflects the address
- [ ] Connecting from the wrong chain surfaces the "Switch to BNB testnet" card — clicking switches successfully

## 4 · Dispenser (first-time visitor)

- [ ] "Get test funds" in the testnet banner opens the Dispenser modal
- [ ] "Drip funds" submits a transaction and shows a pending toast
- [ ] On confirmation, 100 mUSDC and ~0.001 tBNB land in the wallet
- [ ] Trying to drip a second time from the same wallet shows "already claimed" with a link to QuickNode

## 5 · Market detail & trade preview

- [ ] Price display shows YES and NO percentages summing to ~100%
- [ ] Price chart renders with at least one data point for a seeded market
- [ ] Hovering the chart shows a tooltip with the timestamp + percent
- [ ] Recent trades list shows the seeded activity with BscScan links
- [ ] Market details sidebar shows b, fee, subsidy remaining, dispute window

## 6 · Buy flow (trader)

- [ ] Typing `5` in the shares field populates Cost / Fee / Total / Price after
- [ ] Selecting YES and NO updates the preview for each
- [ ] Switching to Sell tab changes the CTA and amount field
- [ ] First buy prompts "Approve USDC" — approving transacts and then the CTA flips to "Buy"
- [ ] Clicking Buy opens the wallet signing prompt
- [ ] After confirm: success toast appears with BscScan link
- [ ] Market detail updates within 10s (price shifts, new trade in Recent trades, chart extends)
- [ ] Rejecting the wallet prompt shows "Transaction cancelled" toast, not a raw error

## 7 · Sell flow (trader)

- [ ] Sell tab defaults to the outcome with a held balance (or shows 0 if neither)
- [ ] "max" link on the shares field populates the full balance
- [ ] Entering more shares than held disables the CTA with "Insufficient shares"
- [ ] Executing a sell completes and reduces the held balance

## 8 · Portfolio

- [ ] Open positions table shows every held outcome with correct side, shares, unrealized value
- [ ] Clicking a market row navigates to the detail page
- [ ] Resolved positions section appears after at least one market resolves
- [ ] Winning rows show "Won" + Claim button; losing rows show "Lost" + em-dash

## 9 · Admin (operator only)

- [ ] Connecting a non-operator wallet and navigating to `/admin` shows "Not authorized"
- [ ] Connecting an operator wallet shows the admin nav + overview
- [ ] Stat tiles: Markets, Active, Paused, Resolved reflect on-chain state
- [ ] Dispenser panel shows correct tBNB + mUSDC balances
- [ ] Recent-activity log shows MarketCreated events from the seed
- [ ] `/admin/create` form validation catches: empty question, 201-char question, subsidy < 50 or > 500, feeBps > 500, dispute window > 1440
- [ ] Mint → approve → create sequence works; the CTA label updates at each step
- [ ] New market appears on the homepage within 30s of creation
- [ ] `/admin/markets` table shows the new market with Pause / Submit outcome actions
- [ ] Pause disables the trade form on the public market detail page
- [ ] Unpause re-enables it
- [ ] Submit outcome opens the dialog with the full question visible
- [ ] Picking YES/NO starts the dispute window; status badge shows countdown
- [ ] After the window closes, the status changes to "Ready to finalize"
- [ ] Clicking Finalize confirms the market; trading is permanently blocked
- [ ] Winners can now Claim from `/portfolio`

## 10 · Claim flow

- [ ] Winning row shows the exact claimable amount in USDC
- [ ] Clicking Claim signs a single transaction
- [ ] After confirm: row changes to "Claimed ✓", payout added to wallet
- [ ] Losing row shows "—" and no button
- [ ] A wallet that held both sides claims only the winning side

## 11 · Error surfaces

- [ ] Buying when the USDC balance is 0 shows "Get test funds" CTA, not a revert
- [ ] Buying with slippage too tight surfaces the decoded `SlippageExceeded` message, not a hex error
- [ ] Submitting an outcome twice shows "already been proposed"
- [ ] Finalizing during the dispute window shows the countdown in the error

## 12 · Cross-cutting polish

- [ ] Every BscScan link opens the correct page and the contract is verified
- [ ] No hydration warnings in the browser console
- [ ] No unhandled errors in the browser console
- [ ] OG image renders correctly when pasted into Slack / Twitter preview
- [ ] `/sitemap.xml` and `/robots.txt` resolve
- [ ] Lighthouse mobile: Performance ≥ 80, Accessibility ≥ 90, Best Practices ≥ 90, SEO ≥ 90
- [ ] Axe DevTools scan: no critical or serious violations on `/`, `/market/[addr]`, `/portfolio`, `/admin`

## 13 · Mobile sanity

- [ ] Homepage market grid collapses to 1 column
- [ ] Market detail page's two-column layout stacks
- [ ] Trade form is reachable and usable with a mobile keyboard
- [ ] Toast stack doesn't overflow the viewport

---

## Sign-off

| Tester | Date | Pass? | Notes |
|--------|------|-------|-------|
| | | | |
| | | | |
| | | | |

Three passes required before the demo is declared ready.
