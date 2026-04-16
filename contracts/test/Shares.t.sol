// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Test } from "forge-std/Test.sol";
import { Shares } from "src/Shares.sol";

contract SharesTest is Test {
    Shares internal shares;

    address internal marketA = makeAddr("marketA");
    address internal marketB = makeAddr("marketB");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    function setUp() public {
        shares = new Shares();
    }

    // ---------- ID encoding ----------

    function test_IdForEncodesMarketAndOutcome() public view {
        uint256 idYes = shares.idFor(marketA, 1);
        uint256 idNo = shares.idFor(marketA, 0);

        assertEq(shares.marketFromId(idYes), marketA);
        assertEq(shares.marketFromId(idNo), marketA);
        assertEq(shares.outcomeFromId(idYes), 1);
        assertEq(shares.outcomeFromId(idNo), 0);
        assertTrue(idYes != idNo);
    }

    function test_IdFor_RevertsOnInvalidOutcome() public {
        vm.expectRevert(Shares.InvalidOutcome.selector);
        shares.idFor(marketA, 2);
    }

    function test_IdsAreDistinctAcrossMarkets() public view {
        assertTrue(shares.idFor(marketA, 1) != shares.idFor(marketB, 1));
        assertTrue(shares.idFor(marketA, 0) != shares.idFor(marketB, 0));
    }

    function testFuzz_IdRoundtrip(address market, uint8 outcome) public view {
        outcome = uint8(bound(outcome, 0, 1));
        uint256 id = shares.idFor(market, outcome);
        assertEq(shares.marketFromId(id), market);
        assertEq(shares.outcomeFromId(id), outcome);
    }

    // ---------- Mint access control ----------

    function test_MintSucceedsWhenCallerIsMarketInId() public {
        vm.prank(marketA);
        shares.mint(alice, 1, 100); // outcome YES
        assertEq(shares.balanceOf(alice, shares.idFor(marketA, 1)), 100);
    }

    function test_MintRevertsWhenCallerNotMarketInId() public {
        // marketB tries to mint into alice's position in marketA — impossible
        // because mint derives the id from msg.sender; marketB can only mint its own ids.
        vm.prank(marketB);
        shares.mint(alice, 1, 100);
        // shares were minted for marketB's YES outcome, not marketA's.
        assertEq(shares.balanceOf(alice, shares.idFor(marketA, 1)), 0);
        assertEq(shares.balanceOf(alice, shares.idFor(marketB, 1)), 100);
    }

    function test_MintRevertsOnInvalidOutcome() public {
        vm.prank(marketA);
        vm.expectRevert(Shares.InvalidOutcome.selector);
        shares.mint(alice, 2, 100);
    }

    // ---------- Burn access control ----------

    function test_BurnByMarket() public {
        vm.prank(marketA);
        shares.mint(alice, 1, 100);

        vm.prank(marketA);
        shares.burn(alice, 1, 40);

        assertEq(shares.balanceOf(alice, shares.idFor(marketA, 1)), 60);
    }

    function test_BurnRevertsFromDifferentMarket() public {
        vm.prank(marketA);
        shares.mint(alice, 1, 100);

        // marketB attempts to burn alice's marketA shares by calling burn(alice, 1, ...).
        // The id is derived from msg.sender (marketB), so it only affects marketB's
        // balance for alice — which is zero. That underflows and reverts.
        vm.prank(marketB);
        vm.expectRevert();
        shares.burn(alice, 1, 40);

        // marketA balance untouched
        assertEq(shares.balanceOf(alice, shares.idFor(marketA, 1)), 100);
    }

    // ---------- Standard ERC1155 transfer ----------

    function test_HolderCanTransfer() public {
        vm.prank(marketA);
        shares.mint(alice, 1, 100);

        uint256 id = shares.idFor(marketA, 1);
        vm.prank(alice);
        shares.safeTransferFrom(alice, bob, id, 30, "");

        assertEq(shares.balanceOf(alice, id), 70);
        assertEq(shares.balanceOf(bob, id), 30);
    }
}
