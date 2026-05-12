'use client'

import { useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi'
import { keccak256, encodePacked, concat, toBytes } from 'viem'
import {
  TRUESTORY_V2_ADDRESS,
  PRO_PAYMENT_ADDRESS,
  PRO_MEMBERSHIP_ADDRESS,
  trueStoryV2Abi,
  proPaymentAbi,
  proMembershipAbi,
  SINGLE_PRO_PRICE_WEI,
  MEMBERSHIP_PRICE_WEI,
} from './contracts'

// ── hash helpers ──────────────────────────────────────────────────────────────

/** Build the meetingId bytes32 from a UUID string */
export function buildMeetingId(meetingUuid: string): `0x${string}` {
  return keccak256(encodePacked(['string'], [meetingUuid]))
}

/** Build finalMessagesRoot from an ordered array of per-message hashes */
export function buildFinalMessagesRoot(messageHashes: `0x${string}`[]): `0x${string}` {
  if (messageHashes.length === 0) {
    return '0x0000000000000000000000000000000000000000000000000000000000000000'
  }
  return keccak256(
    encodePacked(messageHashes.map(() => 'bytes32' as const), messageHashes)
  )
}

/** Build disputesRoot from (messageId, disputerAddress) pairs */
export function buildDisputesRoot(
  disputes: Array<{ messageId: string; disputerAddress: `0x${string}` }>
): `0x${string}` {
  if (disputes.length === 0) {
    return '0x0000000000000000000000000000000000000000000000000000000000000000'
  }
  const hashes = disputes.map(({ messageId, disputerAddress }) =>
    keccak256(encodePacked(['string', 'address'], [messageId, disputerAddress]))
  )
  return keccak256(encodePacked(hashes.map(() => 'bytes32' as const), hashes))
}

/** Build the keccak hash of the participants list (used to bind start sig). */
export function buildParticipantsHash(participants: `0x${string}`[]): `0x${string}` {
  return keccak256(
    encodePacked(participants.map(() => 'address' as const), participants)
  )
}

/**
 * The message each participant signs for submitConsensusSignature.
 * Must match Solidity: keccak256(abi.encodePacked("trueStory End: ", meetingId, finalRoot, disputesRoot))
 */
export function buildConsensusMessage(
  meetingId: `0x${string}`,
  finalMessagesRoot: `0x${string}`,
  disputesRoot: `0x${string}`
): `0x${string}` {
  return keccak256(
    concat([
      toBytes('trueStory End: '),
      toBytes(meetingId),
      toBytes(finalMessagesRoot),
      toBytes(disputesRoot),
    ])
  )
}

// ── wagmi hooks: TrueStoryV2 ──────────────────────────────────────────────────

/**
 * Hook: each participant calls submitConsensusSignature with their own wallet.
 * Gas is paid individually. Now supports dynamic participants array (2-10).
 */
export function useSubmitConsensusSignature() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function submitSignature(
    meetingId: `0x${string}`,
    participants: readonly `0x${string}`[],
    finalMessagesRoot: `0x${string}`,
    disputesRoot: `0x${string}`,
    signature: `0x${string}`
  ) {
    writeContract({
      address: TRUESTORY_V2_ADDRESS,
      abi: trueStoryV2Abi,
      functionName: 'submitConsensusSignature',
      args: [meetingId, participants, finalMessagesRoot, disputesRoot, signature],
    })
  }

  return { submitSignature, hash, isPending, isConfirming, isSuccess, error }
}

/** Hook: read verifyMeeting from chain */
export function useVerifyMeeting(meetingId: `0x${string}`, candidateRoot: `0x${string}`) {
  return useReadContract({
    address: TRUESTORY_V2_ADDRESS,
    abi: trueStoryV2Abi,
    functionName: 'verifyMeeting',
    args: [meetingId, candidateRoot],
    query: { enabled: meetingId !== '0x' && candidateRoot !== '0x' },
  })
}

/** Hook: read full meeting state from chain */
export function useGetMeeting(meetingId: `0x${string}`) {
  return useReadContract({
    address: TRUESTORY_V2_ADDRESS,
    abi: trueStoryV2Abi,
    functionName: 'getMeeting',
    args: [meetingId],
    query: { enabled: !!meetingId },
  })
}

// ── wagmi hooks: Pro Membership ───────────────────────────────────────────────

/** Hook: check if a wallet has active Pro membership (unexpired month pass) */
export function useProMembershipActive(address: `0x${string}` | undefined) {
  return useReadContract({
    address: PRO_MEMBERSHIP_ADDRESS,
    abi: proMembershipAbi,
    functionName: 'isActive',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
}

/** Hook: purchase a 30-day Pro membership NFT (5 MON) */
export function usePurchaseMembership() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function purchase() {
    writeContract({
      address: PRO_MEMBERSHIP_ADDRESS,
      abi: proMembershipAbi,
      functionName: 'purchase',
      args: [],
      value: MEMBERSHIP_PRICE_WEI,
    })
  }

  return { purchase, hash, isPending, isConfirming, isSuccess, error }
}

// ── wagmi hooks: Pro Payment ──────────────────────────────────────────────────

/**
 * Hook: pay for a Pro meeting at creation time.
 * If wallet has active membership, value should be 0 (free).
 * Otherwise value must be SINGLE_PRO_PRICE_WEI (0.5 MON).
 */
export function usePayForProMeeting() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function payForMeeting(meetingId: `0x${string}`, hasMembership: boolean) {
    writeContract({
      address: PRO_PAYMENT_ADDRESS,
      abi: proPaymentAbi,
      functionName: 'payForProMeeting',
      args: [meetingId],
      value: hasMembership ? 0n : SINGLE_PRO_PRICE_WEI,
    })
  }

  return { payForMeeting, hash, isPending, isConfirming, isSuccess, error }
}

/** Hook: read Pro meeting status (Unpaid / Paid / Finalized / Refunded) */
export function useProMeetingStatus(meetingId: `0x${string}` | undefined) {
  return useReadContract({
    address: PRO_PAYMENT_ADDRESS,
    abi: proPaymentAbi,
    functionName: 'getStatus',
    args: meetingId ? [meetingId] : undefined,
    query: { enabled: !!meetingId },
  })
}
