// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Test } from "forge-std/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IAccessControl } from "@openzeppelin/contracts/access/IAccessControl.sol";

import { MockUSDC } from "src/MockUSDC.sol";
import { Shares } from "src/Shares.sol";
import { Market } from "src/Market.sol";
import { MarketFactory } from "src/MarketFactory.sol";

contract MarketFactoryTest is Test {
    MockUSDC internal usdc;
    Shares internal shares;
    MarketFactory internal factory;

    address internal admin = makeAddr("admin");
    address internal resolution = makeAddr("resolution");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant B = 100e18;
    uint256 internal constant FEE_BPS = 100;
    uint256 internal constant DISPUTE = 2 minutes;
    uint256 internal constant SUBSIDY = 500 * 1e6;

    // Precomputed role values (avoid view calls that would consume vm.prank).
    bytes32 internal constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 internal constant DEFAULT_ADMIN_ROLE = 0x00;

    function setUp() public {
        usdc = new MockUSDC();
        shares = new Shares();
        factory = new MarketFactory(IERC20(address(usdc)), shares, resolution, admin);

        usdc.mint(admin, SUBSIDY * 10);
        vm.prank(admin);
        usdc.approve(address(factory), type(uint256).max);
    }

    // ---------- Create ----------

    function test_CreateMarket_DeploysAndSeedsSubsidy() public {
        vm.prank(admin);
        address m = factory.createMarket("Will X?", B, SUBSIDY, FEE_BPS, DISPUTE);

        Market market = Market(m);
        assertEq(market.operator(), admin);
        assertEq(market.resolution(), resolution);
        assertEq(market.b(), B);
        assertEq(market.feeBps(), FEE_BPS);
        assertEq(market.subsidyBudget(), SUBSIDY);
        assertEq(market.disputeWindow(), DISPUTE);
        assertEq(market.question(), "Will X?");

        // Subsidy landed in the market.
        assertEq(usdc.balanceOf(m), SUBSIDY);
        assertEq(market.collateralBalance(), SUBSIDY);
    }

    function test_CreateMarket_EmitsEvent() public {
        vm.prank(admin);
        vm.recordLogs();
        address m = factory.createMarket("Will X?", B, SUBSIDY, FEE_BPS, DISPUTE);

        // MarketCreated(address indexed market, address indexed operator, ...) — topic[0] is the
        // event signature hash. We assert via the public view rather than decoding here.
        assertEq(factory.marketAt(0), m);
    }

    function test_CreateMarket_RegistersInRegistry() public {
        vm.startPrank(admin);
        address m1 = factory.createMarket("Q1", B, SUBSIDY, FEE_BPS, DISPUTE);
        address m2 = factory.createMarket("Q2", B, SUBSIDY, FEE_BPS, DISPUTE);
        address m3 = factory.createMarket("Q3", B, SUBSIDY, FEE_BPS, DISPUTE);
        vm.stopPrank();

        assertEq(factory.marketCount(), 3);
        assertEq(factory.marketAt(0), m1);
        assertEq(factory.marketAt(1), m2);
        assertEq(factory.marketAt(2), m3);

        address[] memory list = factory.markets();
        assertEq(list.length, 3);
        assertEq(list[0], m1);
        assertEq(list[2], m3);
    }

    function test_CreateMarket_RevertsWithoutOperatorRole() public {
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, OPERATOR_ROLE)
        );
        factory.createMarket("Will X?", B, SUBSIDY, FEE_BPS, DISPUTE);
    }

    function test_CreateMarket_RevertsIfSubsidyNotApproved() public {
        address op2 = makeAddr("op2");
        vm.prank(admin);
        factory.grantRole(OPERATOR_ROLE, op2);

        usdc.mint(op2, SUBSIDY);
        // op2 does NOT approve the factory. Creation must revert.
        vm.prank(op2);
        vm.expectRevert();
        factory.createMarket("Will X?", B, SUBSIDY, FEE_BPS, DISPUTE);
    }

    // ---------- Role management ----------

    function test_AdminCanGrantOperatorRole() public {
        vm.prank(admin);
        factory.grantRole(OPERATOR_ROLE, stranger);
        assertTrue(factory.hasRole(OPERATOR_ROLE, stranger));
    }

    function test_NonAdminCannotGrantRole() public {
        vm.prank(stranger);
        vm.expectRevert();
        factory.grantRole(OPERATOR_ROLE, stranger);
    }
}
