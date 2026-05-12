import { NextRequest } from 'next/server'
import { verifyMessage } from 'viem'
import { supabaseAdmin, fromParticipant } from '@/lib/supabase'
import type { SignStartRequest, SignStartResponse } from '@/types/meeting'

// Expected message format: "TriSign Start: roomCode=XXXXXX ts=<unix_ms>"
const SIGNED_MESSAGE_RE = /^TriSign Start: roomCode=(\d{6}) ts=(\d+)$/

const FIVE_MINUTES_MS = 5 * 60 * 1000

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

  // Validate signed message format
  const match = SIGNED_MESSAGE_RE.exec(signedMessage)
  if (!match) {
    return Response.json({ error: 'invalid signed message format' }, { status: 400 })
  }

  const [, msgRoomCode, msgTsStr] = match
  if (msgRoomCode !== code) {
    return Response.json({ error: 'room code mismatch in signed message' }, { status: 400 })
  }

  const msgTs = Number(msgTsStr)
  if (Math.abs(Date.now() - msgTs) > FIVE_MINUTES_MS) {
    return Response.json({ error: 'signature expired' }, { status: 400 })
  }

  // Verify signature using viem
  let isValid = false
  try {
    isValid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message: signedMessage,
      signature: signature as `0x${string}`,
    })
  } catch {
    return Response.json({ error: 'invalid signature' }, { status: 400 })
  }

  if (!isValid) {
    return Response.json({ error: 'invalid signature' }, { status: 400 })
  }

  // Fetch meeting
  const { data: meeting, error: meetingError } = await supabaseAdmin
    .from('meetings')
    .select('id, status')
    .eq('room_code', code)
    .single()

  if (meetingError || !meeting) {
    return Response.json({ error: 'meeting not found' }, { status: 404 })
  }

  // Check participant exists in this meeting
  const { data: participant, error: participantError } = await supabaseAdmin
    .from('participants')
    .select('*')
    .eq('meeting_id', meeting.id)
    .eq('wallet_address', walletAddress)
    .single()

  if (participantError || !participant) {
    return Response.json({ error: 'participant not found' }, { status: 404 })
  }

  // Update participant's start signature
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

  // Check if all 3 participants have signed
  const { data: allParticipants } = await supabaseAdmin
    .from('participants')
    .select('*')
    .eq('meeting_id', meeting.id)

  const signedCount = (allParticipants ?? []).filter((p) => p.start_sig !== null).length
  const totalCount = (allParticipants ?? []).length

  if (totalCount === 3 && signedCount === 3) {
    // All signed — transition to recording
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

  // Partial sign — broadcast and return waiting list
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
