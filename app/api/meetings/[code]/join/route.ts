import { NextRequest } from 'next/server'
import { supabaseAdmin, fromParticipant } from '@/lib/supabase'
import type { JoinMeetingRequest, JoinMeetingResponse } from '@/types/meeting'

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

  // Fetch meeting by room code
  const { data: meeting, error: meetingError } = await supabaseAdmin
    .from('meetings')
    .select('id, status, expires_at')
    .eq('room_code', code)
    .single()

  if (meetingError || !meeting) {
    return Response.json({ error: 'meeting not found' }, { status: 404 })
  }

  if (new Date(meeting.expires_at) < new Date()) {
    return Response.json({ error: 'meeting expired' }, { status: 410 })
  }

  if (meeting.status !== 'waiting') {
    return Response.json({ error: 'meeting not accepting participants' }, { status: 409 })
  }

  // Check current participant count
  const { data: existingParticipants, error: fetchError } = await supabaseAdmin
    .from('participants')
    .select('*')
    .eq('meeting_id', meeting.id)

  if (fetchError) {
    return Response.json({ error: 'failed to fetch participants' }, { status: 500 })
  }

  // Idempotent: already joined
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

  if (existingParticipants.length >= 3) {
    return Response.json({ error: 'meeting full' }, { status: 409 })
  }

  // Insert new participant
  const { error: insertError } = await supabaseAdmin
    .from('participants')
    .insert({
      meeting_id: meeting.id,
      wallet_address: walletAddress,
      role: 'participant',
    })

  if (insertError) {
    return Response.json({ error: 'failed to join meeting' }, { status: 500 })
  }

  // Broadcast participant_joined via Supabase Realtime
  await supabaseAdmin.channel(`meeting:${code}`).send({
    type: 'broadcast',
    event: 'participant_joined',
    payload: { walletAddress },
  })

  // Return updated participant list
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
