#!/usr/bin/env bash
#
# Verify all deployed contracts on BscScan testnet (or Sourcify as a fallback).
# Safe to re-run — `forge verify-contract --watch` is idempotent.
#
# Usage:
#   ./script/verify-all.sh              # BscScan (reads BSCSCAN_API_KEY from env)
#   VERIFIER=sourcify ./script/verify-all.sh  # BscScan-independent verifier
#
# Prereq: `../deployments/bnbTestnet.json` exists with contract addresses.
set -euo pipefail

# Resolve paths so this works from any CWD.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY_JSON="$CONTRACTS_DIR/../deployments/bnbTestnet.json"

if [ ! -f "$DEPLOY_JSON" ]; then
  echo "error: $DEPLOY_JSON not found. Run Deploy.s.sol first." >&2
  exit 1
fi

cd "$CONTRACTS_DIR"

# Parse addresses.
USDC=$(jq -r .mockUSDC "$DEPLOY_JSON")
SHARES=$(jq -r .shares "$DEPLOY_JSON")
RESOLUTION=$(jq -r .resolution "$DEPLOY_JSON")
FACTORY=$(jq -r .marketFactory "$DEPLOY_JSON")
DISPENSER=$(jq -r .dispenser "$DEPLOY_JSON")

# Recover the deployer (admin) from an on-chain read so we can reconstruct
# Resolution / MarketFactory / Dispenser constructor args without guessing.
RPC="${BNB_TESTNET_RPC_URL:-https://data-seed-prebsc-1-s1.binance.org:8545}"
DEFAULT_ADMIN_ROLE="0x0000000000000000000000000000000000000000000000000000000000000000"

# getRoleMember(bytes32 role, uint256 index) — OZ AccessControlEnumerable has this,
# but we use plain AccessControl. Fallback: read the deployer from the broadcast
# receipt, or ask the operator to set ADMIN in env.
ADMIN="${ADMIN:-}"
if [ -z "$ADMIN" ]; then
  # Try reading from the latest broadcast record.
  BROADCAST_FILE="broadcast/Deploy.s.sol/97/run-latest.json"
  if [ -f "$BROADCAST_FILE" ]; then
    ADMIN=$(jq -r '.transactions[0].transaction.from // empty' "$BROADCAST_FILE")
  fi
fi
if [ -z "$ADMIN" ]; then
  echo "error: can't infer deployer address. Set ADMIN=0x... in env." >&2
  exit 1
fi

# Drip constants (must match Deploy.s.sol).
USDC_DRIP=100000000           # 100 * 1e6
BNB_DRIP=1000000000000000     # 0.001 ether

VERIFIER="${VERIFIER:-bscscan}"
COMMON_ARGS=(--chain-id 97 --watch)

case "$VERIFIER" in
  bscscan)
    if [ -z "${BSCSCAN_API_KEY:-}" ]; then
      echo "error: BSCSCAN_API_KEY unset (needed for bscscan verifier)." >&2
      exit 1
    fi
    COMMON_ARGS+=(
      --etherscan-api-key "$BSCSCAN_API_KEY"
      --verifier-url https://api-testnet.bscscan.com/api
    )
    ;;
  sourcify)
    COMMON_ARGS+=(--verifier sourcify)
    ;;
  *)
    echo "error: unknown VERIFIER=$VERIFIER (use 'bscscan' or 'sourcify')" >&2
    exit 1
    ;;
esac

verify() {
  local name="$1"
  local addr="$2"
  local path="$3"
  local args="${4:-}"

  echo ""
  echo "=== $name  $addr  ==="
  if [ -n "$args" ]; then
    forge verify-contract "$addr" "$path" --constructor-args "$args" "${COMMON_ARGS[@]}"
  else
    forge verify-contract "$addr" "$path" "${COMMON_ARGS[@]}"
  fi
}

verify "MockUSDC"      "$USDC"        "src/MockUSDC.sol:MockUSDC"
verify "Shares"        "$SHARES"      "src/Shares.sol:Shares"
verify "Resolution"    "$RESOLUTION"  "src/Resolution.sol:Resolution"    "$(cast abi-encode 'constructor(address)' "$ADMIN")"
verify "MarketFactory" "$FACTORY"     "src/MarketFactory.sol:MarketFactory" "$(cast abi-encode 'constructor(address,address,address,address)' "$USDC" "$SHARES" "$RESOLUTION" "$ADMIN")"
verify "Dispenser"     "$DISPENSER"   "src/Dispenser.sol:Dispenser"      "$(cast abi-encode 'constructor(address,uint256,uint256,address)' "$USDC" "$USDC_DRIP" "$BNB_DRIP" "$ADMIN")"

echo ""
echo "All core contracts submitted for verification."
echo ""
echo "Note: The 3 seeded Market contracts are separate deployments and not"
echo "verified by this script. Run forge verify-contract manually against"
echo "src/Market.sol:Market for each if you want per-market verification."
