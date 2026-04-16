// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Script, console2 } from "forge-std/Script.sol";
import { Dispenser } from "src/Dispenser.sol";

/// @notice Send tBNB to the deployed Dispenser so it can drip gas to fresh visitors.
///         (MockUSDC is minted on-demand inside Dispenser.drip, no funding needed for it.)
contract FundDispenser is Script {
    /// Total tBNB to send to the dispenser. Roughly funds 100 drips at 0.01 tBNB each.
    uint256 internal constant BNB_TO_SEND = 1 ether;

    function run() external {
        string memory file = string.concat("../deployments/", _chainName(block.chainid), ".json");
        string memory json = vm.readFile(file);
        address dispenser = vm.parseJsonAddress(json, ".dispenser");

        vm.startBroadcast();
        (bool ok,) = payable(dispenser).call{ value: BNB_TO_SEND }("");
        require(ok, "fund failed");
        vm.stopBroadcast();

        console2.log("Funded dispenser:", dispenser, "with", BNB_TO_SEND);
    }

    function _chainName(uint256 chainId) internal pure returns (string memory) {
        if (chainId == 97) return "bnbTestnet";
        if (chainId == 56) return "bnb";
        if (chainId == 31337) return "anvil";
        return "unknown";
    }
}
