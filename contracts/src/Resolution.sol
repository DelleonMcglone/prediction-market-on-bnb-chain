// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { Market } from "src/Market.sol";

/// @title Resolution
/// @notice Handles outcome submission, dispute windows, finalization, and claims for all
///         markets deployed by the MarketFactory.
/// @dev Role-gated: `OPERATOR_ROLE` may submit outcomes. Anyone may trigger `finalize`
///      once the dispute window has elapsed. Holders claim via this contract; it delegates
///      to the market which actually owns the shares and collateral.
contract Resolution is AccessControl, ReentrancyGuard {
    // ---------- Roles ----------

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // ---------- Types ----------

    enum Status {
        Unresolved,
        Proposed,
        Finalized
    }

    struct MarketResolution {
        Status status;
        uint8 proposedOutcome;
        uint64 disputeEndsAt;
    }

    // ---------- Errors ----------

    error InvalidOutcome();
    error AlreadyProposed();
    error NotProposed();
    error DisputeWindowActive(uint256 endsAt);
    error AlreadyFinalized();

    // ---------- Events ----------

    event OutcomeSubmitted(address indexed market, uint8 outcome, uint64 disputeEndsAt);
    event Finalized(address indexed market, uint8 outcome);
    event Claimed(address indexed market, address indexed holder, uint256 payout);

    // ---------- State ----------

    mapping(address market => MarketResolution) public resolutionOf;

    // ---------- Constructor ----------

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    // ---------- Operator flow ----------

    /// @notice Submit the winning outcome for `market`. Starts its dispute window.
    function submitOutcome(address market, uint8 outcome) external onlyRole(OPERATOR_ROLE) {
        if (outcome > 1) revert InvalidOutcome();
        MarketResolution storage r = resolutionOf[market];
        if (r.status != Status.Unresolved) revert AlreadyProposed();

        uint64 endsAt = uint64(block.timestamp + Market(market).disputeWindow());
        r.status = Status.Proposed;
        r.proposedOutcome = outcome;
        r.disputeEndsAt = endsAt;

        emit OutcomeSubmitted(market, outcome, endsAt);
    }

    /// @notice Anyone may finalize once the dispute window has passed.
    function finalize(address market) external {
        MarketResolution storage r = resolutionOf[market];
        if (r.status == Status.Unresolved) revert NotProposed();
        if (r.status == Status.Finalized) revert AlreadyFinalized();
        if (block.timestamp < r.disputeEndsAt) revert DisputeWindowActive(r.disputeEndsAt);

        r.status = Status.Finalized;
        Market(market).setResolved(r.proposedOutcome);

        emit Finalized(market, r.proposedOutcome);
    }

    // ---------- Holder flow ----------

    /// @notice Burn the caller's winning shares in `market` and pay out collateral.
    /// @return payout Collateral received, 6-decimal. Zero if caller holds no winning shares.
    function claim(address market) external nonReentrant returns (uint256 payout) {
        MarketResolution storage r = resolutionOf[market];
        if (r.status != Status.Finalized) revert NotProposed();
        payout = Market(market).handleClaim(msg.sender);
        emit Claimed(market, msg.sender, payout);
    }

    // ---------- Views ----------

    function isResolved(address market) external view returns (bool) {
        return resolutionOf[market].status == Status.Finalized;
    }

    function outcomeOf(address market) external view returns (uint8) {
        return resolutionOf[market].proposedOutcome;
    }

    function disputeEndsAt(address market) external view returns (uint256) {
        return resolutionOf[market].disputeEndsAt;
    }

    function statusOf(address market) external view returns (Status) {
        return resolutionOf[market].status;
    }
}
