// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Test } from "forge-std/Test.sol";
import { MockUSDC } from "src/MockUSDC.sol";
import { Dispenser } from "src/Dispenser.sol";

contract DispenserTest is Test {
    MockUSDC internal usdc;
    Dispenser internal dispenser;

    address internal admin = makeAddr("admin");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    uint256 internal constant USDC_DRIP = 100 * 1e6; // 100 USDC
    uint256 internal constant BNB_DRIP = 0.01 ether;

    function setUp() public {
        usdc = new MockUSDC();
        dispenser = new Dispenser(usdc, USDC_DRIP, BNB_DRIP, admin);

        // Fund the dispenser with tBNB for gas drips.
        vm.deal(address(dispenser), 1 ether);
    }

    // ---------- Drip ----------

    function test_FirstDripSucceeds() public {
        uint256 aliceBnbBefore = alice.balance;

        vm.prank(alice);
        dispenser.drip();

        assertEq(usdc.balanceOf(alice), USDC_DRIP);
        assertEq(alice.balance, aliceBnbBefore + BNB_DRIP);
        assertTrue(dispenser.served(alice));
    }

    function test_SecondDripFromSameAddressReverts() public {
        vm.prank(alice);
        dispenser.drip();

        vm.prank(alice);
        vm.expectRevert(Dispenser.AlreadyServed.selector);
        dispenser.drip();
    }

    function test_MultipleAddressesCanDrip() public {
        vm.prank(alice);
        dispenser.drip();
        vm.prank(bob);
        dispenser.drip();

        assertEq(usdc.balanceOf(alice), USDC_DRIP);
        assertEq(usdc.balanceOf(bob), USDC_DRIP);
    }

    function test_Drip_RevertsWhenDispenserUnderfunded() public {
        // Deploy a new dispenser with no tBNB.
        Dispenser empty = new Dispenser(usdc, USDC_DRIP, BNB_DRIP, admin);

        vm.prank(alice);
        vm.expectRevert(Dispenser.InsufficientReserves.selector);
        empty.drip();
    }

    // ---------- Admin withdraw ----------

    function test_AdminCanWithdraw() public {
        // Seed dispenser with both MockUSDC and tBNB.
        usdc.mint(address(dispenser), 500 * 1e6);
        // tBNB already deposited in setUp.

        uint256 adminBnbBefore = admin.balance;

        vm.prank(admin);
        dispenser.withdraw(admin);

        assertEq(usdc.balanceOf(address(dispenser)), 0);
        assertEq(address(dispenser).balance, 0);
        assertEq(usdc.balanceOf(admin), 500 * 1e6);
        assertEq(admin.balance, adminBnbBefore + 1 ether);
    }

    function test_NonAdminCannotWithdraw() public {
        vm.prank(alice);
        vm.expectRevert();
        dispenser.withdraw(alice);
    }

    // ---------- Receive ----------

    function test_ReceivesBNB() public {
        uint256 before_ = address(dispenser).balance;
        vm.deal(address(this), 1 ether);
        (bool ok,) = address(dispenser).call{ value: 0.5 ether }("");
        assertTrue(ok);
        assertEq(address(dispenser).balance, before_ + 0.5 ether);
    }

    // ---------- Views ----------

    function test_Refillable() public view {
        (uint256 usdcAvail, uint256 bnbAvail) = dispenser.refillable();
        assertEq(usdcAvail, type(uint256).max);
        assertEq(bnbAvail, 1 ether);
    }
}
