# Phase 02 · Contracts (TDD)

**Goal:** All seven contracts implemented, fully tested, with a deploy script that writes addresses to `deployments/bnbTestnet.json`. LMSR pricing is correct to the cent.

## Prerequisites

- Phase 01 complete (Foundry scaffold, remappings, CI).
- OpenZeppelin contracts v5.x installed via `forge install`.
- `solmate` or `prb-math` installed for fixed-point math (`PRBMathSD59x18` preferred for LMSR's `exp`/`ln`).

## Deliverables

### Contracts (under `contracts/src/`)

#### `MockUSDC.sol`
- ERC20, 6 decimals (matches real USDC).
- Public `mint(address to, uint256 amount)` — no access control, unlimited. *Demo-only.*
- Comment at the top: "TESTNET ONLY. DO NOT DEPLOY TO MAINNET."

#### `Shares.sol`
- ERC-1155 (OZ). Position tokens for all markets.
- Token ID encoding: `uint256 id = (uint256(marketAddress) << 1) | outcomeIndex` where `outcomeIndex ∈ {0, 1}` (NO, YES).
- `mint` and `burn` restricted to the `Market` contract that owns the market side of the ID (enforced via a `marketOf(id)` mapping set by the factory).
- Helper `idFor(address market, uint8 outcome) → uint256`.

#### `LMSRPricing.sol` (library)
- Pure functions only. No state.
- `cost(int256 qYes, int256 qNo, int256 b) → int256` — LMSR cost function: `b * ln(exp(qYes/b) + exp(qNo/b))`.
- `price(int256 qYes, int256 qNo, int256 b, uint8 outcome) → int256` — instantaneous price of outcome, in 18-decimal fixed point, always in `[0, 1e18]`.
- `deltaCost(int256 qYes, int256 qNo, int256 dYes, int256 dNo, int256 b) → int256` — cost of a trade that changes quantities by `(dYes, dNo)`.
- Use `PRBMathSD59x18` for `exp` and `ln`. Document overflow bounds: trades that would push `q/b > ~130` must revert (handled at `Market` level).

#### `Market.sol`
- One per market. Created by `MarketFactory`. Constructor params: `question` (string), `shares` (ERC-1155 ref), `collateral` (IERC20 ref), `b` (int256), `subsidy` (uint256), `fee` (uint256, basis points), `resolution` (Resolution ref), `operator` (address).
- State: `int256 qYes`, `int256 qNo`, `uint256 collateralBalance`, `uint256 subsidyRemaining`, `bool paused`, `ResolutionState` (unresolved / proposed / finalized).
- Entrypoints:
  - `buy(uint8 outcome, uint256 shareAmount, uint256 maxCost) → uint256 costPaid` — transfers collateral in (`SafeERC20`), mints shares, takes fee, reverts if cost > `maxCost` or subsidy exhausted.
  - `sell(uint8 outcome, uint256 shareAmount, uint256 minPayout) → uint256 payoutReceived` — burns shares, transfers collateral out, takes fee.
  - `pause()` — `OPERATOR_ROLE` only. Blocks buy/sell until unpause.
  - `unpause()` — `OPERATOR_ROLE` only.
- Guards: `ReentrancyGuard` on all state-changing entrypoints. `whenNotPaused` modifier.
- Events: `Bought`, `Sold`, `Paused`, `Unpaused`.

#### `MarketFactory.sol`
- `createMarket(string question, uint256 b, uint256 subsidy, uint256 fee, uint256 disputeWindow) → address market`. `OPERATOR_ROLE` only.
- Deploys new `Market`, registers it, funds subsidy from operator (pulls collateral via `SafeERC20`).
- `markets() → address[]` — returns all created markets.
- Events: `MarketCreated(address market, string question)`.

#### `Resolution.sol`
- Called by `Market` or operator. Per-market state.
- `submitOutcome(address market, uint8 winningOutcome)` — `OPERATOR_ROLE`. Starts the dispute window. Revert if already submitted.
- `finalize(address market)` — anyone can call after dispute window elapses. Marks market as `Finalized`. Sets the winning outcome.
- `claim(address market)` — holder burns winning shares, receives collateral 1:1 (share count == payout in collateral units). Reverts during dispute window, reverts if already claimed for that holder's shares.
- `isResolved(address market) → bool`, `outcomeOf(address market) → uint8`, `disputeEndsAt(address market) → uint256`.
- `ReentrancyGuard` on `claim`.

#### `Dispenser.sol`
- Holds a MockUSDC allowance (or balance) and a tBNB balance.
- `drip()` — external. Sends caller `100 * 1e6` MockUSDC and `0.01 ether` tBNB. Once per address (tracked in a `mapping(address => bool) served`).
- `refillable()` — view, returns `(usdcAvailable, bnbAvailable)`.
- `withdraw(address to)` — `DEFAULT_ADMIN_ROLE` only. Lets operator reclaim leftover funds.
- Events: `Dripped(address recipient)`.

### Tests (under `contracts/test/`)

- **`MockUSDC.t.sol`** — mint, transfer, decimals.
- **`Shares.t.sol`** — id encoding roundtrip, mint/burn only from registered market, cross-market id collisions impossible.
- **`LMSRPricing.t.sol`** — price sums to 1e18, cost is monotonic in q, delta cost matches `cost(after) - cost(before)`, known fixtures from a Python reference implementation.
- **`Market.t.sol`** — buy/sell roundtrip, fee accounting, pause blocks trades, subsidy cap, reentrancy attempt reverts.
- **`Market.invariant.t.sol`** — invariants: `qYes ≥ 0`, `qNo ≥ 0`, `collateralBalance ≥ subsidyRemaining`, `price(yes) + price(no) == 1e18 ± rounding`.
- **`Market.fuzz.t.sol`** — fuzz `buy(outcome, amount)` sequences; verify no revert outside expected bounds; verify prices stay in `[0, 1e18]`.
- **`MarketFactory.t.sol`** — only operator can create, subsidy is actually pulled, registry grows.
- **`Resolution.t.sol`** — submit → wait → finalize → claim happy path, claim before finalize reverts, double-claim reverts, non-operator submit reverts.
- **`Dispenser.t.sol`** — first drip succeeds, second from same address reverts, balances decrement, admin can withdraw.
- **`E2E.t.sol`** — create market → seed → 10 trades from 3 wallets → submit outcome → warp past dispute → finalize → winning wallets claim → losing wallets cannot claim. Assert total payout == subsidy + winning share pool.

### Scripts (under `contracts/script/`)

- **`Deploy.s.sol`** — Deploys in order: `MockUSDC`, `Shares`, `Resolution`, `MarketFactory` (wires refs), `Dispenser`. Grants `OPERATOR_ROLE` to deployer. Writes JSON to `deployments/bnbTestnet.json` via `vm.writeJson`.
- **`SeedMarkets.s.sol`** — Creates the 3 seeded markets from Section 7 of the spec with the Section 6 LMSR parameters. Mints subsidy from MockUSDC to the operator first, approves the factory, creates each market.
- **`FundDispenser.s.sol`** — Mints MockUSDC to Dispenser, sends tBNB to Dispenser.

### Gas report

Commit `gas-report.txt` generated via `forge test --gas-report` into `contracts/`. Highlight: `buy`, `sell`, `claim`.

## Acceptance criteria

- [ ] `forge test` passes with 100% of assertions green.
- [ ] Branch coverage ≥ 90% on `src/` (via `forge coverage`).
- [ ] Invariant tests run at least 256 runs with 15+ calls per run, all passing.
- [ ] Fuzz tests run at least 1024 runs, all passing.
- [ ] E2E test passes and includes the full lifecycle.
- [ ] LMSR price fixtures match a reference Python implementation within 1 wei.
- [ ] Gas report committed.
- [ ] `forge script Deploy --rpc-url anvil` on a local Anvil fork produces a valid `deployments/bnbTestnet.json` shape.

## LMSR implementation notes

- Choose fixed-point: `PRBMathSD59x18` gives 18 decimals, signed, with `exp`/`ln` already built in. Gas is acceptable on BNB testnet.
- Overflow guard: in `buy`, compute `|q_after/b|` and revert if > ~130 (empirical limit for `exp` to fit). Corresponds to buying past ~99.99% certainty.
- `b` in the spec is `100 * 10^18`. Quantities `qYes`, `qNo` are scaled to 18 decimals internally even though collateral is 6 decimals. Conversion happens at the Market boundary.
- Reference implementation: Hanson's original LMSR paper. Python reference lives in `contracts/test/fixtures/lmsr_reference.py` (generate, not commit results — regenerate via script).

## Risks / gotchas

- **Share ID collisions across markets:** handled by including `marketAddress` in the ID. Tested explicitly.
- **Rounding in `price(yes) + price(no) == 1e18`:** Allow ±2 wei tolerance in invariant test. PRBMath rounds toward zero.
- **Reentrancy on claim:** uses SafeERC20 and burns shares *before* transfer. `ReentrancyGuard` as a belt-and-suspenders.
- **Operator-set dispute window per market** overrides the 2-minute default; make sure admin panel (Phase 07) surfaces this.
- **Dispenser gas drip can be drained** by a griefer. Acceptable for testnet; admin `withdraw` provides recovery.

## Decisions recorded

- **Collateral decimals:** 6 (match real USDC). Shares are 18-decimal fixed-point internally; conversion at the Market boundary.
- **Fee destination:** Accrues to the market's collateral balance (effectively subsidizes the winner pool further). Alternative was a separate treasury — simpler to keep it in the market.
- **Per-market Resolution state vs. one global Resolution contract:** Global contract with per-market mappings. Keeps deployment simple.

## Exit criteria

Commit `feat: phase 02 contracts with tests`. All tests green in CI. Move to Phase 03.
