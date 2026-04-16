// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Script, console2 } from "forge-std/Script.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { MockUSDC } from "src/MockUSDC.sol";
import { Shares } from "src/Shares.sol";
import { Resolution } from "src/Resolution.sol";
import { MarketFactory } from "src/MarketFactory.sol";
import { Dispenser } from "src/Dispenser.sol";

/// @notice Deploy core contracts to the active chain and write addresses to
///         `../deployments/<chainName>.json`.
contract Deploy is Script {
    // Drip defaults.
    uint256 internal constant USDC_DRIP = 100 * 1e6;
    // 1 mBNB per visitor — enough for ~10 testnet transactions at BSC gas prices.
    // Kept small because testnet faucets are stingy and we want the Dispenser
    // to stay topped up across many demo visitors without constant refills.
    uint256 internal constant BNB_DRIP = 0.001 ether;

    struct Deployment {
        MockUSDC usdc;
        Shares shares;
        Resolution resolution;
        MarketFactory factory;
        Dispenser dispenser;
    }

    function run() external returns (Deployment memory d) {
        address deployer = msg.sender;
        vm.startBroadcast();

        d.usdc = new MockUSDC();
        d.shares = new Shares();
        d.resolution = new Resolution(deployer);
        d.factory = new MarketFactory(IERC20(address(d.usdc)), d.shares, address(d.resolution), deployer);
        d.dispenser = new Dispenser(d.usdc, USDC_DRIP, BNB_DRIP, deployer);

        vm.stopBroadcast();

        console2.log("MockUSDC      ", address(d.usdc));
        console2.log("Shares        ", address(d.shares));
        console2.log("Resolution    ", address(d.resolution));
        console2.log("MarketFactory ", address(d.factory));
        console2.log("Dispenser     ", address(d.dispenser));

        _writeDeployment(d);
    }

    function _writeDeployment(Deployment memory d) internal {
        string memory file = string.concat("../deployments/", _chainName(block.chainid), ".json");

        string memory json = "deployment";
        vm.serializeUint(json, "chainId", block.chainid);
        vm.serializeAddress(json, "mockUSDC", address(d.usdc));
        vm.serializeAddress(json, "shares", address(d.shares));
        vm.serializeAddress(json, "resolution", address(d.resolution));
        vm.serializeAddress(json, "marketFactory", address(d.factory));
        string memory out = vm.serializeAddress(json, "dispenser", address(d.dispenser));

        vm.writeJson(out, file);
    }

    function _chainName(uint256 chainId) internal pure returns (string memory) {
        if (chainId == 97) return "bnbTestnet";
        if (chainId == 56) return "bnb";
        if (chainId == 31337) return "anvil";
        return "unknown";
    }
}
