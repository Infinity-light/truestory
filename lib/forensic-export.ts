// Forensic-grade export builder.
// Produces a self-contained JSON file that a third party can independently verify
// using only the file + read access to Monad Testnet. No dependency on trueStory service.

import { keccak256, encodePacked } from 'viem'
import { supabaseAdmin, fromMeeting } from './supabase-server'
import { keccakMessage, keccakMessagesRoot, keccakDisputesRoot } from './hash'
import {
  TRUESTORY_V2_ADDRESS,
  ATTESTATION_NFT_ADDRESS,
  PRO_PAYMENT_ADDRESS,
} from './contracts'

const MONAD_CHAIN_ID = 10143

export interface ParticipantExport {
  address: string
  role: 'host' | 'participant'
  color: string
  joinedAt: string
  leftAt: string | null
  startSig: string | null
  startSigSignedMessage: string | null  // the literal text they signed
  startSignedAt: string | null
  endSig: string | null
  endSigSignedHash: string | null       // the bytes32 root hash they signed
  endSignedAt: string | null
}

export interface MessageExport {
  id: string
  speaker: string
  originalText: string
  finalText: string
  originalHash: `0x${string}`
  finalHash: `0x${string}`
  spokenAt: string
  serverReceivedAt: string
  isDisputed: boolean
  // Merkle proof of this message's finalHash being part of finalMessagesRoot.
  // For our linear keccak-chain root, the "proof" is the full ordered list of
  // other message hashes — verifier just reproduces the chain and compares root.
  merkleProof: {
    type: 'linear-keccak-chain'
    indexInChain: number
    chainLength: number
  }
}

export interface DisputeExport {
  messageId: string
  disputer: string
  disputedAt: string
}

export interface ForensicExportV1 {
  version: '1.0'
  generatedAt: string
  meeting: {
    uuid: string
    roomCodeAtSeal: string
    sealedAt: string | null
    chainId: number
    contracts: {
      core: string
      attestation: string
      proPayment: string
    }
    txHashes: {
      // Each participant's submitConsensusSignature tx
      perParticipant: Record<string, string | null>
      // The aggregated "seal" tx — same as the last participant's tx that triggered seal
      sealTx: string | null
    }
    isPro: boolean
    proStatus: string
    arweaveTxId: string | null
    litAccRef: string | null
  }
  participants: ParticipantExport[]
  messages: MessageExport[]
  disputes: DisputeExport[]
  roots: {
    finalMessagesRoot: `0x${string}`
    disputesRoot: `0x${string}`
  }
  consensus: {
    signedHashScheme: 'keccak256(abi.encodePacked("trueStory End: ", meetingId, finalMessagesRoot, disputesRoot))'
    signedHash: `0x${string}`
    signatures: Array<{ signer: string; signature: string }>
    verificationContract: string
    verifyMethod: 'verifyMeeting(bytes32 meetingId, bytes32 candidateRoot) returns (bool isValid, address[] signers, bool isSealed)'
  }
  audit: {
    sttService: 'dashscope.qwen3-asr-flash-realtime'
    sttModelVersion: string
  }
  verificationInstructions: string
}

function buildSealedHash(
  meetingIdBytes32: `0x${string}`,
  finalMessagesRoot: `0x${string}`,
  disputesRoot: `0x${string}`,
): `0x${string}` {
  // Match Solidity: keccak256(abi.encodePacked("trueStory End: ", meetingId, finalMessagesRoot, disputesRoot))
  return keccak256(
    encodePacked(
      ['string', 'bytes32', 'bytes32', 'bytes32'],
      ['trueStory End: ', meetingIdBytes32, finalMessagesRoot, disputesRoot],
    ),
  )
}

function buildMeetingIdBytes32(uuid: string): `0x${string}` {
  return keccak256(encodePacked(['string'], [uuid]))
}

export async function buildForensicExport(
  code: string,
): Promise<ForensicExportV1 | null> {
  const { data: meetingRow, error: meetingError } = await supabaseAdmin
    .from('meetings')
    .select('*')
    .eq('room_code', code)
    .single()

  if (meetingError || !meetingRow) return null

  const meeting = fromMeeting(meetingRow)

  const [participantsResult, messagesResult, disputesResult] = await Promise.all([
    supabaseAdmin
      .from('participants')
      .select('*')
      .eq('meeting_id', meeting.id)
      .order('joined_at', { ascending: true }),
    supabaseAdmin
      .from('messages')
      .select('*')
      .eq('meeting_id', meeting.id)
      .order('spoken_at', { ascending: true }),
    supabaseAdmin
      .from('disputes')
      .select('*')
      .in(
        'message_id',
        (
          await supabaseAdmin
            .from('messages')
            .select('id')
            .eq('meeting_id', meeting.id)
        ).data?.map((m) => m.id) ?? [],
      ),
  ])

  const rawParticipants = participantsResult.data ?? []
  const rawMessages = messagesResult.data ?? []
  const rawDisputes = disputesResult.data ?? []

  // Compute message hashes and roots
  const messageHashes: `0x${string}`[] = rawMessages.map((m) => {
    const spokenAtMs = BigInt(new Date(m.spoken_at as string).getTime())
    const text = (m.final_text ?? m.original_text) as string
    return keccakMessage(m.speaker_address as string, text, spokenAtMs)
  })

  const finalMessagesRoot = keccakMessagesRoot(messageHashes)

  const disputesForRoot = rawDisputes.map((d) => ({
    messageId: d.message_id as `0x${string}`,
    disputerAddress: d.disputer_address as string,
  }))
  const disputesRoot = keccakDisputesRoot(disputesForRoot)

  const meetingIdBytes32 = buildMeetingIdBytes32(meeting.id)
  const sealedHash = buildSealedHash(meetingIdBytes32, finalMessagesRoot, disputesRoot)

  // Build participant exports — recover the literal start-sig signed message
  const participants: ParticipantExport[] = rawParticipants.map((p) => ({
    address: p.wallet_address as string,
    role: p.role as 'host' | 'participant',
    color: (p.color as string) ?? '#888888',
    joinedAt: p.joined_at as string,
    leftAt: (p.left_at as string) ?? null,
    startSig: p.start_sig as string | null,
    startSigSignedMessage: p.start_signed_at
      ? `trueStory Start: meetingId=${meetingIdBytes32} participantsHash=${keccak256(
          encodePacked(
            rawParticipants.map(() => 'address' as const),
            rawParticipants.map((p) => p.wallet_address as `0x${string}`),
          ),
        )} ts=${new Date(p.start_signed_at as string).getTime()}`
      : null,
    startSignedAt: p.start_signed_at as string | null,
    endSig: p.end_sig as string | null,
    endSigSignedHash: p.end_sig ? sealedHash : null,
    endSignedAt: p.end_signed_at as string | null,
  }))

  // Build message exports with linear-chain proof descriptors
  const messages: MessageExport[] = rawMessages.map((m, i) => ({
    id: m.id as string,
    speaker: m.speaker_address as string,
    originalText: m.original_text as string,
    finalText: (m.final_text ?? m.original_text) as string,
    originalHash: m.original_hash as `0x${string}`,
    finalHash: (m.final_hash ?? m.original_hash) as `0x${string}`,
    spokenAt: m.spoken_at as string,
    serverReceivedAt: m.server_received_at as string,
    isDisputed: Boolean(m.is_disputed),
    merkleProof: {
      type: 'linear-keccak-chain',
      indexInChain: i,
      chainLength: rawMessages.length,
    },
  }))

  const disputes: DisputeExport[] = rawDisputes.map((d) => ({
    messageId: d.message_id as string,
    disputer: d.disputer_address as string,
    disputedAt: d.created_at as string,
  }))

  const signatures = rawParticipants
    .filter((p) => p.end_sig != null)
    .map((p) => ({
      signer: p.wallet_address as string,
      signature: p.end_sig as string,
    }))

  return {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    meeting: {
      uuid: meeting.id,
      roomCodeAtSeal: meeting.roomCode,
      sealedAt: meeting.recordingEndedAt,
      chainId: MONAD_CHAIN_ID,
      contracts: {
        core: TRUESTORY_V2_ADDRESS,
        attestation: ATTESTATION_NFT_ADDRESS,
        proPayment: PRO_PAYMENT_ADDRESS,
      },
      txHashes: {
        perParticipant: {},
        sealTx: meeting.onChainTxHash,
      },
      isPro: meeting.isPro,
      proStatus: meeting.proStatus,
      arweaveTxId: meeting.arweaveTxId,
      litAccRef: meeting.litAccRef,
    },
    participants,
    messages,
    disputes,
    roots: {
      finalMessagesRoot,
      disputesRoot,
    },
    consensus: {
      signedHashScheme:
        'keccak256(abi.encodePacked("trueStory End: ", meetingId, finalMessagesRoot, disputesRoot))',
      signedHash: sealedHash,
      signatures,
      verificationContract: TRUESTORY_V2_ADDRESS,
      verifyMethod:
        'verifyMeeting(bytes32 meetingId, bytes32 candidateRoot) returns (bool isValid, address[] signers, bool isSealed)',
    },
    audit: {
      sttService: 'dashscope.qwen3-asr-flash-realtime',
      sttModelVersion: process.env.DASHSCOPE_ASR_MODEL ?? 'unknown',
    },
    verificationInstructions: [
      'To independently verify this meeting record:',
      '1. For each message: compute keccak256(abi.encodePacked(speaker, finalText, spokenAtMs)) and confirm it matches finalHash.',
      '2. Concatenate all finalHash values in chain order and keccak256 the result. Confirm it equals roots.finalMessagesRoot.',
      '3. Concatenate (messageId, disputer) pairs of all disputes and keccak256. Confirm it equals roots.disputesRoot.',
      '4. For each signature: ecrecover(consensus.signedHash, signature) should yield the participant address.',
      '5. Call contracts.core.verifyMeeting(meetingId, roots.finalMessagesRoot) on Monad Testnet (chainId 10143). Should return isValid=true.',
      'If all five steps pass, this record is cryptographically guaranteed unmodified since seal.',
    ].join('\n'),
  }
}
