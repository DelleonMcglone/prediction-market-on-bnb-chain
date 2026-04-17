#!/usr/bin/env bash
#
# Spin up a local Anvil chain, deploy contracts, seed markets, fund dispenser.
# Writes addresses to deployments/anvil.json so the frontend (via
# lib/contracts.ts, after a one-line swap) can read them.
#
# Usage:
#   ./scripts/dev-chain.sh        # starts anvil in foreground; Ctrl-C to stop
#   ./scripts/dev-chain.sh setup  # deploy + seed against an ALREADY-running anvil
#
# Dev workflow:
#   Terminal A: ./scripts/dev-chain.sh
#   Terminal B: ./scripts/dev-chain.sh setup
#   Terminal C: pnpm dev
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/contracts"

# Anvil's first prefunded account. Public, well-known, local-only.
ANVIL_PK="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
RPC="http://127.0.0.1:8545"

case "${1:-run}" in
  run)
    echo "→ Starting Anvil on port 8545 (chain 97, Ctrl-C to stop)"
    exec anvil --chain-id 97 --port 8545 --block-time 1
    ;;
  setup)
    echo "→ Deploying core contracts..."
    forge script script/Deploy.s.sol --rpc-url "$RPC" --private-key "$ANVIL_PK" --broadcast > /dev/null

    echo "→ Seeding 3 markets..."
    forge script script/SeedMarkets.s.sol --rpc-url "$RPC" --private-key "$ANVIL_PK" --broadcast > /dev/null

    echo "→ Funding dispenser..."
    forge script script/FundDispenser.s.sol --rpc-url "$RPC" --private-key "$ANVIL_PK" --broadcast > /dev/null

    # Promote the anvil deployment to be the active one for the frontend.
    cp ../deployments/anvil.json ../deployments/bnbTestnet.json

    echo ""
    echo "✓ Dev chain ready. Contracts:"
    jq . ../deployments/anvil.json
    echo ""
    echo "The frontend's lib/contracts.ts reads deployments/bnbTestnet.json —"
    echo "the anvil artifact has been copied there so \`pnpm dev\` picks it up."
    echo ""
    echo "Restore testnet addresses later with:"
    echo "  git checkout deployments/bnbTestnet.json"
    ;;
  *)
    echo "Usage: $0 [run|setup]"
    exit 1
    ;;
esac
