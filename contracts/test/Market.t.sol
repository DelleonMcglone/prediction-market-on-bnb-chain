// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Test } from "forge-std/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { MockUSDC } from "src/MockUSDC.sol";
import { Shares } from "src/Shares.sol";
import { Market } from "src/Market.sol";

contract MarketTest is Test {
    MockUSDC internal usdc;
    Shares internal shares;
    Market internal market;

    address internal operator = makeAddr("operator");
    address internal resolution = makeAddr("resolution");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    uint256 internal constant B = 100e18; // liquidity param
    uint256 internal constant FEE_BPS = 100; // 1%
    uint256 internal constant SUBSIDY = 500 * 1e6; // $500

    function setUp() public {
        usdc = new MockUSDC();
        shares = new Shares();

        // Fund this test contract so it can deposit subsidy on behalf of the factory.
        usdc.mint(address(this), SUBSIDY);

        market = new Market(
            IERC20(address(usdc)), shares, operator, resolution, B, FEE_BPS, SUBSIDY, 2 minutes, "Will X happen?"
        );

        // Deposit subsidy to the market (simulating the factory's transfer).
        usdc.transfer(address(market), SUBSIDY);

        // Seed trader balances.
        usdc.mint(alice, 1_000 * 1e6);
        usdc.mint(bob, 1_000 * 1e6);
        vm.prank(alice);
        usdc.approve(address(market), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(market), type(uint256).max);
    }

    // ---------- Initial state ----------

    function test_InitialState() public view {
        assertEq(market.qNo(), 0);
        assertEq(market.qYes(), 0);
        assertEq(market.collateralBalance(), SUBSIDY);
        assertEq(market.subsidyBudget(), SUBSIDY);
        assertFalse(market.paused());
        assertFalse(market.resolved());
        assertEq(market.priceOf(0), 0.5e18);
        assertEq(market.priceOf(1), 0.5e18);
    }

    // ---------- Buy ----------

    function test_BuyYes_TransfersCollateralAndMintsShares() public {
        uint256 amount = 10e18;
        (uint256 cost, uint256 fee,) = market.previewBuy(1, amount);
        uint256 total = cost + fee;

        uint256 aliceBalBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        uint256 paid = market.buy(1, amount, total);

        assertEq(paid, total);
        assertEq(usdc.balanceOf(alice), aliceBalBefore - total);
        assertEq(market.collateralBalance(), SUBSIDY + total);
        assertEq(shares.balanceOf(alice, shares.idFor(address(market), 1)), amount);
        assertEq(market.qYes(), int256(amount));
        assertEq(market.qNo(), 0);
    }

    function test_BuyYes_PriceRises() public {
        int256 pBefore = market.priceOf(1);
        vm.prank(alice);
        market.buy(1, 20e18, type(uint256).max);
        int256 pAfter = market.priceOf(1);
        assertGt(pAfter, pBefore);
    }

    function test_Buy_RevertsIfSlippageExceeded() public {
        (uint256 cost, uint256 fee,) = market.previewBuy(1, 10e18);
        uint256 tooLow = cost + fee - 1;
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Market.SlippageExceeded.selector, cost + fee, tooLow));
        market.buy(1, 10e18, tooLow);
    }

    function test_Buy_RevertsWhenZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(Market.AmountZero.selector);
        market.buy(1, 0, type(uint256).max);
    }

    function test_Buy_RevertsOnInvalidOutcome() public {
        vm.prank(alice);
        vm.expectRevert(Market.InvalidOutcome.selector);
        market.buy(2, 10e18, type(uint256).max);
    }

    function test_Buy_AccumulatesFeeIntoCollateralBalance() public {
        (uint256 cost, uint256 fee,) = market.previewBuy(1, 10e18);
        vm.prank(alice);
        market.buy(1, 10e18, cost + fee);

        // Market's balance grew by the full cost+fee.
        assertEq(usdc.balanceOf(address(market)), SUBSIDY + cost + fee);
        assertEq(market.collateralBalance(), SUBSIDY + cost + fee);
    }

    // ---------- Sell ----------

    function test_SellYes_BurnsSharesAndTransfersPayout() public {
        vm.prank(alice);
        market.buy(1, 20e18, type(uint256).max);

        (uint256 payout, uint256 fee,) = market.previewSell(1, 10e18);
        uint256 net = payout - fee;

        uint256 aliceBalBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        uint256 received = market.sell(1, 10e18, net);

        assertEq(received, net);
        assertEq(usdc.balanceOf(alice), aliceBalBefore + net);
        assertEq(shares.balanceOf(alice, shares.idFor(address(market), 1)), 10e18);
        assertEq(market.qYes(), 10e18);
    }

    function test_Sell_RevertsIfPayoutTooLow() public {
        vm.prank(alice);
        market.buy(1, 20e18, type(uint256).max);

        (uint256 payout, uint256 fee,) = market.previewSell(1, 10e18);
        uint256 tooHigh = payout - fee + 1;

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Market.PayoutTooLow.selector, payout - fee, tooHigh));
        market.sell(1, 10e18, tooHigh);
    }

    function test_Sell_RevertsWhenUserHasNoShares() public {
        vm.prank(bob);
        vm.expectRevert(); // ERC1155 underflow
        market.sell(1, 1e18, 0);
    }

    function test_Sell_RoundtripRoughlyReturnsCost() public {
        // Buy 10 YES, then immediately sell 10 YES. Net loss = ~2x fee (buy fee + sell fee) + rounding.
        uint256 balBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        uint256 cost = market.buy(1, 10e18, type(uint256).max);

        vm.prank(alice);
        uint256 payout = market.sell(1, 10e18, 0);

        uint256 balAfter = usdc.balanceOf(alice);
        uint256 netLoss = balBefore - balAfter;
        // Expected loss ≈ cost * fee + payout * fee ≈ 2% of cost. Allow some rounding slop.
        uint256 expectedMaxLoss = (cost * 2 * FEE_BPS) / 10_000 + 10;
        assertLe(netLoss, expectedMaxLoss);
        assertEq(cost - payout, netLoss);
    }

    // ---------- Pause ----------

    function test_Pause_OnlyOperator() public {
        vm.prank(alice);
        vm.expectRevert(Market.NotOperator.selector);
        market.pause();
    }

    function test_Pause_BlocksBuyAndSell() public {
        vm.prank(operator);
        market.pause();

        vm.prank(alice);
        vm.expectRevert(Market.NotActive.selector);
        market.buy(1, 10e18, type(uint256).max);

        vm.prank(alice);
        vm.expectRevert(Market.NotActive.selector);
        market.sell(1, 10e18, 0);
    }

    function test_Unpause_ResumesTrading() public {
        vm.prank(operator);
        market.pause();

        vm.prank(operator);
        market.unpause();

        vm.prank(alice);
        market.buy(1, 10e18, type(uint256).max);
    }

    // ---------- Resolution hooks ----------

    function test_SetResolved_OnlyResolution() public {
        vm.prank(operator);
        vm.expectRevert(Market.NotResolution.selector);
        market.setResolved(1);

        vm.prank(resolution);
        market.setResolved(1);
        assertTrue(market.resolved());
        assertEq(market.winningOutcome(), 1);
    }

    function test_SetResolved_DoubleSubmissionReverts() public {
        vm.prank(resolution);
        market.setResolved(1);

        vm.prank(resolution);
        vm.expectRevert(Market.AlreadyResolved.selector);
        market.setResolved(0);
    }

    function test_ResolvedMarket_BlocksTrading() public {
        vm.prank(resolution);
        market.setResolved(1);

        vm.prank(alice);
        vm.expectRevert(Market.NotActive.selector);
        market.buy(1, 10e18, type(uint256).max);
    }

    function test_HandleClaim_OnlyResolution() public {
        vm.prank(alice);
        vm.expectRevert(Market.NotResolution.selector);
        market.handleClaim(alice);
    }

    function test_HandleClaim_PaysWinnerAndBurnsShares() public {
        // Alice buys 20 YES, Bob buys 10 NO.
        vm.prank(alice);
        market.buy(1, 20e18, type(uint256).max);
        vm.prank(bob);
        market.buy(0, 10e18, type(uint256).max);

        vm.prank(resolution);
        market.setResolved(1); // YES wins

        uint256 aliceBalBefore = usdc.balanceOf(alice);
        vm.prank(resolution);
        uint256 payout = market.handleClaim(alice);

        // Alice held 20 YES shares (18-dec) → 20 USDC (6-dec) payout.
        assertEq(payout, 20 * 1e6);
        assertEq(usdc.balanceOf(alice), aliceBalBefore + 20 * 1e6);
        assertEq(shares.balanceOf(alice, shares.idFor(address(market), 1)), 0);
    }

    function test_HandleClaim_LoserGetsZero() public {
        vm.prank(alice);
        market.buy(1, 20e18, type(uint256).max);

        vm.prank(resolution);
        market.setResolved(0); // NO wins — alice loses

        uint256 aliceBalBefore = usdc.balanceOf(alice);
        vm.prank(resolution);
        uint256 payout = market.handleClaim(alice);
        assertEq(payout, 0);
        assertEq(usdc.balanceOf(alice), aliceBalBefore);
    }

    function test_HandleClaim_BeforeResolutionReverts() public {
        vm.prank(resolution);
        vm.expectRevert(Market.NotActive.selector);
        market.handleClaim(alice);
    }

    // ---------- Capacity guard ----------

    /// In 2-outcome LMSR the subsidy-reserve invariant is self-satisfying for any b*ln(2)
    /// initial subsidy, so the explicit {SubsidyExhausted} branch is only reachable in
    /// pathological states. What binds first for normal markets is PRB's exp() limit near
    /// q/b ≈ 133 — that's the natural "market capacity reached" boundary.
    function test_CapacityReached_ExtremeBuyReverts() public {
        usdc.mint(alice, 1_000_000 * 1e6);
        vm.prank(alice);
        usdc.approve(address(market), type(uint256).max);

        // qYes/b > 133 → PRB reverts inside exp().
        vm.prank(alice);
        vm.expectRevert(); // PRBMath_SD59x18_Exp_InputTooBig or similar
        market.buy(1, 14_000e18, type(uint256).max);
    }

    // ---------- Price continuity ----------

    function test_PriceContinuity_FiftyOneDollarTrades() public {
        // Spec § 9.3: 50 sequential small trades, prices should move smoothly.
        usdc.mint(alice, 10_000 * 1e6);
        vm.prank(alice);
        usdc.approve(address(market), type(uint256).max);

        int256 prevPrice = market.priceOf(1);
        for (uint256 i = 0; i < 50; i++) {
            vm.prank(alice);
            market.buy(1, 1e18, type(uint256).max); // 1 share at a time
            int256 p = market.priceOf(1);
            // Each small trade should nudge the price but not discontinuously.
            // With b = 100e18 and dq = 1e18, dp ≈ p*(1-p)/b ≈ 0.0025 at neutral.
            int256 delta = p - prevPrice;
            assertGt(delta, 0); // monotonic
            assertLt(delta, 0.05e18); // no 5¢ jumps
            prevPrice = p;
        }
    }
}
