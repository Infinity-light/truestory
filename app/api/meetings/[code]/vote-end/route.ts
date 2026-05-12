import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  let body: { voterAddress?: string; agree?: boolean }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid request body' }, { status: 400 })
  }

  const { voterAddress, agree } = body
  if (!voterAddress || !/^0x[0-9a-fA-F]{40}$/.test(voterAddress))
    return Response.json({ error: 'invalid voterAddress' }, { status: 400 })
  if (typeof agree !== 'boolean')
    return Response.json({ error: 'agree must be boolean' }, { status: 400 })

  const { data: meeting } = await supabaseAdmin
    .from('meetings')
    .select('id, status')
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

  // Proposer cannot vote on own proposal
  if (proposal.proposer_address === voterAddress)
    return Response.json({ error: 'proposer cannot vote' }, { status: 403 })

  // Must be a participant
  const { data: participant } = await supabaseAdmin
    .from('participants')
    .select('wallet_address')
    .eq('meeting_id', meeting.id)
    .eq('wallet_address', voterAddress)
    .single()

  if (!participant)
    return Response.json({ error: 'not a participant' }, { status: 403 })

  // Update vote arrays (remove existing vote, add new)
  const agreed: string[] = (proposal.agreed_addresses ?? []).filter(
    (a: string) => a !== voterAddress
  )
  const disagreed: string[] = (proposal.disagreed_addresses ?? []).filter(
    (a: string) => a !== voterAddress
  )
  if (agree) agreed.push(voterAddress)
  else disagreed.push(voterAddress)

  // Count total participants for threshold
  const { count: totalCount } = await supabaseAdmin
    .from('participants')
    .select('*', { count: 'exact', head: true })
    .eq('meeting_id', meeting.id)

  const n = totalCount ?? 0
  // Strict majority: proposer-excluded need at least ceil((n-1)/2) agreed
  const threshold = Math.ceil((n - 1) / 2)
  const passed = agreed.length >= threshold

  if (passed) {
    // Approve proposal and advance meeting status
    await supabaseAdmin
      .from('end_proposals')
      .update({
        status: 'approved',
        agreed_addresses: agreed,
        disagreed_addresses: disagreed,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', proposal.id)

    await supabaseAdmin
      .from('meetings')
      .update({
        status: 'reviewing',
        recording_ended_at: new Date().toISOString(),
        proposed_end_by: null,
        proposed_end_at: null,
      })
      .eq('id', meeting.id)

    await supabaseAdmin.channel(`meeting:${code}`).send({
      type: 'broadcast',
      event: 'recording_ended',
      payload: { endedBy: 'majority_vote', endedAt: new Date().toISOString() },
    })

    return Response.json({ passed: true, agreed, disagreed }, { status: 200 })
  }

  // Not passed yet, just update votes
  await supabaseAdmin
    .from('end_proposals')
    .update({ agreed_addresses: agreed, disagreed_addresses: disagreed })
    .eq('id', proposal.id)

  await supabaseAdmin.channel(`meeting:${code}`).send({
    type: 'broadcast',
    event: 'end_voted',
    payload: { voterAddress, agree, agreedCount: agreed.length, threshold },
  })

  return Response.json(
    { passed: false, agreed, disagreed, threshold },
    { status: 200 }
  )
}
