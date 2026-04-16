// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { Shares } from "src/Shares.sol";
import { LMSRPricing } from "src/LMSRPricing.sol";

/// @title Market
/// @notice A single binary prediction market priced by LMSR.
/// @dev Deployed by MarketFactory. Collateral subsidy is deposited by the factory
///      immediately after construction — the constructor initializes `collateralBalance`
///      to `subsidy` in anticipation of that deposit.
///
///      Decimals: collateral is 6-decimal USDC-like. Internally, share quantities and the
///      liquidity parameter `b` are 18-decimal fixed-point. The SCALE constant bridges
///      the two at the Market boundary.
contract Market is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------- Errors ----------

    error InvalidOutcome();
    error AmountZero();
    error NotActive();
    error AlreadyResolved();
    error NotOperator();
    error NotResolution();
    error SlippageExceeded(uint256 cost, uint256 maxCost);
    error PayoutTooLow(uint256 payout, uint256 minPayout);
    error SubsidyExhausted(uint256 required, uint256 available);
    error InsufficientShares();

    // ---------- Events ----------

    event Bought(address indexed trader, uint8 outcome, uint256 shareAmount, uint256 cost, uint256 fee);
    event Sold(address indexed trader, uint8 outcome, uint256 shareAmount, uint256 payout, uint256 fee);
    event Paused();
    event Unpaused();
    event Resolved(uint8 winningOutcome);
    event Claimed(address indexed holder, uint256 payout);

    // ---------- Constants ----------

    /// @dev 10^(18-6). Converts internal 18-decimal units to 6-decimal collateral.
    uint256 internal constant SCALE = 1e12;

    /// @dev Basis-point denominator.
    uint256 internal constant BPS = 10_000;

    // ---------- Immutables / configuration ----------

    Shares public immutable shares;
    IERC20 public immutable collateral;
    address public immutable operator;
    address public immutable resolution;

    /// @notice Liquidity parameter, 18-decimal fixed-point (SD59x18-compatible).
    uint256 public immutable b;

    /// @notice Trading fee in basis points (e.g. 100 = 1%).
    uint256 public immutable feeBps;

    /// @notice Initial operator subsidy deposit, 6-decimal collateral units.
    uint256 public immutable subsidyBudget;

    /// @notice Dispute window in seconds. Read by the Resolution contract on outcome submission.
    uint256 public immutable disputeWindow;

    /// @notice Human-readable market question.
    string public question;

    // ---------- State ----------

    /// @dev Outcome-0 (NO) shares outstanding, 18-decimal.
    int256 public qNo;
    /// @dev Outcome-1 (YES) shares outstanding, 18-decimal.
    int256 public qYes;

    /// @notice Collateral held by the market, 6-decimal.
    uint256 public collateralBalance;

    bool public paused;
    bool public resolved;
    uint8 public winningOutcome;

    // ---------- Modifiers ----------

    modifier onlyOperator() {
        if (msg.sender != operator) revert NotOperator();
        _;
    }

    modifier onlyResolution() {
        if (msg.sender != resolution) revert NotResolution();
        _;
    }

    modifier whenActive() {
        if (paused || resolved) revert NotActive();
        _;
    }

    // ---------- Constructor ----------

    /// @param _collateral Collateral token (6-decimal).
    /// @param _shares Shared ERC-1155 token contract.
    /// @param _operator Address granted pause/unpause rights on this market.
    /// @param _resolution Resolution contract that may finalize and drive claims.
    /// @param _b Liquidity parameter, 18-decimal.
    /// @param _feeBps Trading fee, basis points.
    /// @param _subsidy Collateral amount the factory will deposit immediately after construction.
    /// @param _disputeWindow Dispute window in seconds (read by Resolution on outcome submission).
    /// @param _question Human-readable question string.
    constructor(
        IERC20 _collateral,
        Shares _shares,
        address _operator,
        address _resolution,
        uint256 _b,
        uint256 _feeBps,
        uint256 _subsidy,
        uint256 _disputeWindow,
        string memory _question
    ) {
        collateral = _collateral;
        shares = _shares;
        operator = _operator;
        resolution = _resolution;
        b = _b;
        feeBps = _feeBps;
        subsidyBudget = _subsidy;
        disputeWindow = _disputeWindow;
        question = _question;

        // The factory is responsible for transferring `_subsidy` collateral to this address
        // immediately after construction. We anchor the bookkeeping here so callers have a
        // consistent view from block 0.
        collateralBalance = _subsidy;
    }

    // ---------- Trading ----------

    /// @notice Buy `shareAmount` shares of `outcome`. Reverts if total cost > maxCost.
    /// @param outcome 0 (NO) or 1 (YES).
    /// @param shareAmount 18-decimal share amount.
    /// @param maxCost Max collateral (6-decimal) the caller is willing to pay.
    /// @return totalCost Collateral transferred in (cost + fee), 6-decimal.
    function buy(uint8 outcome, uint256 shareAmount, uint256 maxCost)
        external
        nonReentrant
        whenActive
        returns (uint256 totalCost)
    {
        if (outcome > 1) revert InvalidOutcome();
        if (shareAmount == 0) revert AmountZero();

        (uint256 cost, uint256 fee, int256 qNoAfter, int256 qYesAfter) = _computeBuy(outcome, shareAmount);
        totalCost = cost + fee;
        if (totalCost > maxCost) revert SlippageExceeded(totalCost, maxCost);

        // Subsidy / reserve invariant: after the trade, collateral must cover the max
        // possible payout (entire winning side). This is the real "capacity reached" gate.
        uint256 maxQ = uint256(qYesAfter > qNoAfter ? qYesAfter : qNoAfter);
        uint256 requiredCollateral = maxQ / SCALE;
        uint256 availableCollateral = collateralBalance + totalCost;
        if (availableCollateral < requiredCollateral) {
            revert SubsidyExhausted(requiredCollateral, availableCollateral);
        }

        // Effects
        qNo = qNoAfter;
        qYes = qYesAfter;
        collateralBalance = availableCollateral;

        // Interactions
        collateral.safeTransferFrom(msg.sender, address(this), totalCost);
        shares.mint(msg.sender, outcome, shareAmount);

        emit Bought(msg.sender, outcome, shareAmount, cost, fee);
    }

    /// @notice Sell `shareAmount` shares of `outcome`. Reverts if net payout < minPayout.
    /// @return netPayout Collateral transferred out (payout - fee), 6-decimal.
    function sell(uint8 outcome, uint256 shareAmount, uint256 minPayout)
        external
        nonReentrant
        whenActive
        returns (uint256 netPayout)
    {
        if (outcome > 1) revert InvalidOutcome();
        if (shareAmount == 0) revert AmountZero();

        (uint256 payout, uint256 fee, int256 qNoAfter, int256 qYesAfter) = _computeSell(outcome, shareAmount);
        netPayout = payout - fee;
        if (netPayout < minPayout) revert PayoutTooLow(netPayout, minPayout);

        // Reserve invariant still holds after a sell (qYes/qNo shrink, payout shrinks too).
        // We still sanity check that collateralBalance can cover the outflow.
        if (collateralBalance < netPayout) revert SubsidyExhausted(netPayout, collateralBalance);

        // Effects
        qNo = qNoAfter;
        qYes = qYesAfter;
        collateralBalance -= netPayout;

        // Interactions — burn *before* transferring out
        shares.burn(msg.sender, outcome, shareAmount);
        collateral.safeTransfer(msg.sender, netPayout);

        emit Sold(msg.sender, outcome, shareAmount, payout, fee);
    }

    // ---------- Previews (pure / view) ----------

    function previewBuy(uint8 outcome, uint256 shareAmount)
        external
        view
        returns (uint256 cost, uint256 fee, int256 priceAfter)
    {
        if (outcome > 1) revert InvalidOutcome();
        if (shareAmount == 0) return (0, 0, LMSRPricing.price(qNo, qYes, int256(b), outcome));
        (uint256 c, uint256 f, int256 n, int256 y) = _computeBuy(outcome, shareAmount);
        cost = c;
        fee = f;
        priceAfter = LMSRPricing.price(n, y, int256(b), outcome);
    }

    function previewSell(uint8 outcome, uint256 shareAmount)
        external
        view
        returns (uint256 payout, uint256 fee, int256 priceAfter)
    {
        if (outcome > 1) revert InvalidOutcome();
        if (shareAmount == 0) return (0, 0, LMSRPricing.price(qNo, qYes, int256(b), outcome));
        (uint256 p, uint256 f, int256 n, int256 y) = _computeSell(outcome, shareAmount);
        payout = p;
        fee = f;
        priceAfter = LMSRPricing.price(n, y, int256(b), outcome);
    }

    function priceOf(uint8 outcome) external view returns (int256) {
        if (outcome > 1) revert InvalidOutcome();
        return LMSRPricing.price(qNo, qYes, int256(b), outcome);
    }

    // ---------- Operator ----------

    function pause() external onlyOperator {
        paused = true;
        emit Paused();
    }

    function unpause() external onlyOperator {
        paused = false;
        emit Unpaused();
    }

    // ---------- Resolution-gated ----------

    /// @notice Called by the Resolution contract when the dispute window closes.
    function setResolved(uint8 outcome) external onlyResolution {
        if (resolved) revert AlreadyResolved();
        if (outcome > 1) revert InvalidOutcome();
        resolved = true;
        winningOutcome = outcome;
        emit Resolved(outcome);
    }

    /// @notice Called by the Resolution contract on behalf of a claimer. Burns the claimer's
    ///         winning shares and transfers collateral at 1 share : 1 collateral unit.
    /// @return payout Collateral paid out, 6-decimal. Zero if the caller holds no winning shares.
    function handleClaim(address holder) external onlyResolution nonReentrant returns (uint256 payout) {
        if (!resolved) revert NotActive();
        uint256 id = shares.idFor(address(this), winningOutcome);
        uint256 balance = shares.balanceOf(holder, id);
        if (balance == 0) return 0;

        // 1 share (18-decimal) = 1 collateral unit (6-decimal) / SCALE.
        payout = balance / SCALE;

        // Effects
        if (collateralBalance < payout) revert SubsidyExhausted(payout, collateralBalance);
        collateralBalance -= payout;

        // Interactions
        shares.burn(holder, winningOutcome, balance);
        if (payout > 0) collateral.safeTransfer(holder, payout);

        emit Claimed(holder, payout);
    }

    // ---------- Internal math ----------

    function _computeBuy(uint8 outcome, uint256 shareAmount)
        internal
        view
        returns (uint256 cost, uint256 fee, int256 qNoAfter, int256 qYesAfter)
    {
        int256 dq = int256(shareAmount);
        qNoAfter = outcome == 0 ? qNo + dq : qNo;
        qYesAfter = outcome == 1 ? qYes + dq : qYes;

        int256 rawDelta = LMSRPricing.deltaCost(qNo, qYes, qNoAfter - qNo, qYesAfter - qYes, int256(b));
        // rawDelta in 18-decimal collateral units; convert up (round up) to 6-decimal.
        cost = _scaleDownCeil(uint256(rawDelta));
        fee = _feeOn(cost);
    }

    function _computeSell(uint8 outcome, uint256 shareAmount)
        internal
        view
        returns (uint256 payout, uint256 fee, int256 qNoAfter, int256 qYesAfter)
    {
        int256 dq = int256(shareAmount);
        qNoAfter = outcome == 0 ? qNo - dq : qNo;
        qYesAfter = outcome == 1 ? qYes - dq : qYes;

        // Reducing q decreases cost; deltaCost returns negative. Flip to get payout magnitude.
        int256 rawDelta = LMSRPricing.deltaCost(qNo, qYes, qNoAfter - qNo, qYesAfter - qYes, int256(b));
        // rawDelta ≤ 0; its magnitude is the gross collateral owed to the seller.
        if (rawDelta > 0) {
            // Would only happen on weird boundary; treat as zero payout to be safe.
            return (0, 0, qNoAfter, qYesAfter);
        }
        uint256 raw = uint256(-rawDelta);
        // Convert down (round down, in user's favor on payout reduction) to 6-decimal.
        payout = raw / SCALE;
        fee = _feeOn(payout);
    }

    function _feeOn(uint256 amount) internal view returns (uint256) {
        // Round up so fee is never understated.
        return (amount * feeBps + BPS - 1) / BPS;
    }

    function _scaleDownCeil(uint256 x) internal pure returns (uint256) {
        // Round up so the trader pays at least the true cost, never less.
        return (x + SCALE - 1) / SCALE;
    }
}
