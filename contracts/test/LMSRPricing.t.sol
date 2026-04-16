// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Test } from "forge-std/Test.sol";
import { LMSRPricing } from "src/LMSRPricing.sol";

contract LMSRPricingTest is Test {
    int256 internal constant B = 100e18; // liquidity parameter (spec § 6)
    int256 internal constant ONE = 1e18;
    int256 internal constant HALF = 0.5e18;

    // ---------- Analytic fixtures ----------
    // ln(2)  ≈ 0.6931471805599453
    // ln(1+e) ≈ 1.3132616875182228
    // e/(1+e) ≈ 0.7310585786300049

    int256 internal constant LN2_E18 = 693147180559945309;
    int256 internal constant LN1PLUSE_E18 = 1313261687518222834;
    int256 internal constant E_OVER_1PLUSE_E18 = 731058578630004896;

    /// Tolerance for fixture comparisons. PRB exp/ln is high-precision but not exact.
    uint256 internal constant TOL = 1e10; // 1e-8 relative to 1e18

    // ---------- Cost ----------

    function test_CostAtNeutralEqualsBLn2() public pure {
        int256 c = LMSRPricing.cost(0, 0, B);
        // cost = b * ln(2) = 100 * 0.693147... ≈ 69.31e18
        assertApproxEqAbs(c, 100 * LN2_E18, TOL);
    }

    function test_CostAsymmetricAgainstAnalyticalValue() public pure {
        // q1 = b (one unit of leverage in YES), q0 = 0
        // cost = b * ln(1 + e) ≈ 100 * 1.3132... ≈ 131.32e18
        int256 c = LMSRPricing.cost(0, B, B);
        assertApproxEqAbs(c, 100 * LN1PLUSE_E18, TOL);
    }

    function test_CostIsSymmetric() public pure {
        // cost(q0, q1, b) == cost(q1, q0, b)
        int256 a = LMSRPricing.cost(42e18, 17e18, B);
        int256 b_ = LMSRPricing.cost(17e18, 42e18, B);
        assertEq(a, b_);
    }

    function test_CostIsMonotonicInEitherOutcome() public pure {
        int256 c0 = LMSRPricing.cost(0, 0, B);
        int256 c1 = LMSRPricing.cost(5e18, 0, B);
        int256 c2 = LMSRPricing.cost(10e18, 0, B);
        assertGt(c1, c0);
        assertGt(c2, c1);
    }

    // ---------- Price ----------

    function test_PriceAtNeutralIsHalf() public pure {
        int256 pNo = LMSRPricing.price(0, 0, B, 0);
        int256 pYes = LMSRPricing.price(0, 0, B, 1);
        assertApproxEqAbs(pNo, HALF, TOL);
        assertApproxEqAbs(pYes, HALF, TOL);
    }

    function test_PriceAsymmetric() public pure {
        // q1 = b → price_yes = e/(1+e) ≈ 0.731, price_no = 1/(1+e) ≈ 0.269
        int256 pYes = LMSRPricing.price(0, B, B, 1);
        int256 pNo = LMSRPricing.price(0, B, B, 0);
        assertApproxEqAbs(pYes, E_OVER_1PLUSE_E18, TOL);
        assertApproxEqAbs(pNo, ONE - E_OVER_1PLUSE_E18, TOL);
    }

    /// External wrapper so `vm.expectRevert` can observe the library revert at the right depth.
    function priceExternal(int256 q0, int256 q1, int256 b, uint8 outcome) external pure returns (int256) {
        return LMSRPricing.price(q0, q1, b, outcome);
    }

    function test_PriceRevertsOnInvalidOutcome() public {
        vm.expectRevert(LMSRPricing.InvalidOutcome.selector);
        this.priceExternal(0, 0, B, 2);
    }

    function testFuzz_PriceSumsToOne(int96 q0, int96 q1) public pure {
        // Bound q/b so PRB's exp stays within safe range (EXP_MAX_INPUT ≈ 133).
        // With b = 100e18, cap |q| at 1000e18 → |q/b| ≤ 10, well under the limit.
        int256 a = bound(int256(q0), -1000e18, 1000e18);
        int256 b2 = bound(int256(q1), -1000e18, 1000e18);

        int256 p0 = LMSRPricing.price(a, b2, B, 0);
        int256 p1 = LMSRPricing.price(a, b2, B, 1);

        // Sum must be exactly 1e18 ± a few wei of rounding.
        assertApproxEqAbs(p0 + p1, ONE, 10);
    }

    function testFuzz_PricesInUnitInterval(int96 q0, int96 q1) public pure {
        int256 a = bound(int256(q0), -1000e18, 1000e18);
        int256 b2 = bound(int256(q1), -1000e18, 1000e18);

        int256 p0 = LMSRPricing.price(a, b2, B, 0);
        int256 p1 = LMSRPricing.price(a, b2, B, 1);

        assertGe(p0, 0);
        assertLe(p0, ONE);
        assertGe(p1, 0);
        assertLe(p1, ONE);
    }

    // ---------- DeltaCost ----------

    function test_DeltaCostMatchesCostDiff() public pure {
        int256 q0 = 20e18;
        int256 q1 = 30e18;
        int256 dq0 = 5e18;
        int256 dq1 = 0;

        int256 before_ = LMSRPricing.cost(q0, q1, B);
        int256 after_ = LMSRPricing.cost(q0 + dq0, q1 + dq1, B);
        int256 expected = after_ - before_;

        int256 actual = LMSRPricing.deltaCost(q0, q1, dq0, dq1, B);
        assertEq(actual, expected);
    }

    function testFuzz_DeltaCostEqualsCostDifference(int96 q0, int96 q1, int96 dq0, int96 dq1) public pure {
        int256 a = bound(int256(q0), 0, 500e18);
        int256 b2 = bound(int256(q1), 0, 500e18);
        int256 da = bound(int256(dq0), 0, 100e18);
        int256 db = bound(int256(dq1), 0, 100e18);

        int256 expected = LMSRPricing.cost(a + da, b2 + db, B) - LMSRPricing.cost(a, b2, B);
        int256 actual = LMSRPricing.deltaCost(a, b2, da, db, B);

        assertEq(actual, expected);
    }

    function test_BuyingRaisesOutcomePrice() public pure {
        // Buying YES shares (dq1 > 0) should raise priceYes.
        int256 pBefore = LMSRPricing.price(0, 0, B, 1);
        int256 pAfter = LMSRPricing.price(0, 10e18, B, 1);
        assertGt(pAfter, pBefore);
    }

    function test_BuyingCostsMoreWhenOutcomeIsFavored() public pure {
        // At neutral, buying 1 share of YES costs some amount.
        int256 costNeutral = LMSRPricing.deltaCost(0, 0, 0, 1e18, B);
        // When YES is already 70%-ish, buying 1 more YES share costs more.
        int256 costFavored = LMSRPricing.deltaCost(0, B, 0, 1e18, B);
        assertGt(costFavored, costNeutral);
    }
}
