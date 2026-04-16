// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { Shares } from "src/Shares.sol";
import { Market } from "src/Market.sol";

/// @title MarketFactory
/// @notice Deploys Market instances and maintains a registry of all markets created.
/// @dev Role-gated: only accounts with `OPERATOR_ROLE` may create markets. The caller
///      becomes the operator of any market they create.
///
///      Subsidy flow: the operator must approve this factory for at least `subsidy`
///      collateral before calling {createMarket}. The factory deploys the market, then
///      transfers the subsidy directly from the operator to the new market.
contract MarketFactory is AccessControl {
    using SafeERC20 for IERC20;

    // ---------- Roles ----------

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // ---------- Configuration ----------

    IERC20 public immutable collateral;
    Shares public immutable shares;
    address public immutable resolution;

    // ---------- State ----------

    address[] private _markets;

    // ---------- Events ----------

    event MarketCreated(
        address indexed market,
        address indexed operator,
        string question,
        uint256 b,
        uint256 subsidy,
        uint256 feeBps,
        uint256 disputeWindow
    );

    // ---------- Constructor ----------

    /// @param _collateral Collateral token all created markets will use.
    /// @param _shares Shared ERC-1155 token contract used by all markets.
    /// @param _resolution Resolution contract that will finalize all created markets.
    /// @param admin Account granted DEFAULT_ADMIN_ROLE and OPERATOR_ROLE at deploy.
    constructor(IERC20 _collateral, Shares _shares, address _resolution, address admin) {
        collateral = _collateral;
        shares = _shares;
        resolution = _resolution;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    // ---------- Market creation ----------

    /// @notice Create a new market and seed it with `subsidy` collateral from the caller.
    /// @param question Human-readable market question.
    /// @param b LMSR liquidity parameter, 18-decimal.
    /// @param subsidy Collateral (6-decimal) the operator deposits as initial liquidity.
    /// @param feeBps Trading fee in basis points.
    /// @param disputeWindow Dispute window length in seconds.
    /// @return market Address of the newly deployed Market contract.
    function createMarket(string calldata question, uint256 b, uint256 subsidy, uint256 feeBps, uint256 disputeWindow)
        external
        onlyRole(OPERATOR_ROLE)
        returns (address market)
    {
        Market m = new Market(collateral, shares, msg.sender, resolution, b, feeBps, subsidy, disputeWindow, question);

        // Pull subsidy from the operator directly into the new market.
        collateral.safeTransferFrom(msg.sender, address(m), subsidy);

        _markets.push(address(m));
        market = address(m);

        emit MarketCreated(market, msg.sender, question, b, subsidy, feeBps, disputeWindow);
    }

    // ---------- Views ----------

    /// @notice All markets created by this factory, in order of creation.
    function markets() external view returns (address[] memory) {
        return _markets;
    }

    function marketCount() external view returns (uint256) {
        return _markets.length;
    }

    function marketAt(uint256 index) external view returns (address) {
        return _markets[index];
    }
}
