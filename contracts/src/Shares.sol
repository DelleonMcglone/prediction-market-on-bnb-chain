// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { ERC1155 } from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

/// @title Shares
/// @notice ERC-1155 position tokens for all markets. Token IDs encode (market, outcome).
/// @dev Only the market contract embedded in a token ID can mint or burn that ID's balance.
///      This provides per-market access control without a separate registry: the ID itself
///      *is* the authorization. An attacker cannot forge shares for a market they did not deploy.
contract Shares is ERC1155 {
    error InvalidOutcome();

    constructor() ERC1155("") { }

    // ---------- ID encoding ----------

    /// @notice Compute the token ID for a (market, outcome) pair.
    /// @param market Address of the Market contract.
    /// @param outcome 0 for NO, 1 for YES.
    function idFor(address market, uint8 outcome) public pure returns (uint256) {
        if (outcome > 1) revert InvalidOutcome();
        return (uint256(uint160(market)) << 1) | outcome;
    }

    /// @notice Extract the market address from a token ID.
    function marketFromId(uint256 id) public pure returns (address) {
        return address(uint160(id >> 1));
    }

    /// @notice Extract the outcome (0 or 1) from a token ID.
    function outcomeFromId(uint256 id) public pure returns (uint8) {
        return uint8(id & 1);
    }

    // ---------- Mint / burn (market-gated) ----------

    /// @notice Mint shares for an outcome in the caller's market.
    /// @dev The caller (`msg.sender`) is treated as the market address in the ID encoding.
    /// @param to Recipient.
    /// @param outcome 0 (NO) or 1 (YES).
    /// @param amount Share amount.
    function mint(address to, uint8 outcome, uint256 amount) external {
        uint256 id = idFor(msg.sender, outcome);
        _mint(to, id, amount, "");
    }

    /// @notice Burn shares for an outcome in the caller's market.
    /// @dev Mirror of {mint} — caller is the market.
    function burn(address from, uint8 outcome, uint256 amount) external {
        uint256 id = idFor(msg.sender, outcome);
        _burn(from, id, amount);
    }
}
