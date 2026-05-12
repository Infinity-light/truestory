import { NextRequest } from 'next/server'
import { supabaseAdmin, fromMeeting, fromParticipant } from '@/lib/supabase-server'
import type { GetMeetingResponse } from '@/types/meeting'

// PATCH /api/meetings/[code] — host ends recording, meeting transitions to 'reviewing'
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  let body: { hostAddress?: string; action?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid request body' }, { status: 400 })
  }

  const { hostAddress, action } = body
  if (action !== 'end-recording' || !hostAddress) {
    return Response.json({ error: 'expected action=end-recording and hostAddress' }, { status: 400 })
  }

  const { data: meeting, error: meetingError } = await supabaseAdmin
    .from('meetings')
    .select('id, status, host_address, room_code')
    .eq('room_code', code)
    .single()

  if (meetingError || !meeting) {
    return Response.json({ error: 'meeting not found' }, { status: 404 })
  }

  if (meeting.host_address.toLowerCase() !== hostAddress.toLowerCase()) {
    return Response.json({ error: 'only host can end recording' }, { status: 403 })
  }

  if (meeting.status !== 'recording') {
    return Response.json({ error: `meeting not in recording state (current: ${meeting.status})` }, { status: 409 })
  }

  const { error: updateError } = await supabaseAdmin
    .from('meetings')
    .update({ status: 'reviewing', recording_ended_at: new Date().toISOString() })
    .eq('id', meeting.id)

  if (updateError) {
    return Response.json({ error: 'failed to update meeting status' }, { status: 500 })
  }

  await supabaseAdmin.channel(`meeting:${meeting.room_code}`).send({
    type: 'broadcast',
    event: 'recording_ended',
    payload: { meetingId: meeting.id, roomCode: meeting.room_code },
  })

  return Response.json({ status: 'reviewing' })
}

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

  const { data: participants, error: participantsError } = await supabaseAdmin
    .from('participants')
    .select('*')
    .eq('meeting_id', meeting.id)

  if (participantsError) {
    return Response.json({ error: 'failed to fetch participants' }, { status: 500 })
  }

  const response: GetMeetingResponse = {
    meeting: fromMeeting(meeting),
    participants: (participants ?? []).map(fromParticipant),
  }

  return Response.json(response, { status: 200 })
}
