import { NextRequest } from 'next/server'
import { supabaseAdmin, fromMeeting, fromParticipant } from '@/lib/supabase-server'
import type { GetMeetingResponse } from '@/types/meeting'
import { MIN_PARTICIPANTS, MAX_PARTICIPANTS } from '@/lib/contracts'

// PATCH /api/meetings/[code] — host actions on a meeting.
//   action: 'lock-roster' (host locks participant list, allows start sig phase)
//   action: 'end-recording' (host ends recording → reviewing)
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
  if (!hostAddress) {
    return Response.json({ error: 'missing hostAddress' }, { status: 400 })
  }

  const { data: meeting, error: meetingError } = await supabaseAdmin
    .from('meetings')
    .select('id, status, host_address, room_code, expected_count')
    .eq('room_code', code)
    .is('code_released_at', null)
    .single()

  if (meetingError || !meeting) {
    return Response.json({ error: 'meeting not found' }, { status: 404 })
  }

  if (meeting.host_address.toLowerCase() !== hostAddress.toLowerCase()) {
    return Response.json({ error: 'only host can perform this action' }, { status: 403 })
  }

  if (action === 'lock-roster') {
    if (meeting.status !== 'waiting') {
      return Response.json(
        { error: `meeting not in waiting state (current: ${meeting.status})` },
        { status: 409 }
      )
    }
    if (meeting.expected_count != null) {
      return Response.json({ error: 'roster already locked' }, { status: 409 })
    }

    const { count } = await supabaseAdmin
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('meeting_id', meeting.id)

    const n = count ?? 0
    if (n < MIN_PARTICIPANTS) {
      return Response.json(
        { error: `need at least ${MIN_PARTICIPANTS} participants to lock roster` },
        { status: 409 }
      )
    }
    if (n > MAX_PARTICIPANTS) {
      return Response.json(
        { error: `max ${MAX_PARTICIPANTS} participants allowed` },
        { status: 409 }
      )
    }

    const { error: updateError } = await supabaseAdmin
      .from('meetings')
      .update({ expected_count: n })
      .eq('id', meeting.id)

    if (updateError)
      return Response.json({ error: 'failed to lock roster' }, { status: 500 })

    await supabaseAdmin.channel(`meeting:${meeting.room_code}`).send({
      type: 'broadcast',
      event: 'roster_locked',
      payload: { expectedCount: n },
    })

    return Response.json({ expectedCount: n }, { status: 200 })
  }

  if (action === 'end-recording') {
    if (meeting.status !== 'recording') {
      return Response.json(
        { error: `meeting not in recording state (current: ${meeting.status})` },
        { status: 409 }
      )
    }

    const { error: updateError } = await supabaseAdmin
      .from('meetings')
      .update({ status: 'reviewing', recording_ended_at: new Date().toISOString() })
      .eq('id', meeting.id)

    if (updateError)
      return Response.json({ error: 'failed to update meeting status' }, { status: 500 })

    await supabaseAdmin.channel(`meeting:${meeting.room_code}`).send({
      type: 'broadcast',
      event: 'recording_ended',
      payload: { meetingId: meeting.id, roomCode: meeting.room_code, endedBy: 'host' },
    })

    return Response.json({ status: 'reviewing' })
  }

  return Response.json({ error: 'unknown action' }, { status: 400 })
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
    .is('code_released_at', null)
    .single()

  if (meetingError || !meeting) {
    return Response.json({ error: 'meeting not found' }, { status: 404 })
  }

  const { data: participants, error: participantsError } = await supabaseAdmin
    .from('participants')
    .select('*')
    .eq('meeting_id', meeting.id)
    .order('joined_at', { ascending: true })

  if (participantsError) {
    return Response.json({ error: 'failed to fetch participants' }, { status: 500 })
  }

  const response: GetMeetingResponse = {
    meeting: fromMeeting(meeting),
    participants: (participants ?? []).map(fromParticipant),
  }

  return Response.json(response, { status: 200 })
}
