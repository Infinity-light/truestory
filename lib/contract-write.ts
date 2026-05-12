'use client'

import { useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi'
import { keccak256, encodePacked } from 'viem'
import { TRISIGN_CONTRACT_ADDRESS, triSignAbi } from './contract-abi'

/** Build the meetingId bytes32 from a UUID string */
export function buildMeetingId(meetingUuid: string): `0x${string}` {
  return keccak256(encodePacked(['string'], [meetingUuid]))
}

/** Build finalMessagesRoot from an ordered array of per-message hashes */
export function buildFinalMessagesRoot(messageHashes: `0x${string}`[]): `0x${string}` {
  if (messageHashes.length === 0) {
    return '0x0000000000000000000000000000000000000000000000000000000000000000'
  }
  return keccak256(encodePacked(messageHashes.map(() => 'bytes32' as const), messageHashes))
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

/** The message each participant signs for submitConsensus */
export function buildConsensusMessage(
  meetingId: `0x${string}`,
  finalMessagesRoot: `0x${string}`,
  disputesRoot: `0x${string}`
): string {
  return `TriSign Consensus: meetingId=${meetingId} finalRoot=${finalMessagesRoot} disputesRoot=${disputesRoot}`
}

/** Hook: call startMeeting on-chain */
export function useStartMeeting() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function startMeeting(
    meetingId: `0x${string}`,
    roomCodeHash: `0x${string}`,
    participants: [`0x${string}`, `0x${string}`, `0x${string}`]
  ) {
    writeContract({
      address: TRISIGN_CONTRACT_ADDRESS,
      abi: triSignAbi,
      functionName: 'startMeeting',
      args: [meetingId, roomCodeHash, participants],
    })
  }

  return { startMeeting, hash, isPending, isConfirming, isSuccess, error }
}

/** Hook: call submitConsensus on-chain (host pays gas) */
export function useSubmitConsensus() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function submitConsensus(
    meetingId: `0x${string}`,
    finalMessagesRoot: `0x${string}`,
    disputesRoot: `0x${string}`,
    sigs: [`0x${string}`, `0x${string}`, `0x${string}`]
  ) {
    writeContract({
      address: TRISIGN_CONTRACT_ADDRESS,
      abi: triSignAbi,
      functionName: 'submitConsensus',
      args: [meetingId, finalMessagesRoot, disputesRoot, sigs],
    })
  }

  return { submitConsensus, hash, isPending, isConfirming, isSuccess, error }
}

/** Hook: read verifyMeeting from chain */
export function useVerifyMeeting(meetingId: `0x${string}`, candidateRoot: `0x${string}`) {
  return useReadContract({
    address: TRISIGN_CONTRACT_ADDRESS,
    abi: triSignAbi,
    functionName: 'verifyMeeting',
    args: [meetingId, candidateRoot],
    query: { enabled: meetingId !== '0x' && candidateRoot !== '0x' },
  })
}

/** Hook: read full meeting state from chain */
export function useGetMeeting(meetingId: `0x${string}`) {
  return useReadContract({
    address: TRISIGN_CONTRACT_ADDRESS,
    abi: triSignAbi,
    functionName: 'getMeeting',
    args: [meetingId],
    query: { enabled: !!meetingId },
  })
}
