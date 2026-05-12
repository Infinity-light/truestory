// Server-only Supabase module — uses service_role key (bypasses RLS).
// NEVER import this from a client component. Only API routes / server components.
import { createClient } from '@supabase/supabase-js'
import type {
  Meeting,
  Participant,
  MeetingStatus,
  ParticipantRole,
  Message,
  ProStatus,
} from '@/types/meeting'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

// DB row shapes (snake_case from Postgres)
interface MeetingRow {
  id: string
  room_code: string
  host_address: string
  status: string
  created_at: string
  expires_at: string
  recording_started_at: string | null
  recording_ended_at: string | null
  on_chain_tx_hash: string | null
  // v2 fields (may be null if migration not yet applied)
  is_pro?: boolean | null
  expected_count?: number | null
  code_released_at?: string | null
  arweave_tx_id?: string | null
  lit_acc_ref?: string | null
  pro_status?: string | null
  skip_attestation?: boolean | null
}

interface ParticipantRow {
  meeting_id: string
  wallet_address: string
  role: string
  joined_at: string
  start_sig: string | null
  start_signed_at: string | null
  end_sig: string | null
  end_signed_at: string | null
  review_completed: boolean
  // v2 fields
  color?: string | null
  left_at?: string | null
  last_seen_at?: string | null
}

interface MessageRow {
  id: string
  meeting_id: string
  speaker_address: string
  original_text: string
  final_text: string | null
  spoken_at: string
  server_received_at: string
  original_hash: string
  final_hash: string | null
  is_disputed: boolean
}

export function fromMeeting(row: MeetingRow): Meeting {
  return {
    id: row.id,
    roomCode: row.room_code,
    hostAddress: row.host_address,
    status: row.status as MeetingStatus,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    recordingStartedAt: row.recording_started_at,
    recordingEndedAt: row.recording_ended_at,
    onChainTxHash: row.on_chain_tx_hash,
    isPro: Boolean(row.is_pro),
    expectedCount: row.expected_count ?? null,
    codeReleasedAt: row.code_released_at ?? null,
    arweaveTxId: row.arweave_tx_id ?? null,
    litAccRef: row.lit_acc_ref ?? null,
    proStatus: (row.pro_status as ProStatus) ?? 'none',
    skipAttestation: Boolean(row.skip_attestation),
  }
}

export function fromParticipant(row: ParticipantRow): Participant {
  return {
    meetingId: row.meeting_id,
    walletAddress: row.wallet_address,
    role: row.role as ParticipantRole,
    joinedAt: row.joined_at,
    startSig: row.start_sig,
    startSignedAt: row.start_signed_at,
    endSig: row.end_sig,
    endSignedAt: row.end_signed_at,
    reviewCompleted: row.review_completed,
    color: row.color ?? '#888888',
    leftAt: row.left_at ?? null,
    lastSeenAt: row.last_seen_at ?? row.joined_at,
  }
}

export function fromMessage(row: MessageRow): Message {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    speakerAddress: row.speaker_address,
    originalText: row.original_text,
    finalText: row.final_text,
    spokenAt: row.spoken_at,
    serverReceivedAt: row.server_received_at,
    originalHash: row.original_hash,
    finalHash: row.final_hash,
    isDisputed: row.is_disputed,
  }
}

/** Random color from a curated palette for new participants. */
const COLOR_PALETTE = [
  '#0E76FD', '#FF6B6B', '#4ECDC4', '#FFD93D',
  '#A78BFA', '#F472B6', '#34D399', '#FB923C',
  '#60A5FA', '#FBBF24',
]

export function randomParticipantColor(): string {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]
}
