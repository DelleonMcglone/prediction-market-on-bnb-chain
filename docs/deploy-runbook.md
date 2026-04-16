# Deploy Runbook — BNB Testnet

Step-by-step instructions to deploy the contracts to BNB testnet, verify them on BscScan, seed the 3 demo markets, and fund the Dispenser. You (the operator) run every command. I never touch your private key.

**Dry-run status:** verified end-to-end against a local Anvil fork — all three scripts succeed, 3 markets created, Dispenser funded, YES prices start at 0.5e18.

**Expected wall-clock:** 15–20 minutes, ~0.02 tBNB in gas.

---

## 0 · Prerequisites (one-time setup)

If you already have a funded BNB testnet wallet and a BscScan API key, skip to §1.

### 0.1 Create a fresh wallet

Use a burner, never a mainnet wallet. Two options:

**Option A — Foundry keystore (recommended):**
```bash
cast wallet new           # prints a new private key + address
# Note the ADDRESS; you'll need to fund it in §0.2.

cast wallet import deployer --interactive
# Paste the private key from above when prompted.
# Pick a strong password — Foundry stores the key encrypted at
# ~/.foundry/keystores/deployer
```

**Option B — MetaMask or any wallet app:**
Create a fresh account, export the private key, fund it. You'll pass the key via `--private-key $DEPLOYER_PRIVATE_KEY` to forge. **Only do this with a testnet-only wallet.**

### 0.2 Fund the wallet with tBNB

**Required:** at least **0.05 tBNB** to cover deploy + seed + 0.01 tBNB for the Dispenser.

**Recommended faucet — QuickNode:** https://faucet.quicknode.com/binance-smart-chain/bnb-testnet
- No mainnet balance required, no signup — just wallet-connect.
- Drops **0.05 tBNB per claim**, 12h cooldown per network.

**If QuickNode is down or rate-limited, fallbacks (in preference order):**
- Chainlink: https://faucets.chain.link/bnb-chain-testnet
- Chainstack: https://faucet.chainstack.com/bnb-testnet-faucet
- Bitbond: https://tokentool.bitbond.com/faucet/bsc-testnet (requires email signup, drops 0.01 tBNB/24h — slower)

**Avoid the official faucet** at `bnbchain.org/testnet-faucet` — it requires **≥0.002 BNB on mainnet** as an anti-sybil check, which we don't want to deal with.

After claiming, verify:
```bash
cast balance <YOUR_ADDRESS> --rpc-url https://data-seed-prebsc-1-s1.binance.org:8545
# Should print a balance ≥ 50000000000000000 (0.05 ether)
```

### 0.3 Get a BscScan API key

https://bscscan.com/myapikey — register (free), click "Add". Copy the key. The same key works for both mainnet and testnet.

### 0.4 Configure `.env`

```bash
cd contracts
cp .env.example .env
```

Edit `.env`:
- `BSCSCAN_API_KEY=<paste your key>`
- `DEPLOYER_ACCOUNT=deployer` (if you used Option A)
- `DEPLOYER_PRIVATE_KEY=<key>` (only if you used Option B)

**Never commit `.env`.** It's already in `.gitignore`.

---

## 1 · Dry run on Anvil fork (sanity check)

```bash
cd contracts

# Terminal 1 — start an Anvil fork of BNB testnet
anvil --fork-url $BNB_TESTNET_RPC_URL --chain-id 97 --port 8545

# Terminal 2 — run all three scripts against it
export $(grep -v '^#' .env | xargs)
FORK_RPC=http://127.0.0.1:8545
# Use Anvil's first prefunded account (NOT your real wallet) for the dry-run:
ANVIL_PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

forge script script/Deploy.s.sol        --rpc-url $FORK_RPC --private-key $ANVIL_PK --broadcast
forge script script/SeedMarkets.s.sol   --rpc-url $FORK_RPC --private-key $ANVIL_PK --broadcast
forge script script/FundDispenser.s.sol --rpc-url $FORK_RPC --private-key $ANVIL_PK --broadcast

# Verify
cat ../deployments/bnbTestnet.json        # 5 contract addresses
cast call $(jq -r .marketFactory ../deployments/bnbTestnet.json) "marketCount()(uint256)" --rpc-url $FORK_RPC   # should print 3
```

Kill Anvil (Ctrl-C) once satisfied.

**Delete the Anvil artifact before the real run:**
```bash
rm ../deployments/bnbTestnet.json
rm -rf broadcast cache
```

---

## 2 · Deploy to BNB testnet (the real one)

```bash
cd contracts
export $(grep -v '^#' .env | xargs)
```

### 2.1 Deploy core contracts

**Recommended pattern (BscScan-flake-resistant):** deploy without `--verify`, then
verify in a separate step. BscScan's testnet API is frequently rate-limited or
returning 5xx. Coupling deploy to verify means a BscScan outage blocks the whole
phase — decoupling them costs one extra command and is always safe to retry.

**With a raw private key (testnet-only):**
```bash
forge script script/Deploy.s.sol \
  --rpc-url $BNB_TESTNET_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast
```

**With a Foundry keystore:**
```bash
forge script script/Deploy.s.sol \
  --rpc-url $BNB_TESTNET_RPC_URL \
  --account $DEPLOYER_ACCOUNT \
  --sender $(cast wallet address --account $DEPLOYER_ACCOUNT) \
  --broadcast
```

You'll be prompted for the keystore password once.

Expected output ends with:
```
ONCHAIN EXECUTION COMPLETE & SUCCESSFUL.
Transactions saved to: .../broadcast/Deploy.s.sol/97/run-latest.json
```

And `deployments/bnbTestnet.json` is written with 5 addresses.

**Verify contracts after deploy** (run §2.3 first if you want seeded markets first
— verification order doesn't matter):
```bash
./script/verify-all.sh
```

This helper reads `../deployments/bnbTestnet.json`, reconstructs the constructor
args, and calls `forge verify-contract --watch` for each core contract. Safe to
re-run — `--watch` polls until verified or already-verified.

**If BscScan is down:** use Sourcify as a fallback verifier (no API key, public
source index):
```bash
VERIFIER=sourcify ./script/verify-all.sh
```

Sourcify's record is authoritative enough for most purposes and is independent
of BscScan's API. You can still re-run with `VERIFIER=bscscan` once BscScan is
healthy — it won't conflict.

### 2.2 Verification details & fallbacks

`./script/verify-all.sh` handles the common case. A few details if it doesn't
work first try:

**Rate limiting:** BscScan's testnet API limits to ~5 calls/second. The script
serializes verification, but if you hit a 429, wait a minute and re-run the script
— it's idempotent.

**Library linking note:** `Market` uses `LMSRPricing` as an internal library,
inlined via `via-ir`. No `--libraries` flag is needed. If BscScan complains about
library addresses, run `forge build --force` and check the artifact's
`linkReferences` — should be empty.

**Full manual fallback:** if you need to bypass the script entirely, the
equivalent raw commands are in the script source at `contracts/script/verify-all.sh`.

### 2.3 Seed the 3 demo markets

```bash
forge script script/SeedMarkets.s.sol \
  --rpc-url $BNB_TESTNET_RPC_URL \
  --account $DEPLOYER_ACCOUNT \
  --sender $(cast wallet address --account $DEPLOYER_ACCOUNT) \
  --broadcast
```

This:
1. Mints 1500 MockUSDC to the deployer (3 × 500 subsidy).
2. Approves the factory for 1500 USDC.
3. Creates 3 markets with the spec § 6 parameters.

The market contracts deployed here are **not automatically verified** on BscScan (each is a new contract address). If you want them verified, run `forge verify-contract` for each of the three addresses emitted by the script against `src/Market.sol:Market` with their constructor args. Optional — the source is already public via the factory's verified bytecode.

### 2.4 Fund the Dispenser

```bash
forge script script/FundDispenser.s.sol \
  --rpc-url $BNB_TESTNET_RPC_URL \
  --account $DEPLOYER_ACCOUNT \
  --sender $(cast wallet address --account $DEPLOYER_ACCOUNT) \
  --broadcast
```

This sends **1 tBNB** to the Dispenser (enough for ~100 first-visit drips at 0.01 tBNB each). Adjust `BNB_TO_SEND` in `script/FundDispenser.s.sol` if you need more or less.

MockUSDC is minted on-demand inside `drip()` — no USDC funding step required.

---

## 3 · Post-deploy verification

```bash
FACTORY=$(jq -r .marketFactory ../deployments/bnbTestnet.json)
DISPENSER=$(jq -r .dispenser ../deployments/bnbTestnet.json)

cast call $FACTORY "marketCount()(uint256)" --rpc-url $BNB_TESTNET_RPC_URL
# Expected: 3

cast call $FACTORY "markets()(address[])" --rpc-url $BNB_TESTNET_RPC_URL
# Expected: 3 market addresses

cast balance $DISPENSER --rpc-url $BNB_TESTNET_RPC_URL
# Expected: 1000000000000000000 (1 tBNB)

# Sanity-check each market's initial price is 0.5e18
for MARKET in $(cast call $FACTORY "markets()(address[])" --rpc-url $BNB_TESTNET_RPC_URL | tr -d '[],' ); do
  echo "$MARKET YES price: $(cast call $MARKET 'priceOf(uint8)(int256)' 1 --rpc-url $BNB_TESTNET_RPC_URL)"
done
# Expected: 500000000000000000 each
```

### 3.1 BscScan verification checklist

Open each address in a browser and confirm the green "Contract Source Code Verified" badge:

- [ ] MockUSDC
- [ ] Shares
- [ ] Resolution
- [ ] MarketFactory
- [ ] Dispenser
- [ ] (Optional) 3 seeded Markets

BscScan testnet: `https://testnet.bscscan.com/address/<ADDRESS>`

---

## 4 · Commit the deployment artifact

```bash
cd ..        # back to repo root
git add deployments/bnbTestnet.json docs/contracts.md
git commit -m "feat: phase 03 deploy to bnb testnet"
```

(Claude will update `docs/contracts.md` with the real addresses and BscScan links in the same phase — see §5.)

---

## 5 · Recovery scenarios

### "Deploy succeeded but verify timed out"
Contracts are live and recorded in `deployments/bnbTestnet.json`. Run `forge verify-contract` manually as in §2.2.

### "I lost my `.env` / keystore"
The deployed contracts remain functional — anyone can still trade, resolve, and claim. But you can't create new markets or pause existing ones from a new wallet. If this happens pre-launch, just redeploy with a new wallet and overwrite `bnbTestnet.json`.

### "Faucet exhausted / not enough tBNB"
Try the alt faucet: https://testnet.bnbchain.org/faucet-smart. Or use the backup RPC and a different deployer address.

### "forge script reverts with nonce issue"
Two deploys racing. Wait 30s, then `forge script --resume` or just re-run. Worst case, `cast nonce --rpc-url $BNB_TESTNET_RPC_URL $DEPLOYER` to inspect and pass `--nonce <n>` to forge.

### "Broadcast file mismatch after re-run"
Delete `contracts/broadcast/` and `contracts/cache/` and start fresh. These are gitignored.

---

## 6 · What Claude will do after you deploy

Once `deployments/bnbTestnet.json` contains the 5 real testnet addresses, ping me and I'll:

1. Populate [`docs/contracts.md`](contracts.md) with each contract's address, BscScan link, role grants, and public function reference.
2. Update the root `README.md` with the live addresses and faucet link.
3. Commit as `feat: phase 03 deploy to bnb testnet`.

That closes Phase 03. Phase 04 (frontend foundation) starts next.
