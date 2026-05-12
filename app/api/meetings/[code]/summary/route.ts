import { NextRequest } from 'next/server'
import { supabaseAdmin, fromMeeting, fromParticipant } from '@/lib/supabase-server'
import { keccakMessage, keccakMessagesRoot, keccakDisputesRoot } from '@/lib/hash'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  const { data: meeting, error: meetingError } = await supabaseAdmin
    .from('meetings')
    .select('*')
    .eq('room_code', code)
    .single()

  if (meetingError || !meeting) {
    return Response.json({ error: 'meeting not found' }, { status: 404 })
  }

  const [participantsResult, messagesResult, disputesResult] = await Promise.all([
    supabaseAdmin.from('participants').select('*').eq('meeting_id', meeting.id),
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
        ).data?.map((m) => m.id) ?? []
      ),
  ])

  const rawParticipants = participantsResult.data ?? []
  const rawMessages = messagesResult.data ?? []
  const rawDisputes = disputesResult.data ?? []

  const participants = rawParticipants.map((p) => ({
    address: p.wallet_address,
    role: p.role as 'host' | 'participant',
    hasEndSigned: p.end_sig !== null,
    endSig: p.end_sig ?? undefined,
  }))

  const messages = rawMessages.map((m) => ({
    id: m.id as string,
    speaker: m.speaker_address as string,
    finalText: (m.final_text ?? m.original_text) as string,
    finalHash: (m.final_hash ?? m.original_hash) as string,
    spokenAt: m.spoken_at as string,
  }))

  const disputes = rawDisputes.map((d) => ({
    messageId: d.message_id as string,
    disputer: d.disputer_address as string,
  }))

  // Compute roots
  const messageHashes = rawMessages.map((m) => {
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

  const signedMessage = `TriSign End: roomCode=${code} finalRoot=${finalMessagesRoot} disputesRoot=${disputesRoot} ts=${Date.now()}`

  return Response.json(
    {
      meeting: fromMeeting(meeting),
      participants,
      messages,
      disputes,
      finalMessagesRoot,
      disputesRoot,
      signedMessage,
    },
    { status: 200 }
  )
}
