import { NextRequest } from 'next/server'
import { supabaseAdmin, fromParticipant, randomParticipantColor } from '@/lib/supabase-server'
import type { JoinMeetingRequest, JoinMeetingResponse } from '@/types/meeting'
import { MAX_PARTICIPANTS } from '@/lib/contracts'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  let body: Partial<JoinMeetingRequest>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid request body' }, { status: 400 })
  }

  const { walletAddress } = body
  if (!walletAddress || !/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
    return Response.json({ error: 'invalid walletAddress' }, { status: 400 })
  }

  const { data: meeting, error: meetingError } = await supabaseAdmin
    .from('meetings')
    .select('id, status, expires_at, expected_count')
    .eq('room_code', code)
    .is('code_released_at', null)
    .single()

  if (meetingError || !meeting) {
    return Response.json({ error: 'meeting not found' }, { status: 404 })
  }

  if (new Date(meeting.expires_at) < new Date()) {
    return Response.json({ error: 'meeting expired' }, { status: 410 })
  }

  if (meeting.status !== 'waiting') {
    return Response.json({ error: 'meeting_not_joinable' }, { status: 409 })
  }

  if (meeting.expected_count != null) {
    return Response.json({ error: 'meeting_locked' }, { status: 409 })
  }

  const { data: existingParticipants, error: fetchError } = await supabaseAdmin
    .from('participants')
    .select('*')
    .eq('meeting_id', meeting.id)

  if (fetchError) {
    return Response.json({ error: 'failed to fetch participants' }, { status: 500 })
  }

  const alreadyJoined = existingParticipants.some(
    (p) => p.wallet_address === walletAddress
  )
  if (alreadyJoined) {
    const response: JoinMeetingResponse = {
      meetingId: meeting.id,
      currentParticipants: existingParticipants.map(fromParticipant),
    }
    return Response.json(response, { status: 200 })
  }

  if (existingParticipants.length >= MAX_PARTICIPANTS) {
    return Response.json({ error: 'meeting_full' }, { status: 409 })
  }

  const { error: insertError } = await supabaseAdmin
    .from('participants')
    .insert({
      meeting_id: meeting.id,
      wallet_address: walletAddress,
      role: 'participant',
      color: randomParticipantColor(),
    })

  if (insertError) {
    return Response.json({ error: 'failed to join meeting' }, { status: 500 })
  }

  await supabaseAdmin.channel(`meeting:${code}`).send({
    type: 'broadcast',
    event: 'participant_joined',
    payload: { walletAddress, role: 'participant', joinedAt: new Date().toISOString() },
  })

  const { data: updatedParticipants } = await supabaseAdmin
    .from('participants')
    .select('*')
    .eq('meeting_id', meeting.id)

  const response: JoinMeetingResponse = {
    meetingId: meeting.id,
    currentParticipants: (updatedParticipants ?? []).map(fromParticipant),
  }

  return Response.json(response, { status: 200 })
}
