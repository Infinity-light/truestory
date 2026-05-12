import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  let body: { proposerAddress?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid request body' }, { status: 400 })
  }

  const { proposerAddress } = body
  if (!proposerAddress)
    return Response.json({ error: 'missing proposerAddress' }, { status: 400 })

  const { data: meeting } = await supabaseAdmin
    .from('meetings')
    .select('id')
    .eq('room_code', code)
    .is('code_released_at', null)
    .single()

  if (!meeting) return Response.json({ error: 'meeting not found' }, { status: 404 })

  const { data: proposal } = await supabaseAdmin
    .from('end_proposals')
    .select('*')
    .eq('meeting_id', meeting.id)
    .eq('status', 'active')
    .single()

  if (!proposal) return Response.json({ error: 'no active proposal' }, { status: 404 })

  if (proposal.proposer_address !== proposerAddress)
    return Response.json({ error: 'only proposer can cancel' }, { status: 403 })

  await supabaseAdmin
    .from('end_proposals')
    .update({ status: 'cancelled', resolved_at: new Date().toISOString() })
    .eq('id', proposal.id)

  await supabaseAdmin
    .from('meetings')
    .update({ proposed_end_by: null, proposed_end_at: null })
    .eq('id', meeting.id)

  await supabaseAdmin.channel(`meeting:${code}`).send({
    type: 'broadcast',
    event: 'end_cancelled',
    payload: { proposerAddress },
  })

  return Response.json({ ok: true }, { status: 200 })
}
