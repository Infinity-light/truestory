import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

// Vercel Cron runs this every 10 minutes (see vercel.json).
// Detects meetings where the host has been offline > 2h with no active end-proposal,
// and auto-advances them to 'reviewing' to avoid resource leaks.
export async function GET(request: NextRequest) {
  // Vercel cron requests carry a special auth header; verify it.
  const authHeader = request.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`
  if (process.env.CRON_SECRET && authHeader !== expected) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

  // Find recording meetings where host's last_seen_at is > 2h ago.
  const { data: stuckMeetings, error } = await supabaseAdmin
    .from('meetings')
    .select('id, room_code, host_address, proposed_end_by')
    .eq('status', 'recording')
    .is('code_released_at', null)

  if (error) {
    return Response.json({ error: 'query failed' }, { status: 500 })
  }

  const advanced: string[] = []

  for (const meeting of stuckMeetings ?? []) {
    // Skip meetings with an active end proposal — they're in the voting flow
    if (meeting.proposed_end_by) continue

    // Check host's last_seen_at via participants row
    const { data: host } = await supabaseAdmin
      .from('participants')
      .select('last_seen_at')
      .eq('meeting_id', meeting.id)
      .eq('wallet_address', meeting.host_address)
      .single()

    if (!host?.last_seen_at) continue
    if (host.last_seen_at >= twoHoursAgo) continue

    // Host has been offline > 2h with no proposal — auto-advance
    const endedAt = new Date().toISOString()
    await supabaseAdmin
      .from('meetings')
      .update({
        status: 'reviewing',
        recording_ended_at: endedAt,
      })
      .eq('id', meeting.id)

    await supabaseAdmin.channel(`meeting:${meeting.room_code}`).send({
      type: 'broadcast',
      event: 'recording_ended',
      payload: {
        meetingId: meeting.id,
        roomCode: meeting.room_code,
        endedBy: 'auto_host_offline',
        endedAt,
      },
    })

    advanced.push(meeting.room_code)
  }

  return Response.json({
    advanced,
    checked: stuckMeetings?.length ?? 0,
  })
}
