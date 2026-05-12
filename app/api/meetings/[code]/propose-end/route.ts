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
  if (!proposerAddress || !/^0x[0-9a-fA-F]{40}$/.test(proposerAddress)) {
    return Response.json({ error: 'invalid proposerAddress' }, { status: 400 })
  }

  const { data: meeting } = await supabaseAdmin
    .from('meetings')
    .select('id, status')
    .eq('room_code', code)
    .is('code_released_at', null)
    .single()

  if (!meeting) return Response.json({ error: 'meeting not found' }, { status: 404 })
  if (meeting.status !== 'recording')
    return Response.json({ error: 'meeting not in recording state' }, { status: 409 })

  const { data: participant } = await supabaseAdmin
    .from('participants')
    .select('wallet_address')
    .eq('meeting_id', meeting.id)
    .eq('wallet_address', proposerAddress)
    .single()

  if (!participant)
    return Response.json({ error: 'not a participant' }, { status: 403 })

  // Reject if there's already an active proposal
  const { data: existing } = await supabaseAdmin
    .from('end_proposals')
    .select('id')
    .eq('meeting_id', meeting.id)
    .eq('status', 'active')
    .maybeSingle()

  if (existing)
    return Response.json({ error: 'proposal already active' }, { status: 409 })

  const { data: created, error: insertErr } = await supabaseAdmin
    .from('end_proposals')
    .insert({
      meeting_id: meeting.id,
      proposer_address: proposerAddress,
      status: 'active',
      agreed_addresses: [],
      disagreed_addresses: [],
    })
    .select()
    .single()

  if (insertErr || !created)
    return Response.json({ error: 'failed to create proposal' }, { status: 500 })

  await supabaseAdmin
    .from('meetings')
    .update({ proposed_end_by: proposerAddress, proposed_end_at: created.proposed_at })
    .eq('id', meeting.id)

  await supabaseAdmin.channel(`meeting:${code}`).send({
    type: 'broadcast',
    event: 'end_proposed',
    payload: { proposerAddress, proposalId: created.id, proposedAt: created.proposed_at },
  })

  return Response.json(
    { proposalId: created.id, proposedAt: created.proposed_at },
    { status: 201 }
  )
}
