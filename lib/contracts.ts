// Deployed contract addresses on Monad Testnet (chain 10143).
// Deployed 2026-05-12, see .workflow/discovery/truestory-v2-20260512-2250-PRD.md
//
// These are public on-chain addresses, safe to hardcode. Not secrets.

import TrueStoryV2Abi from './abi/TrueStoryV2.json'
import TrueStoryProMembershipAbi from './abi/TrueStoryProMembership.json'
import TrueStoryAttestationNFTAbi from './abi/TrueStoryAttestationNFT.json'
import TrueStoryProPaymentAbi from './abi/TrueStoryProPayment.json'

export const TRUESTORY_V2_ADDRESS =
  '0x38fBBF4a7fC309cD4b37F3eD055a16535f6193E2' as const
export const PRO_MEMBERSHIP_ADDRESS =
  '0xA793c002b7c12c0D4480D01A6B30464Ecb0ff66e' as const
export const ATTESTATION_NFT_ADDRESS =
  '0x5bbE70eb6dB50661eb3ad0d6Fdb63245CA53F2f4' as const
export const PRO_PAYMENT_ADDRESS =
  '0x397EE64eb02Ff7233C23aD8B54ed47cA01AF5659' as const

export const trueStoryV2Abi = TrueStoryV2Abi.abi
export const proMembershipAbi = TrueStoryProMembershipAbi.abi
export const attestationNftAbi = TrueStoryAttestationNFTAbi.abi
export const proPaymentAbi = TrueStoryProPaymentAbi.abi

// Pricing (in wei).
export const MEMBERSHIP_PRICE_WEI = 5_000_000_000_000_000_000n  // 5 MON
export const SINGLE_PRO_PRICE_WEI = 500_000_000_000_000_000n    // 0.5 MON

// Participant count bounds.
export const MIN_PARTICIPANTS = 2
export const MAX_PARTICIPANTS = 10
