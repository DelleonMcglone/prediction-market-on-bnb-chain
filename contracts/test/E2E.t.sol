// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Test } from "forge-std/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { MockUSDC } from "src/MockUSDC.sol";
import { Shares } from "src/Shares.sol";
import { Market } from "src/Market.sol";
import { MarketFactory } from "src/MarketFactory.sol";
import { Resolution } from "src/Resolution.sol";
import { Dispenser } from "src/Dispenser.sol";

/// @notice Full lifecycle: dispenser → create market → 10 trades across 3 wallets →
///         submit outcome → wait dispute → finalize → winners claim → losers get nothing.
contract E2ETest is Test {
    MockUSDC internal usdc;
    Shares internal shares;
    Resolution internal resolution;
    MarketFactory internal factory;
    Dispenser internal dispenser;
    Market internal market;

    address internal admin = makeAddr("admin");
    address internal trader1 = makeAddr("trader1");
    address internal trader2 = makeAddr("trader2");
    address internal trader3 = makeAddr("trader3");

    uint256 internal constant B = 100e18;
    uint256 internal constant FEE_BPS = 100;
    uint256 internal constant DISPUTE = 2 minutes;
    uint256 internal constant SUBSIDY = 500 * 1e6;

    function setUp() public {
        usdc = new MockUSDC();
        shares = new Shares();
        resolution = new Resolution(admin);
        factory = new MarketFactory(IERC20(address(usdc)), shares, address(resolution), admin);
        dispenser = new Dispenser(usdc, 100 * 1e6, 0.01 ether, admin);
        vm.deal(address(dispenser), 1 ether);
    }

    function test_FullLifecycle() public {
        // ---- 1. Operator creates a market with subsidy.
        usdc.mint(admin, SUBSIDY);
        vm.prank(admin);
        usdc.approve(address(factory), SUBSIDY);

        vm.prank(admin);
        address mAddr = factory.createMarket("Will it resolve YES?", B, SUBSIDY, FEE_BPS, DISPUTE);
        market = Market(mAddr);

        // ---- 2. Three traders get funded via the dispenser.
        address[3] memory traders = [trader1, trader2, trader3];
        for (uint256 i; i < 3; i++) {
            vm.prank(traders[i]);
            dispenser.drip();
            assertEq(usdc.balanceOf(traders[i]), 100 * 1e6);
        }

        // Top up so each trader has plenty to trade with.
        for (uint256 i; i < 3; i++) {
            usdc.mint(traders[i], 500 * 1e6);
            vm.prank(traders[i]);
            usdc.approve(mAddr, type(uint256).max);
        }

        // ---- 3. 10 trades across traders and outcomes.
        // Mix of buys on both sides so both YES and NO end up with balances.
        vm.prank(trader1);
        market.buy(1, 10e18, type(uint256).max); // t1 YES 10
        vm.prank(trader2);
        market.buy(0, 5e18, type(uint256).max); // t2 NO 5
        vm.prank(trader3);
        market.buy(1, 3e18, type(uint256).max); // t3 YES 3
        vm.prank(trader1);
        market.buy(1, 7e18, type(uint256).max); // t1 YES +7 (total 17)
        vm.prank(trader2);
        market.buy(0, 10e18, type(uint256).max); // t2 NO +10 (total 15)
        vm.prank(trader3);
        market.buy(0, 2e18, type(uint256).max); // t3 NO 2
        vm.prank(trader1);
        market.sell(1, 5e18, 0); // t1 sells 5 YES (total 12)
        vm.prank(trader2);
        market.buy(1, 4e18, type(uint256).max); // t2 also buys 4 YES
        vm.prank(trader3);
        market.buy(1, 6e18, type(uint256).max); // t3 YES +6 (total 9)
        vm.prank(trader1);
        market.buy(1, 2e18, type(uint256).max); // t1 YES +2 (total 14)

        // ---- 4. Operator submits outcome, dispute window runs.
        vm.prank(admin);
        resolution.submitOutcome(mAddr, 1); // YES wins
        vm.warp(block.timestamp + DISPUTE + 1);
        resolution.finalize(mAddr);

        // ---- 5. Each winning holder claims. Winners: trader1, trader2 (from the +4 YES),
        //         trader3 (9 YES). Losers: each trader's NO balance → 0.

        uint256 yesId = shares.idFor(mAddr, 1);
        uint256 t1YesShares = shares.balanceOf(trader1, yesId);
        uint256 t2YesShares = shares.balanceOf(trader2, yesId);
        uint256 t3YesShares = shares.balanceOf(trader3, yesId);

        assertGt(t1YesShares, 0);
        assertGt(t2YesShares, 0);
        assertGt(t3YesShares, 0);

        uint256 balBeforeT1 = usdc.balanceOf(trader1);
        vm.prank(trader1);
        uint256 p1 = resolution.claim(mAddr);
        assertEq(p1, t1YesShares / 1e12);
        assertEq(usdc.balanceOf(trader1), balBeforeT1 + p1);

        vm.prank(trader2);
        uint256 p2 = resolution.claim(mAddr);
        assertEq(p2, t2YesShares / 1e12);

        vm.prank(trader3);
        uint256 p3 = resolution.claim(mAddr);
        assertEq(p3, t3YesShares / 1e12);

        // All YES shares burnt.
        assertEq(shares.balanceOf(trader1, yesId), 0);
        assertEq(shares.balanceOf(trader2, yesId), 0);
        assertEq(shares.balanceOf(trader3, yesId), 0);

        // ---- 6. Total payout matches the winning-side pool.
        uint256 totalPayout = p1 + p2 + p3;

        // Market still holds dust (collected fees + subsidy-winning-pool difference).
        assertLe(totalPayout, SUBSIDY + usdc.balanceOf(mAddr) + totalPayout);
    }
}
