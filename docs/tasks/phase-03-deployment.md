# Phase 03 · Contract Deployment

**Goal:** All contracts live on BNB testnet, verified on BscScan, 3 demo markets seeded, Dispenser funded, deployment artifact committed.

## Prerequisites

- Phase 02 complete — `forge test` green, deploy scripts exist.
- A BNB testnet wallet with enough tBNB for deployment (~0.2 tBNB is plenty).
- BscScan API key for testnet.
- `.env` with `PRIVATE_KEY`, `BSCSCAN_API_KEY`, `BNB_TESTNET_RPC_URL` (use `https://data-seed-prebsc-1-s1.binance.org:8545` or a reliable alt).

## Deliverables

### Execution steps (each produces an artifact)

1. **Dry run on Anvil fork**
   - `anvil --fork-url $BNB_TESTNET_RPC_URL --chain-id 97`
   - `forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast`
   - Verify the resulting JSON shape and gas numbers look sane.

2. **Deploy to BNB testnet**
   - `forge script script/Deploy.s.sol --rpc-url $BNB_TESTNET_RPC_URL --broadcast --verify --etherscan-api-key $BSCSCAN_API_KEY --verifier-url https://api-testnet.bscscan.com/api`
   - Save `broadcast/Deploy.s.sol/97/run-latest.json` references in commit.

3. **Verify sources manually if `--verify` fails**
   - For each contract: `forge verify-contract <ADDR> <PATH:Name> --chain-id 97 --etherscan-api-key $BSCSCAN_API_KEY --verifier-url https://api-testnet.bscscan.com/api`
   - Libraries (`LMSRPricing`) need `--libraries` flag.

4. **Seed the 3 demo markets**
   - `forge script script/SeedMarkets.s.sol --rpc-url $BNB_TESTNET_RPC_URL --broadcast`
   - Before running: deployer must hold enough MockUSDC to cover 3 × 500 = 1500 USDC subsidy. The deploy script can pre-mint to deployer.

5. **Fund the Dispenser**
   - `forge script script/FundDispenser.s.sol --rpc-url $BNB_TESTNET_RPC_URL --broadcast` — mints a large MockUSDC balance into Dispenser and sends, say, 0.5 tBNB for gas drips.

### Committed artifacts

- **`deployments/bnbTestnet.json`** — canonical. Shape:
  ```json
  {
    "chainId": 97,
    "deployedAt": "2026-04-16T00:00:00Z",
    "contracts": {
      "MockUSDC": "0x...",
      "Shares": "0x...",
      "LMSRPricing": "0x...",
      "MarketFactory": "0x...",
      "Resolution": "0x...",
      "Dispenser": "0x..."
    },
    "seededMarkets": [
      { "address": "0x...", "question": "Will the demo market #1 be resolved YES?" },
      { "address": "0x...", "question": "Will this market have more than 20 trades by the end of the week?" },
      { "address": "0x...", "question": "Will the next block mined on BSC testnet have an even block number?" }
    ],
    "bscscanUrls": {
      "MockUSDC": "https://testnet.bscscan.com/address/0x...",
      "...": "..."
    }
  }
  ```
- **`docs/contracts.md`** — one section per contract with: address, constructor args, role grants, key function signatures. Links to BscScan. Generated from the broadcast JSON + spec.

## Acceptance criteria

- [ ] Every contract has a green "Contract Source Code Verified" badge on BscScan.
- [ ] `deployments/bnbTestnet.json` is committed and matches on-chain state.
- [ ] Calling `Dispenser.drip()` from a fresh wallet succeeds and delivers both MockUSDC and tBNB.
- [ ] `MarketFactory.markets()` returns 3 addresses matching `seededMarkets[].address`.
- [ ] Each seeded market returns `subsidyRemaining == 500 * 1e6` on first read (nothing traded yet).
- [ ] `LMSRPricing.price` reads from each market produce `0.5e18 ± 2 wei` when `qYes == qNo == 0` (neutral start).
- [ ] Operator wallet (deployer) has `OPERATOR_ROLE` on both `MarketFactory` and `Resolution`.
- [ ] `docs/contracts.md` is written and linked from the README.

## Tests

- **Manual smoke test (documented in `docs/tasks/phase-03-deployment.md` appendix):**
  1. From operator wallet: create a 4th market via `cast send` — confirm txn succeeds.
  2. From operator wallet: pause a seeded market — confirm on-chain state flips.
  3. From operator wallet: unpause.
  4. From non-operator wallet: attempt to pause — confirm revert.
  5. From fresh wallet: call `Dispenser.drip()` — confirm receipt of MockUSDC and tBNB.
- **Automated:** Phase 04 frontend tests will implicitly re-verify reads. No blocking automated tests in Phase 03.

## Risks / gotchas

- **BNB testnet RPC flakiness:** The public RPC can 429. Keep a backup (QuickNode, Ankr) in `.env` under `BNB_TESTNET_RPC_URL_BACKUP`.
- **BscScan verification quirks:** Library-linked contracts (`Market` links `LMSRPricing`) need explicit `--libraries`. Test on Anvil first to be sure the bytecode matches.
- **Gas limits:** Deploying `Market` through the factory consumes real gas because each market is a new contract. Confirm block gas limit headroom; consider `CREATE2` only if we need deterministic addresses (we don't for the demo).
- **Nonce management:** Don't run two deploy scripts in parallel.
- **Private key handling:** Never commit `.env`. The Foundry keystore (`cast wallet`) is preferred over raw `PRIVATE_KEY` env vars.

## Decisions recorded

- **RPC provider:** Public Binance endpoint primary, user supplies backup via env. No embedded provider key.
- **Library linking strategy:** Deploy `LMSRPricing` once, link all `Market` deployments against it. Saves bytecode size.
- **Deployer wallet:** Same wallet holds `DEFAULT_ADMIN_ROLE` and `OPERATOR_ROLE` for the demo. Documented as a simplification in the case study.

## Exit criteria

Commit `feat: phase 03 deploy to bnb testnet`. `deployments/bnbTestnet.json` merged. Every BscScan link in `docs/contracts.md` opens a verified contract page. Move to Phase 04.
