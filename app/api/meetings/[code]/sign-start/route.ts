import { NextRequest } from 'next/server'
import { verifyMessage, keccak256, encodePacked } from 'viem'
import { supabaseAdmin } from '@/lib/supabase-server'
import type { SignStartRequest, SignStartResponse } from '@/types/meeting'

// New format: "trueStory Start: meetingId=<bytes32> participantsHash=<bytes32> ts=<unix_ms>"
const SIGNED_MESSAGE_RE =
  /^trueStory Start: meetingId=(0x[0-9a-fA-F]{64}) participantsHash=(0x[0-9a-fA-F]{64}) ts=(\d+)$/

const FIVE_MINUTES_MS = 5 * 60 * 1000

function buildMeetingIdBytes32(uuid: string): `0x${string}` {
  return keccak256(encodePacked(['string'], [uuid]))
}

function buildParticipantsHash(addrs: `0x${string}`[]): `0x${string}` {
  return keccak256(encodePacked(addrs.map(() => 'address' as const), addrs))
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  let body: Partial<SignStartRequest>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid request body' }, { status: 400 })
  }

  const { walletAddress, signature, signedMessage } = body
  if (!walletAddress || !signature || !signedMessage) {
    return Response.json({ error: 'missing required fields' }, { status: 400 })
  }

  const match = SIGNED_MESSAGE_RE.exec(signedMessage)
  if (!match) {
    return Response.json({ error: 'invalid signed message format' }, { status: 400 })
  }

  const [, msgMeetingId, msgParticipantsHash, msgTsStr] = match
  const msgTs = Number(msgTsStr)
  if (Math.abs(Date.now() - msgTs) > FIVE_MINUTES_MS) {
    return Response.json({ error: 'signature expired' }, { status: 400 })
  }

  let isValid = false
  try {
    isValid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message: signedMessage,
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
    .select('id, status, expected_count')
    .eq('room_code', code)
    .is('code_released_at', null)
    .single()

  if (meetingError || !meeting) {
    return Response.json({ error: 'meeting not found' }, { status: 404 })
  }

  if (meeting.expected_count == null) {
    return Response.json({ error: 'roster not locked yet' }, { status: 409 })
  }

  const expectedMeetingId = buildMeetingIdBytes32(meeting.id)
  if (msgMeetingId.toLowerCase() !== expectedMeetingId.toLowerCase()) {
    return Response.json({ error: 'meetingId mismatch in signature' }, { status: 400 })
  }

  const { data: participantRows } = await supabaseAdmin
    .from('participants')
    .select('wallet_address')
    .eq('meeting_id', meeting.id)
    .order('joined_at', { ascending: true })

  const participantList = (participantRows ?? []).map(
    (p) => p.wallet_address as `0x${string}`
  )
  const expectedParticipantsHash = buildParticipantsHash(participantList)
  if (msgParticipantsHash.toLowerCase() !== expectedParticipantsHash.toLowerCase()) {
    return Response.json(
      { error: 'participants list mismatch in signature' },
      { status: 400 }
    )
  }

  const { data: participant, error: participantError } = await supabaseAdmin
    .from('participants')
    .select('*')
    .eq('meeting_id', meeting.id)
    .eq('wallet_address', walletAddress)
    .single()

  if (participantError || !participant) {
    return Response.json({ error: 'participant not found' }, { status: 404 })
  }

  const { error: updateError } = await supabaseAdmin
    .from('participants')
    .update({
      start_sig: signature,
      start_signed_at: new Date().toISOString(),
    })
    .eq('meeting_id', meeting.id)
    .eq('wallet_address', walletAddress)

  if (updateError) {
    return Response.json({ error: 'failed to save signature' }, { status: 500 })
  }

  const { data: allParticipants } = await supabaseAdmin
    .from('participants')
    .select('*')
    .eq('meeting_id', meeting.id)

  const signedCount = (allParticipants ?? []).filter((p) => p.start_sig !== null).length
  const totalCount = (allParticipants ?? []).length
  const expectedCount = meeting.expected_count

  if (totalCount === expectedCount && signedCount === expectedCount) {
    const recordingStartedAt = new Date().toISOString()
    await supabaseAdmin
      .from('meetings')
      .update({ status: 'recording', recording_started_at: recordingStartedAt })
      .eq('id', meeting.id)

    await supabaseAdmin.channel(`meeting:${code}`).send({
      type: 'broadcast',
      event: 'meeting_started',
      payload: { startedAt: recordingStartedAt },
    })

    const response: SignStartResponse = { startedAt: recordingStartedAt }
    return Response.json(response, { status: 200 })
  }

  await supabaseAdmin.channel(`meeting:${code}`).send({
    type: 'broadcast',
    event: 'participant_signed_start',
    payload: { walletAddress },
  })

  const waitingFor = (allParticipants ?? [])
    .filter((p) => p.start_sig === null)
    .map((p) => p.wallet_address)

  const response: SignStartResponse = { waitingFor }
  return Response.json(response, { status: 200 })
}
