// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { MockUSDC } from "src/MockUSDC.sol";

/// @title Dispenser
/// @notice Drips a small amount of MockUSDC and tBNB to a fresh wallet on demand.
/// @dev Once per address. Designed for the demo so first-time visitors can trade without
///      hunting for a faucet. DEFAULT_ADMIN_ROLE can withdraw remaining funds.
contract Dispenser is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------- Errors ----------

    error AlreadyServed();
    error InsufficientReserves();
    error TransferFailed();

    // ---------- Events ----------

    event Dripped(address indexed recipient, uint256 usdcAmount, uint256 bnbAmount);
    event Withdrawn(address indexed to, uint256 usdcAmount, uint256 bnbAmount);

    // ---------- Configuration ----------

    MockUSDC public immutable usdc;
    uint256 public immutable usdcDripAmount;
    uint256 public immutable bnbDripAmount;

    // ---------- State ----------

    mapping(address => bool) public served;

    // ---------- Constructor ----------

    constructor(MockUSDC _usdc, uint256 _usdcDripAmount, uint256 _bnbDripAmount, address admin) {
        usdc = _usdc;
        usdcDripAmount = _usdcDripAmount;
        bnbDripAmount = _bnbDripAmount;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    receive() external payable { }

    // ---------- Drip ----------

    /// @notice Send the caller the configured MockUSDC and tBNB drips. One-shot per address.
    function drip() external nonReentrant {
        if (served[msg.sender]) revert AlreadyServed();
        if (address(this).balance < bnbDripAmount) revert InsufficientReserves();

        served[msg.sender] = true;

        // MockUSDC is minted fresh each drip — no balance dependency.
        usdc.mint(msg.sender, usdcDripAmount);

        (bool ok,) = payable(msg.sender).call{ value: bnbDripAmount }("");
        if (!ok) revert TransferFailed();

        emit Dripped(msg.sender, usdcDripAmount, bnbDripAmount);
    }

    // ---------- Admin ----------

    function withdraw(address to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 usdcBal = IERC20(address(usdc)).balanceOf(address(this));
        if (usdcBal > 0) IERC20(address(usdc)).safeTransfer(to, usdcBal);

        uint256 bnbBal = address(this).balance;
        if (bnbBal > 0) {
            (bool ok,) = payable(to).call{ value: bnbBal }("");
            if (!ok) revert TransferFailed();
        }

        emit Withdrawn(to, usdcBal, bnbBal);
    }

    // ---------- Views ----------

    function refillable() external view returns (uint256 usdcAvailable, uint256 bnbAvailable) {
        // USDC is minted on demand; "available" represents how many more drips we could do
        // solely based on the BNB gas reserve.
        usdcAvailable = type(uint256).max;
        bnbAvailable = address(this).balance;
    }
}
