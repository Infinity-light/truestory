import { NextRequest } from 'next/server'
import { verifyMessage, hexToBytes } from 'viem'
import { supabaseAdmin } from '@/lib/supabase'

// signedMessage is now a 32-byte keccak256 hex hash: "0x" + 64 hex chars
const CONSENSUS_HASH_RE = /^0x[0-9a-fA-F]{64}$/

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  let body: { walletAddress?: string; signature?: string; signedMessage?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid request body' }, { status: 400 })
  }

  const { walletAddress, signature, signedMessage } = body
  if (!walletAddress || !signature || !signedMessage) {
    return Response.json({ error: 'missing required fields' }, { status: 400 })
  }

  if (!CONSENSUS_HASH_RE.test(signedMessage)) {
    return Response.json({ error: 'invalid signed message format' }, { status: 400 })
  }

  let isValid = false
  try {
    isValid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message: { raw: hexToBytes(signedMessage as `0x${string}`) },
      signature: signature as `0x${string}`,
    })
  } catch {
    return Response.json({ error: 'invalid_signature' }, { status: 400 })
  }

  if (!isValid) {
    return Response.json({ error: 'invalid_signature' }, { status: 400 })
  }

  const { data: meeting, error: meetingError } = await supabaseAdmin
    .from('meetings')
    .select('id, status')
    .eq('room_code', code)
    .single()

  if (meetingError || !meeting) {
    return Response.json({ error: 'meeting not found' }, { status: 404 })
  }

  const { data: participant, error: participantError } = await supabaseAdmin
    .from('participants')
    .select('wallet_address')
    .eq('meeting_id', meeting.id)
    .eq('wallet_address', walletAddress)
    .single()

  if (participantError || !participant) {
    return Response.json({ error: 'participant not found' }, { status: 404 })
  }

  const { error: updateError } = await supabaseAdmin
    .from('participants')
    .update({
      end_sig: signature,
      end_signed_at: new Date().toISOString(),
    })
    .eq('meeting_id', meeting.id)
    .eq('wallet_address', walletAddress)

  if (updateError) {
    return Response.json({ error: 'failed to save signature' }, { status: 500 })
  }

  const { data: allParticipants } = await supabaseAdmin
    .from('participants')
    .select('wallet_address, end_sig, end_signed_at')
    .eq('meeting_id', meeting.id)

  const signedCount = (allParticipants ?? []).filter((p) => p.end_sig !== null).length

  if (signedCount === 3) {
    await supabaseAdmin
      .from('meetings')
      .update({ status: 'sealed', recording_ended_at: new Date().toISOString() })
      .eq('id', meeting.id)

    await supabaseAdmin.channel(`meeting:${code}`).send({
      type: 'broadcast',
      event: 'all_signed',
      payload: { sealedAt: new Date().toISOString() },
    })

    const allSignatures = (allParticipants ?? [])
      .filter((p) => p.end_sig !== null)
      .map((p) => ({ addr: p.wallet_address, sig: p.end_sig, signedAt: p.end_signed_at }))

    return Response.json({ sealed: true, allSignatures }, { status: 200 })
  }

  const waitingFor = (allParticipants ?? [])
    .filter((p) => p.end_sig === null)
    .map((p) => p.wallet_address)

  return Response.json({ sealed: false, waitingFor }, { status: 200 })
}
