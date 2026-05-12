// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {TrueStoryV2} from "../src/TrueStoryV2.sol";
import {TrueStoryProMembership} from "../src/TrueStoryProMembership.sol";
import {TrueStoryAttestationNFT} from "../src/TrueStoryAttestationNFT.sol";
import {TrueStoryProPayment} from "../src/TrueStoryProPayment.sol";

/// @notice Deployment order:
///         1. TrueStoryV2 (core consensus contract)
///         2. TrueStoryProMembership (monthly pass NFT)
///         3. TrueStoryAttestationNFT (deployed with deployer as initial minter)
///         4. TrueStoryProPayment (knows membership + attestation addresses)
///         5. Transfer attestation minter role from deployer to ProPayment
contract DeployV2 is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("MONAD_DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("Deployer:", deployer);
        console.log("Deployer balance:", deployer.balance);

        vm.startBroadcast(deployerKey);

        TrueStoryV2 v2 = new TrueStoryV2();
        console.log("TrueStoryV2:", address(v2));

        TrueStoryProMembership membership = new TrueStoryProMembership();
        console.log("TrueStoryProMembership:", address(membership));

        TrueStoryAttestationNFT attestation = new TrueStoryAttestationNFT(deployer);
        console.log("TrueStoryAttestationNFT:", address(attestation));

        TrueStoryProPayment payment = new TrueStoryProPayment(
            address(membership),
            address(attestation)
        );
        console.log("TrueStoryProPayment:", address(payment));

        attestation.setMinter(address(payment));
        console.log("Attestation minter set to ProPayment");

        vm.stopBroadcast();

        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("NEXT_PUBLIC_TRUESTORY_V2_ADDRESS=", address(v2));
        console.log("NEXT_PUBLIC_PRO_MEMBERSHIP_ADDRESS=", address(membership));
        console.log("NEXT_PUBLIC_ATTESTATION_NFT_ADDRESS=", address(attestation));
        console.log("NEXT_PUBLIC_PRO_PAYMENT_ADDRESS=", address(payment));
    }
}
