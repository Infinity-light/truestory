// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {TriSign} from "../src/TriSign.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("MONAD_DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        TriSign trisign = new TriSign();

        vm.stopBroadcast();

        console.log("TriSign deployed at:", address(trisign));
    }
}
