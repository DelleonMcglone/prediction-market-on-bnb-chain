# Contracts Reference

Per-contract API reference for the deployed system. Addresses are populated after the Phase 03 testnet deploy — until then, fields show `<TBD>`.

**Network:** BNB testnet (chain ID 97)
**Deployment artifact:** [`../deployments/bnbTestnet.json`](../deployments/bnbTestnet.json)

---

## Address index

| Contract | Address | BscScan |
|----------|---------|---------|
| MockUSDC | `<TBD>` | `<TBD>` |
| Shares | `<TBD>` | `<TBD>` |
| Resolution | `<TBD>` | `<TBD>` |
| MarketFactory | `<TBD>` | `<TBD>` |
| Dispenser | `<TBD>` | `<TBD>` |
| Seeded market #1 — "Will the demo market #1 be resolved YES?" | `<TBD>` | `<TBD>` |
| Seeded market #2 — "Will this market have more than 20 trades in its first 100 blocks?" | `<TBD>` | `<TBD>` |
| Seeded market #3 — "Will the next block mined on BSC testnet have an even block number?" | `<TBD>` | `<TBD>` |

---

## MockUSDC

6-decimal ERC20 used as the demo's collateral token. Anyone can mint any amount — **testnet only**.

**Address:** `<TBD>` · [BscScan](#)
**Source:** [`contracts/src/MockUSDC.sol`](../contracts/src/MockUSDC.sol)

### Interface

| Function | Type | Purpose |
|----------|------|---------|
| `mint(address to, uint256 amount)` | external | Mint tokens to `to`. No access control. |
| `decimals()` | pure view | Returns `6`. |

Standard ERC20 functions inherited from OpenZeppelin: `transfer`, `transferFrom`, `approve`, `allowance`, `balanceOf`, `totalSupply`, `name`, `symbol`.

### Notes
- Metadata: name = `"Mock USD Coin"`, symbol = `"mUSDC"`.
- **Not deployed to mainnet. Never will be.**

---

## Shares

ERC-1155 position token. Token IDs encode `(marketAddress, outcome)` so that each Market can only mint / burn its own IDs.

**Address:** `<TBD>` · [BscScan](#)
**Source:** [`contracts/src/Shares.sol`](../contracts/src/Shares.sol)

### Token ID encoding

```
id = (uint256(marketAddress) << 1) | outcome     // outcome ∈ {0 (NO), 1 (YES)}
```

### Interface

| Function | Type | Purpose |
|----------|------|---------|
| `idFor(address market, uint8 outcome) → uint256` | pure | Compute token ID. |
| `marketFromId(uint256 id) → address` | pure | Extract market address. |
| `outcomeFromId(uint256 id) → uint8` | pure | Extract outcome. |
| `mint(address to, uint8 outcome, uint256 amount)` | external | Mint shares for `msg.sender`'s market. |
| `burn(address from, uint8 outcome, uint256 amount)` | external | Burn shares for `msg.sender`'s market. |

### Errors
- `InvalidOutcome()` — outcome > 1.

### Notes
- Mint and burn derive the token ID from `msg.sender`. Only the market contract at that address can mint or burn its own IDs — no separate registry is needed.

---

## Resolution

Per-market outcome submission, dispute window, finalization, and claim routing.

**Address:** `<TBD>` · [BscScan](#)
**Source:** [`contracts/src/Resolution.sol`](../contracts/src/Resolution.sol)

### Roles

| Role | Granted to | Rights |
|------|------------|--------|
| `DEFAULT_ADMIN_ROLE` | deployer | Grant/revoke `OPERATOR_ROLE`. |
| `OPERATOR_ROLE` | deployer | Submit outcomes. |

### Status enum

```
0 Unresolved    — no outcome proposed
1 Proposed      — outcome submitted, dispute window running
2 Finalized     — window elapsed and finalize() called; claims enabled
```

### Interface

| Function | Type | Auth | Purpose |
|----------|------|------|---------|
| `submitOutcome(address market, uint8 outcome)` | external | `OPERATOR_ROLE` | Start dispute window. |
| `finalize(address market)` | external | anyone | Finalize after window elapses; calls `market.setResolved`. |
| `claim(address market) → uint256 payout` | external nonReentrant | anyone | Burn winning shares and collect payout via `market.handleClaim`. |
| `isResolved(address market) → bool` | view | — | True iff status == Finalized. |
| `outcomeOf(address market) → uint8` | view | — | Proposed (or finalized) winning outcome. |
| `disputeEndsAt(address market) → uint256` | view | — | Timestamp when dispute window ends. |
| `statusOf(address market) → Status` | view | — | Current resolution status. |
| `resolutionOf(address market)` | view | — | Full struct. |

### Errors
- `InvalidOutcome()`, `AlreadyProposed()`, `NotProposed()`, `DisputeWindowActive(uint256 endsAt)`, `AlreadyFinalized()`.

### Events
- `OutcomeSubmitted(address market, uint8 outcome, uint64 disputeEndsAt)`
- `Finalized(address market, uint8 outcome)`
- `Claimed(address market, address holder, uint256 payout)`

---

## MarketFactory

Deploys Market instances and maintains a registry.

**Address:** `<TBD>` · [BscScan](#)
**Source:** [`contracts/src/MarketFactory.sol`](../contracts/src/MarketFactory.sol)

### Roles

| Role | Granted to | Rights |
|------|------------|--------|
| `DEFAULT_ADMIN_ROLE` | deployer | Grant/revoke `OPERATOR_ROLE`. |
| `OPERATOR_ROLE` | deployer | Create markets. |

### Immutables

| Field | Type | Purpose |
|-------|------|---------|
| `collateral` | `IERC20` | Collateral token (MockUSDC). |
| `shares` | `Shares` | Shared ERC-1155. |
| `resolution` | `address` | Resolution contract. |

### Interface

| Function | Type | Auth | Purpose |
|----------|------|------|---------|
| `createMarket(string question, uint256 b, uint256 subsidy, uint256 feeBps, uint256 disputeWindow) → address` | external | `OPERATOR_ROLE` | Deploy a new market; pulls `subsidy` collateral from caller. |
| `markets() → address[]` | view | — | All markets created, in order. |
| `marketCount() → uint256` | view | — | Length of registry. |
| `marketAt(uint256 index) → address` | view | — | Lookup by index. |

### Events
- `MarketCreated(address market, address operator, string question, uint256 b, uint256 subsidy, uint256 feeBps, uint256 disputeWindow)`

### Subsidy flow
The operator must approve the factory for at least `subsidy` collateral before calling `createMarket`. The factory deploys the market, then transfers the subsidy directly from the operator to the new market address.

---

## Market

Single binary prediction market priced by LMSR. One instance per market, deployed by `MarketFactory`.

**Addresses:** see [Address index](#address-index) above for the three seeded markets.
**Source:** [`contracts/src/Market.sol`](../contracts/src/Market.sol)

### Decimals

- **Collateral:** 6-decimal (MockUSDC).
- **Shares:** 18-decimal (internal fixed-point; bridged to 6-decimal collateral at the boundary).

### Immutables

| Field | Type | Value / Meaning |
|-------|------|-----------------|
| `collateral` | `IERC20` | Collateral token. |
| `shares` | `Shares` | Shared ERC-1155. |
| `operator` | `address` | Pause/unpause authority. |
| `resolution` | `address` | Resolution contract. |
| `b` | `uint256` | Liquidity parameter, 18-decimal. Seeded markets use 100e18. |
| `feeBps` | `uint256` | Trading fee. Seeded markets use 100 (= 1%). |
| `subsidyBudget` | `uint256` | Operator's initial subsidy deposit, 6-decimal. Seeded markets use 500e6. |
| `disputeWindow` | `uint256` | Dispute window in seconds. Seeded markets use 120 (2 minutes). |
| `question` | `string` | Market question. |

### Interface

| Function | Type | Auth | Purpose |
|----------|------|------|---------|
| `buy(uint8 outcome, uint256 shareAmount, uint256 maxCost) → uint256` | external nonReentrant | anyone (when active) | Buy shares. Reverts on slippage. |
| `sell(uint8 outcome, uint256 shareAmount, uint256 minPayout) → uint256` | external nonReentrant | anyone (when active) | Sell shares. |
| `previewBuy(uint8 outcome, uint256 shareAmount) → (uint256 cost, uint256 fee, int256 priceAfter)` | view | — | Simulate a buy. |
| `previewSell(uint8 outcome, uint256 shareAmount) → (uint256 payout, uint256 fee, int256 priceAfter)` | view | — | Simulate a sell. |
| `priceOf(uint8 outcome) → int256` | view | — | Instantaneous price, 18-decimal. |
| `pause()` | external | operator | Block trading. |
| `unpause()` | external | operator | Resume trading. |
| `setResolved(uint8 outcome)` | external | resolution | Mark market resolved. |
| `handleClaim(address holder) → uint256` | external nonReentrant | resolution | Burn holder's winning shares and transfer collateral. |

### State

| Field | Type | Purpose |
|-------|------|---------|
| `qNo`, `qYes` | `int256` | Outstanding shares, 18-decimal. |
| `collateralBalance` | `uint256` | Collateral held, 6-decimal. |
| `paused` | `bool` | Operator-controlled pause flag. |
| `resolved` | `bool` | Set once by Resolution. |
| `winningOutcome` | `uint8` | Valid only if `resolved == true`. |

### Errors
- `InvalidOutcome`, `AmountZero`, `NotActive`, `AlreadyResolved`, `NotOperator`, `NotResolution`
- `SlippageExceeded(uint256 cost, uint256 maxCost)`
- `PayoutTooLow(uint256 payout, uint256 minPayout)`
- `SubsidyExhausted(uint256 required, uint256 available)` — safety net; practically unreachable for LMSR with subsidy ≥ b·ln(2).

### Events
- `Bought(address trader, uint8 outcome, uint256 shareAmount, uint256 cost, uint256 fee)`
- `Sold(address trader, uint8 outcome, uint256 shareAmount, uint256 payout, uint256 fee)`
- `Paused()`, `Unpaused()`
- `Resolved(uint8 winningOutcome)`
- `Claimed(address holder, uint256 payout)`

---

## Dispenser

One-shot MockUSDC + tBNB drip for fresh visitor wallets.

**Address:** `<TBD>` · [BscScan](#)
**Source:** [`contracts/src/Dispenser.sol`](../contracts/src/Dispenser.sol)

### Roles

| Role | Granted to | Rights |
|------|------------|--------|
| `DEFAULT_ADMIN_ROLE` | deployer | `withdraw` remaining funds. |

### Immutables

| Field | Value |
|-------|-------|
| `usdc` | MockUSDC address |
| `usdcDripAmount` | `100 * 1e6` (100 USDC) |
| `bnbDripAmount` | `0.01 ether` |

### Interface

| Function | Type | Auth | Purpose |
|----------|------|------|---------|
| `drip()` | external nonReentrant | anyone, once per address | Send caller `usdcDripAmount` MockUSDC + `bnbDripAmount` tBNB. |
| `withdraw(address to)` | external | `DEFAULT_ADMIN_ROLE` | Drain remaining MockUSDC + tBNB to `to`. |
| `refillable() → (uint256 usdcAvailable, uint256 bnbAvailable)` | view | — | USDC is minted on demand; BNB tracks reserve. |
| `served(address) → bool` | view | — | Whether an address has already dripped. |

### Events
- `Dripped(address recipient, uint256 usdcAmount, uint256 bnbAmount)`
- `Withdrawn(address to, uint256 usdcAmount, uint256 bnbAmount)`

### Errors
- `AlreadyServed`, `InsufficientReserves`, `TransferFailed`.

---

## Deploy sequence

1. `MockUSDC()` — no args.
2. `Shares()` — no args.
3. `Resolution(admin)` — admin = deployer.
4. `MarketFactory(collateral, shares, resolution, admin)`.
5. `Dispenser(usdc, usdcDripAmount, bnbDripAmount, admin)`.

Then:
6. `SeedMarkets` script creates the 3 demo markets.
7. `FundDispenser` script sends 1 tBNB to the Dispenser.

See [`../docs/deploy-runbook.md`](deploy-runbook.md) for the full procedure.
