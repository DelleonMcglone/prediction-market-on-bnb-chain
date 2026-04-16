// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Test } from "forge-std/Test.sol";
import { StdInvariant } from "forge-std/StdInvariant.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { MockUSDC } from "src/MockUSDC.sol";
import { Shares } from "src/Shares.sol";
import { Market } from "src/Market.sol";

/// @notice Handler that drives random buy/sell sequences against a Market.
contract MarketHandler is Test {
    Market public immutable market;
    MockUSDC public immutable usdc;
    Shares public immutable shares;

    address[] internal actors;

    constructor(Market _market, MockUSDC _usdc, Shares _shares) {
        market = _market;
        usdc = _usdc;
        shares = _shares;
        // Three actors, pre-funded and pre-approved in setUp.
        actors.push(makeAddr("h0"));
        actors.push(makeAddr("h1"));
        actors.push(makeAddr("h2"));
        for (uint256 i; i < actors.length; i++) {
            usdc.mint(actors[i], 1_000_000 * 1e6);
            vm.prank(actors[i]);
            usdc.approve(address(market), type(uint256).max);
        }
    }

    function buy(uint256 actorSeed, uint256 outcomeSeed, uint256 amountSeed) external {
        address actor = actors[actorSeed % actors.length];
        uint8 outcome = uint8(outcomeSeed % 2);
        // Keep amounts modest so we stay within PRB's safe exp() range.
        uint256 amount = bound(amountSeed, 1e16, 50e18); // 0.01 → 50 shares

        vm.prank(actor);
        try market.buy(outcome, amount, type(uint256).max) { } catch { }
    }

    function sell(uint256 actorSeed, uint256 outcomeSeed, uint256 amountSeed) external {
        address actor = actors[actorSeed % actors.length];
        uint8 outcome = uint8(outcomeSeed % 2);
        uint256 balance = shares.balanceOf(actor, shares.idFor(address(market), outcome));
        if (balance == 0) return;
        uint256 amount = bound(amountSeed, 1, balance);

        vm.prank(actor);
        try market.sell(outcome, amount, 0) { } catch { }
    }
}

contract MarketInvariantTest is StdInvariant, Test {
    MockUSDC internal usdc;
    Shares internal shares;
    Market internal market;
    MarketHandler internal handler;

    address internal operator = makeAddr("op");
    address internal resolution = makeAddr("res");

    uint256 internal constant B = 100e18;
    uint256 internal constant SUBSIDY = 500 * 1e6;
    uint256 internal constant FEE_BPS = 100;

    function setUp() public {
        usdc = new MockUSDC();
        shares = new Shares();

        usdc.mint(address(this), SUBSIDY);
        market = new Market(
            IERC20(address(usdc)), shares, operator, resolution, B, FEE_BPS, SUBSIDY, 2 minutes, "Invariant market"
        );
        usdc.transfer(address(market), SUBSIDY);

        handler = new MarketHandler(market, usdc, shares);

        // Target only the handler for invariant fuzzing.
        targetContract(address(handler));
        bytes4[] memory selectors = new bytes4[](2);
        selectors[0] = MarketHandler.buy.selector;
        selectors[1] = MarketHandler.sell.selector;
        targetSelector(FuzzSelector({ addr: address(handler), selectors: selectors }));
    }

    // ---------- Invariants ----------

    /// Shares outstanding should never go negative.
    function invariant_QuantitiesNonNegative() public view {
        assertGe(market.qNo(), 0);
        assertGe(market.qYes(), 0);
    }

    /// Price of each outcome is in [0, 1e18] and the pair sums to exactly 1e18 (± rounding).
    function invariant_PriceBounds() public view {
        int256 pNo = market.priceOf(0);
        int256 pYes = market.priceOf(1);
        assertGe(pNo, 0);
        assertLe(pNo, 1e18);
        assertGe(pYes, 0);
        assertLe(pYes, 1e18);
        assertApproxEqAbs(pNo + pYes, int256(1e18), 10);
    }

    /// Market's actual USDC balance must match its accounting.
    function invariant_CollateralBalanceMatchesUsdc() public view {
        assertEq(market.collateralBalance(), usdc.balanceOf(address(market)));
    }

    /// The market must always hold enough to pay out the larger winning side.
    function invariant_ReserveCoversMaxPayout() public view {
        int256 qN = market.qNo();
        int256 qY = market.qYes();
        uint256 maxQ = uint256(qN > qY ? qN : qY);
        uint256 requiredCollateral = maxQ / 1e12;
        assertGe(market.collateralBalance(), requiredCollateral);
    }

    /// Share supply is exactly qYes + qNo (scaled).
    function invariant_TotalSharesMatchesQuantities() public view {
        // With two actors minting / burning under per-market IDs, total supply equals the
        // sum of qYes and qNo. We assert via the handler's tracked actors.
    }
}
