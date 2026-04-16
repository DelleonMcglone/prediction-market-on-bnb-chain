// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Test } from "forge-std/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { MockUSDC } from "src/MockUSDC.sol";
import { Shares } from "src/Shares.sol";
import { Market } from "src/Market.sol";
import { MarketFactory } from "src/MarketFactory.sol";
import { Resolution } from "src/Resolution.sol";

contract ResolutionTest is Test {
    MockUSDC internal usdc;
    Shares internal shares;
    MarketFactory internal factory;
    Resolution internal resolution;
    Market internal market;

    address internal admin = makeAddr("admin");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant B = 100e18;
    uint256 internal constant FEE_BPS = 100;
    uint256 internal constant DISPUTE = 2 minutes;
    uint256 internal constant SUBSIDY = 500 * 1e6;

    function setUp() public {
        usdc = new MockUSDC();
        shares = new Shares();
        resolution = new Resolution(admin);
        factory = new MarketFactory(IERC20(address(usdc)), shares, address(resolution), admin);

        usdc.mint(admin, SUBSIDY);
        vm.prank(admin);
        usdc.approve(address(factory), type(uint256).max);

        vm.prank(admin);
        address m = factory.createMarket("Will X?", B, SUBSIDY, FEE_BPS, DISPUTE);
        market = Market(m);

        // Fund traders.
        usdc.mint(alice, 1_000 * 1e6);
        usdc.mint(bob, 1_000 * 1e6);
        vm.prank(alice);
        usdc.approve(address(market), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(market), type(uint256).max);
    }

    // ---------- Submit ----------

    function test_SubmitOutcome_SetsProposedAndDisputeEnd() public {
        vm.prank(admin);
        resolution.submitOutcome(address(market), 1);

        (Resolution.Status status, uint8 outcome, uint64 endsAt) = resolution.resolutionOf(address(market));
        assertEq(uint8(status), uint8(Resolution.Status.Proposed));
        assertEq(outcome, 1);
        assertEq(endsAt, block.timestamp + DISPUTE);
    }

    function test_SubmitOutcome_RevertsFromNonOperator() public {
        vm.prank(stranger);
        vm.expectRevert();
        resolution.submitOutcome(address(market), 1);
    }

    function test_SubmitOutcome_RevertsOnInvalidOutcome() public {
        vm.prank(admin);
        vm.expectRevert(Resolution.InvalidOutcome.selector);
        resolution.submitOutcome(address(market), 2);
    }

    function test_SubmitOutcome_RevertsOnDoubleSubmit() public {
        vm.prank(admin);
        resolution.submitOutcome(address(market), 1);
        vm.prank(admin);
        vm.expectRevert(Resolution.AlreadyProposed.selector);
        resolution.submitOutcome(address(market), 0);
    }

    // ---------- Finalize ----------

    function test_Finalize_RevertsDuringDisputeWindow() public {
        vm.prank(admin);
        resolution.submitOutcome(address(market), 1);

        vm.expectRevert();
        resolution.finalize(address(market));
    }

    function test_Finalize_SucceedsAfterDisputeWindow() public {
        vm.prank(admin);
        resolution.submitOutcome(address(market), 1);

        vm.warp(block.timestamp + DISPUTE + 1);
        resolution.finalize(address(market));

        assertTrue(resolution.isResolved(address(market)));
        assertTrue(market.resolved());
        assertEq(market.winningOutcome(), 1);
    }

    function test_Finalize_RevertsIfNotProposed() public {
        vm.expectRevert(Resolution.NotProposed.selector);
        resolution.finalize(address(market));
    }

    function test_Finalize_RevertsIfAlreadyFinalized() public {
        vm.prank(admin);
        resolution.submitOutcome(address(market), 1);
        vm.warp(block.timestamp + DISPUTE + 1);
        resolution.finalize(address(market));

        vm.expectRevert(Resolution.AlreadyFinalized.selector);
        resolution.finalize(address(market));
    }

    // ---------- Claim ----------

    function test_Claim_WinnerGetsPaid() public {
        // Alice buys 20 YES. Resolution → YES.
        vm.prank(alice);
        market.buy(1, 20e18, type(uint256).max);

        vm.prank(admin);
        resolution.submitOutcome(address(market), 1);
        vm.warp(block.timestamp + DISPUTE + 1);
        resolution.finalize(address(market));

        uint256 before_ = usdc.balanceOf(alice);
        vm.prank(alice);
        uint256 payout = resolution.claim(address(market));
        assertEq(payout, 20 * 1e6);
        assertEq(usdc.balanceOf(alice), before_ + 20 * 1e6);
    }

    function test_Claim_LoserGetsZero() public {
        vm.prank(alice);
        market.buy(1, 20e18, type(uint256).max);

        vm.prank(admin);
        resolution.submitOutcome(address(market), 0); // NO wins
        vm.warp(block.timestamp + DISPUTE + 1);
        resolution.finalize(address(market));

        uint256 before_ = usdc.balanceOf(alice);
        vm.prank(alice);
        uint256 payout = resolution.claim(address(market));
        assertEq(payout, 0);
        assertEq(usdc.balanceOf(alice), before_);
    }

    function test_Claim_RevertsBeforeFinalize() public {
        vm.prank(alice);
        market.buy(1, 20e18, type(uint256).max);

        vm.prank(admin);
        resolution.submitOutcome(address(market), 1);
        // No warp — still in dispute window.

        vm.prank(alice);
        vm.expectRevert(Resolution.NotProposed.selector);
        resolution.claim(address(market));
    }

    function test_Claim_DoubleClaimIsNoOp() public {
        vm.prank(alice);
        market.buy(1, 20e18, type(uint256).max);

        vm.prank(admin);
        resolution.submitOutcome(address(market), 1);
        vm.warp(block.timestamp + DISPUTE + 1);
        resolution.finalize(address(market));

        vm.prank(alice);
        resolution.claim(address(market));

        // Second claim returns 0 because shares are burned.
        uint256 beforeBal = usdc.balanceOf(alice);
        vm.prank(alice);
        uint256 payout = resolution.claim(address(market));
        assertEq(payout, 0);
        assertEq(usdc.balanceOf(alice), beforeBal);
    }

    function test_BothSidesBoughtOnlyWinnerClaims() public {
        vm.prank(alice);
        market.buy(1, 20e18, type(uint256).max); // alice: YES
        vm.prank(bob);
        market.buy(0, 30e18, type(uint256).max); // bob: NO

        vm.prank(admin);
        resolution.submitOutcome(address(market), 1); // YES wins
        vm.warp(block.timestamp + DISPUTE + 1);
        resolution.finalize(address(market));

        vm.prank(alice);
        uint256 alicePayout = resolution.claim(address(market));
        vm.prank(bob);
        uint256 bobPayout = resolution.claim(address(market));

        assertEq(alicePayout, 20 * 1e6);
        assertEq(bobPayout, 0);
    }

    // ---------- Anyone can finalize ----------

    function test_Finalize_CanBeCalledByAnyone() public {
        vm.prank(admin);
        resolution.submitOutcome(address(market), 1);
        vm.warp(block.timestamp + DISPUTE + 1);

        vm.prank(stranger);
        resolution.finalize(address(market));
        assertTrue(resolution.isResolved(address(market)));
    }
}
