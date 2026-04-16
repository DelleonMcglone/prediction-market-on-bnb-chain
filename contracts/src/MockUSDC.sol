// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

// TESTNET ONLY. DO NOT DEPLOY TO MAINNET.
// Unlimited public mint — this is a demo collateral token.

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSDC
/// @notice 6-decimal ERC20 used as collateral in the demo prediction market.
/// @dev Anyone can mint any amount. For testnet use only.
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USD Coin", "mUSDC") { }

    /// @inheritdoc ERC20
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Mint tokens to any address. Unrestricted by design.
    /// @param to Recipient of the newly minted tokens.
    /// @param amount Amount in the token's smallest unit (6 decimals).
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
