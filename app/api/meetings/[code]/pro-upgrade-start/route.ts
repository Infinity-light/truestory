import { NextRequest } from 'next/server'
import { keccak256, encodePacked } from 'viem'
import { supabaseAdmin } from '@/lib/supabase-server'
import { buildForensicExport } from '@/lib/forensic-export'
import { runProUpgradePipeline } from '@/lib/pro-upgrade'

function buildMeetingIdBytes32(uuid: string): `0x${string}` {
  return keccak256(encodePacked(['string'], [uuid]))
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  const { data: meetingRow } = await supabaseAdmin
    .from('meetings')
    .select('*')
    .eq('room_code', code)
    .single()

  if (!meetingRow) {
    return Response.json({ error: 'meeting not found' }, { status: 404 })
  }

  if (!meetingRow.is_pro) {
    return Response.json({ error: 'not a pro meeting' }, { status: 400 })
  }

  if (meetingRow.pro_status === 'finalized') {
    return Response.json({ ok: true, alreadyFinalized: true })
  }

  // Mark as finalizing so the UI shows a spinner
  await supabaseAdmin
    .from('meetings')
    .update({ pro_status: 'finalizing' })
    .eq('id', meetingRow.id)

  await supabaseAdmin.channel(`meeting:${code}`).send({
    type: 'broadcast',
    event: 'pro_upgrade_progress',
    payload: { stage: 'encrypting' },
  })

  const forensic = await buildForensicExport(code)
  if (!forensic) {
    return Response.json({ error: 'failed to build forensic export' }, { status: 500 })
  }

  const { data: participantRows } = await supabaseAdmin
    .from('participants')
    .select('wallet_address')
    .eq('meeting_id', meetingRow.id)
    .order('joined_at', { ascending: true })

  const participants = (participantRows ?? []).map(
    (p) => p.wallet_address as `0x${string}`,
  )

  const meetingIdBytes32 = buildMeetingIdBytes32(meetingRow.id)

  try {
    const result = await runProUpgradePipeline(
      meetingIdBytes32,
      meetingRow.id,
      participants,
      forensic,
      Boolean(meetingRow.skip_attestation),
    )

    await supabaseAdmin
      .from('meetings')
      .update({
        arweave_tx_id: result.arweaveTxId,
        lit_acc_ref: result.litAccRef,
        pro_status: 'finalized',
      })
      .eq('id', meetingRow.id)

    await supabaseAdmin.channel(`meeting:${code}`).send({
      type: 'broadcast',
      event: 'pro_upgrade_finalized',
      payload: {
        arweaveTxId: result.arweaveTxId,
        finalizeTxHash: result.finalizeTxHash,
        placeholderMode: result.placeholderMode,
      },
    })

    return Response.json({
      ok: true,
      arweaveTxId: result.arweaveTxId,
      finalizeTxHash: result.finalizeTxHash,
      placeholderMode: result.placeholderMode,
    })
  } catch (err) {
    await supabaseAdmin
      .from('meetings')
      .update({ pro_status: 'refunded' })
      .eq('id', meetingRow.id)

    await supabaseAdmin.channel(`meeting:${code}`).send({
      type: 'broadcast',
      event: 'pro_upgrade_failed',
      payload: { error: err instanceof Error ? err.message : String(err) },
    })

    return Response.json(
      {
        error: err instanceof Error ? err.message : 'pro upgrade failed',
        rolledBack: true,
      },
      { status: 500 },
    )
  }
}
