# Contracts

Foundry project for the prediction market demo.

## Layout

```
src/        Solidity sources — populated in Phase 02
test/       Foundry tests (unit, invariant, fuzz, e2e)
script/     Deploy & utility scripts
lib/        forge install targets (gitignored as submodules recommended)
out/        Build artifacts (gitignored)
cache/      Foundry cache (gitignored)
broadcast/  Deploy records (gitignored)
```

## Install dependencies

```bash
forge install foundry-rs/forge-std --no-commit
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge install PaulRBerg/prb-math --no-commit
forge install transmissions11/solmate --no-commit
```

## Common commands

```bash
forge build              # compile
forge fmt                # format
forge fmt --check        # check formatting (CI)
forge test               # run all tests
forge test -vvv          # verbose output
forge test --gas-report  # with gas numbers
forge coverage           # coverage report
```

## Deploy (Phase 03)

```bash
# Dry run on a fork
anvil --fork-url $BNB_TESTNET_RPC_URL --chain-id 97 &
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# Deploy to BNB testnet
forge script script/Deploy.s.sol \
  --rpc-url $BNB_TESTNET_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $BSCSCAN_API_KEY \
  --verifier-url https://api-testnet.bscscan.com/api
```
