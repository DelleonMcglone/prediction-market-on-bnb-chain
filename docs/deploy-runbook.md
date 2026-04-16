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

Public BNB testnet faucet: https://www.bnbchain.org/en/testnet-faucet

Paste your address, solve the captcha, wait ~30 seconds. You should receive 0.3–0.5 tBNB.

**Required:** at least **0.05 tBNB** to cover deploy + seed + dispenser funding. Request more if the faucet gives you less.

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

**With a Foundry keystore (recommended):**
```bash
forge script script/Deploy.s.sol \
  --rpc-url $BNB_TESTNET_RPC_URL \
  --account $DEPLOYER_ACCOUNT \
  --sender $(cast wallet address --account $DEPLOYER_ACCOUNT) \
  --broadcast \
  --verify \
  --etherscan-api-key $BSCSCAN_API_KEY \
  --verifier-url https://api-testnet.bscscan.com/api
```

You'll be prompted for the keystore password once.

**With a raw private key (testnet-only):**
```bash
forge script script/Deploy.s.sol \
  --rpc-url $BNB_TESTNET_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $BSCSCAN_API_KEY \
  --verifier-url https://api-testnet.bscscan.com/api
```

Expected output ends with:
```
ONCHAIN EXECUTION COMPLETE & SUCCESSFUL.
Transactions saved to: .../broadcast/Deploy.s.sol/97/run-latest.json
```

And `deployments/bnbTestnet.json` is written with 5 addresses.

### 2.2 If `--verify` fails mid-flight

Don't panic — the contracts are deployed. Verify each one manually:

```bash
source ../deployments/bnbTestnet.json  # read addresses (or use jq)
USDC=$(jq -r .mockUSDC       ../deployments/bnbTestnet.json)
SHARES=$(jq -r .shares       ../deployments/bnbTestnet.json)
RES=$(jq -r .resolution      ../deployments/bnbTestnet.json)
FACTORY=$(jq -r .marketFactory ../deployments/bnbTestnet.json)
DISPENSER=$(jq -r .dispenser ../deployments/bnbTestnet.json)

# Get the deployer address
DEPLOYER=$(cast wallet address --account $DEPLOYER_ACCOUNT)

forge verify-contract $USDC     src/MockUSDC.sol:MockUSDC \
  --chain-id 97 --etherscan-api-key $BSCSCAN_API_KEY \
  --verifier-url https://api-testnet.bscscan.com/api --watch

forge verify-contract $SHARES   src/Shares.sol:Shares \
  --chain-id 97 --etherscan-api-key $BSCSCAN_API_KEY \
  --verifier-url https://api-testnet.bscscan.com/api --watch

forge verify-contract $RES      src/Resolution.sol:Resolution \
  --constructor-args $(cast abi-encode "constructor(address)" $DEPLOYER) \
  --chain-id 97 --etherscan-api-key $BSCSCAN_API_KEY \
  --verifier-url https://api-testnet.bscscan.com/api --watch

forge verify-contract $FACTORY  src/MarketFactory.sol:MarketFactory \
  --constructor-args $(cast abi-encode "constructor(address,address,address,address)" $USDC $SHARES $RES $DEPLOYER) \
  --chain-id 97 --etherscan-api-key $BSCSCAN_API_KEY \
  --verifier-url https://api-testnet.bscscan.com/api --watch

forge verify-contract $DISPENSER src/Dispenser.sol:Dispenser \
  --constructor-args $(cast abi-encode "constructor(address,uint256,uint256,address)" $USDC 100000000 10000000000000000 $DEPLOYER) \
  --chain-id 97 --etherscan-api-key $BSCSCAN_API_KEY \
  --verifier-url https://api-testnet.bscscan.com/api --watch
```

Each one should end with `Contract successfully verified` and a BscScan URL.

**Library linking note:** `Market` uses `LMSRPricing` as an internal library; it's inlined via `via-ir` so no `--libraries` flag is needed. If BscScan complains about library addresses, compile with `forge build --force` and check the artifact's `linkReferences` — should be empty.

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
