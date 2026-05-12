import { NextRequest } from 'next/server'
import { supabaseAdmin, fromMeeting, fromParticipant } from '@/lib/supabase'
import type { GetMeetingResponse } from '@/types/meeting'

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
