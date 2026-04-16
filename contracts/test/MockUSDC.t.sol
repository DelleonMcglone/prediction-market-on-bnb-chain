// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Test } from "forge-std/Test.sol";
import { MockUSDC } from "src/MockUSDC.sol";

contract MockUSDCTest is Test {
    MockUSDC internal usdc;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    function setUp() public {
        usdc = new MockUSDC();
    }

    function test_MetadataMatchesRealUSDC() public view {
        assertEq(usdc.name(), "Mock USD Coin");
        assertEq(usdc.symbol(), "mUSDC");
        assertEq(usdc.decimals(), 6);
    }

    function test_MintIncreasesBalanceAndTotalSupply() public {
        usdc.mint(alice, 1_000 * 1e6);
        assertEq(usdc.balanceOf(alice), 1_000 * 1e6);
        assertEq(usdc.totalSupply(), 1_000 * 1e6);
    }

    function test_AnyCallerCanMint() public {
        vm.prank(bob);
        usdc.mint(alice, 42);
        assertEq(usdc.balanceOf(alice), 42);
    }

    function test_Transfer() public {
        usdc.mint(alice, 100 * 1e6);
        vm.prank(alice);
        usdc.transfer(bob, 30 * 1e6);
        assertEq(usdc.balanceOf(alice), 70 * 1e6);
        assertEq(usdc.balanceOf(bob), 30 * 1e6);
    }

    function testFuzz_MintAnyAmount(address to, uint128 amount) public {
        vm.assume(to != address(0));
        usdc.mint(to, amount);
        assertEq(usdc.balanceOf(to), amount);
    }
}
