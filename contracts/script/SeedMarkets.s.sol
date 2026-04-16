// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Script, console2 } from "forge-std/Script.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { MockUSDC } from "src/MockUSDC.sol";
import { MarketFactory } from "src/MarketFactory.sol";

/// @notice Create the three seeded markets from spec § 7 on an already-deployed factory.
/// @dev Expects `../deployments/<chainName>.json` to exist from the Deploy script.
contract SeedMarkets is Script {
    uint256 internal constant B = 100e18;
    uint256 internal constant FEE_BPS = 100;
    uint256 internal constant SUBSIDY = 500 * 1e6;
    uint256 internal constant DISPUTE_WINDOW = 2 minutes;

    function run() external {
        string memory file = string.concat("../deployments/", _chainName(block.chainid), ".json");
        string memory json = vm.readFile(file);

        address factoryAddr = vm.parseJsonAddress(json, ".marketFactory");
        address usdcAddr = vm.parseJsonAddress(json, ".mockUSDC");

        MarketFactory factory = MarketFactory(factoryAddr);
        MockUSDC usdc = MockUSDC(usdcAddr);

        vm.startBroadcast();

        // Mint enough subsidy to the caller and approve the factory.
        usdc.mint(msg.sender, SUBSIDY * 3);
        IERC20(usdcAddr).approve(factoryAddr, SUBSIDY * 3);

        address m1 =
            factory.createMarket("Will the demo market #1 be resolved YES?", B, SUBSIDY, FEE_BPS, DISPUTE_WINDOW);
        address m2 = factory.createMarket(
            "Will this market have more than 20 trades in its first 100 blocks?", B, SUBSIDY, FEE_BPS, DISPUTE_WINDOW
        );
        address m3 = factory.createMarket(
            "Will the next block mined on BSC testnet have an even block number?", B, SUBSIDY, FEE_BPS, DISPUTE_WINDOW
        );

        vm.stopBroadcast();

        console2.log("Market 1", m1);
        console2.log("Market 2", m2);
        console2.log("Market 3", m3);
    }

    function _chainName(uint256 chainId) internal pure returns (string memory) {
        if (chainId == 97) return "bnbTestnet";
        if (chainId == 56) return "bnb";
        if (chainId == 31337) return "anvil";
        return "unknown";
    }
}
