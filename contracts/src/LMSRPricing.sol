// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { SD59x18, exp, ln } from "@prb/math/src/SD59x18.sol";

/// @title LMSRPricing
/// @notice Logarithmic Market Scoring Rule cost and price functions for a 2-outcome market.
/// @dev Stateless. All quantities are SD59x18 (signed, 18-decimal fixed-point).
///
///      Cost:    C(q0, q1) = b * ln( exp(q0/b) + exp(q1/b) )
///      Price:   p_i       = exp(q_i/b) / ( exp(q0/b) + exp(q1/b) )
///      Delta:   C(q+dq) - C(q)
///
///      PRB Math's `exp` reverts when its input exceeds ~133 (uEXP_MAX_INPUT). With b = 100e18,
///      that corresponds to quantities beyond ~13_300 units of collateral — well past any
///      trade we expect on the demo's subsidy-capped markets. The revert becomes the
///      implicit "market capacity reached" guard described in spec § 4.
library LMSRPricing {
    error InvalidOutcome();

    /// @notice Cost function C(q) = b * ln(exp(q0/b) + exp(q1/b)).
    /// @param q0 Shares outstanding on outcome 0 (NO), 18-decimal fixed-point.
    /// @param q1 Shares outstanding on outcome 1 (YES), 18-decimal fixed-point.
    /// @param b Liquidity parameter, 18-decimal fixed-point.
    /// @return c Cost, same units as q and b (18-decimal fixed-point collateral).
    function cost(int256 q0, int256 q1, int256 b) internal pure returns (int256 c) {
        SD59x18 B = SD59x18.wrap(b);
        SD59x18 u0 = SD59x18.wrap(q0) / B;
        SD59x18 u1 = SD59x18.wrap(q1) / B;
        SD59x18 lse = ln(exp(u0) + exp(u1));
        c = SD59x18.unwrap(B * lse);
    }

    /// @notice Instantaneous price of the given outcome. Always in [0, 1e18].
    /// @param outcome 0 (NO) or 1 (YES).
    function price(int256 q0, int256 q1, int256 b, uint8 outcome) internal pure returns (int256 p) {
        if (outcome > 1) revert InvalidOutcome();
        SD59x18 B = SD59x18.wrap(b);
        SD59x18 e0 = exp(SD59x18.wrap(q0) / B);
        SD59x18 e1 = exp(SD59x18.wrap(q1) / B);
        SD59x18 sum = e0 + e1;
        SD59x18 num = outcome == 0 ? e0 : e1;
        p = SD59x18.unwrap(num / sum);
    }

    /// @notice Cost of a trade: cost(q + dq) - cost(q).
    /// @param q0 Current outcome-0 shares.
    /// @param q1 Current outcome-1 shares.
    /// @param dq0 Trade delta on outcome 0 (positive = buying NO, negative = selling NO).
    /// @param dq1 Trade delta on outcome 1.
    function deltaCost(int256 q0, int256 q1, int256 dq0, int256 dq1, int256 b) internal pure returns (int256) {
        return cost(q0 + dq0, q1 + dq1, b) - cost(q0, q1, b);
    }
}
