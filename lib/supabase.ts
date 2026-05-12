import { createClient } from '@supabase/supabase-js'
import type { Meeting, Participant, MeetingStatus, ParticipantRole, Message } from '@/types/meeting'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Browser-safe client using the anon key (respects Row Level Security)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-only admin client using the service role key (bypasses RLS)
// Never expose this to the browser — only import from API routes / server components
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
  }
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
