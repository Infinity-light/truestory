import { NextRequest } from 'next/server'
import { supabaseAdmin, fromMessage } from '@/lib/supabase-server'
import { keccakMessage } from '@/lib/hash'
import type { CreateMessageRequest, CreateMessageResponse } from '@/types/meeting'

function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr)
}

export async function POST(request: NextRequest) {
  let body: Partial<CreateMessageRequest>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid request body' }, { status: 400 })
  }

  const { meetingId, speakerAddress, originalText, spokenAt } = body

  if (!meetingId || typeof meetingId !== 'string') {
    return Response.json({ error: 'missing meetingId' }, { status: 400 })
  }
  if (!speakerAddress || !isValidAddress(speakerAddress)) {
    return Response.json({ error: 'invalid speakerAddress' }, { status: 400 })
  }
  if (!originalText || typeof originalText !== 'string' || originalText.trim() === '') {
    return Response.json({ error: 'missing originalText' }, { status: 400 })
  }
  if (!spokenAt || typeof spokenAt !== 'string') {
    return Response.json({ error: 'missing spokenAt' }, { status: 400 })
  }

  // Validate meeting exists and is in recording state
  const { data: meeting, error: meetingError } = await supabaseAdmin
    .from('meetings')
    .select('id, status, room_code')
    .eq('id', meetingId)
    .single()

  if (meetingError || !meeting) {
    return Response.json({ error: 'meeting not found' }, { status: 404 })
  }

  if (meeting.status !== 'recording') {
    return Response.json(
      { error: `meeting not in recording state (current: ${meeting.status})` },
      { status: 409 },
    )
  }

  // Validate speaker is a participant of this meeting
  const { data: participant, error: participantError } = await supabaseAdmin
    .from('participants')
    .select('wallet_address')
    .eq('meeting_id', meetingId)
    .eq('wallet_address', speakerAddress)
    .single()

  if (participantError || !participant) {
    return Response.json({ error: 'speaker not a participant of this meeting' }, { status: 403 })
  }

  // Compute keccak256 hash matching Solidity abi.encodePacked
  const spokenAtMs = BigInt(new Date(spokenAt).getTime())
  const originalHash = keccakMessage(speakerAddress, originalText, spokenAtMs)

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('messages')
    .insert({
      meeting_id: meetingId,
      speaker_address: speakerAddress,
      original_text: originalText,
      final_text: null,
      spoken_at: spokenAt,
      original_hash: originalHash,
      final_hash: null,
      is_disputed: false,
    })
    .select()
    .single()

  if (insertError || !inserted) {
    return Response.json({ error: 'failed to insert message' }, { status: 500 })
  }

  const message = fromMessage(inserted)

  // Broadcast to all meeting participants via Supabase Realtime
  await supabaseAdmin.channel(`meeting:${meeting.room_code}:messages`).send({
    type: 'broadcast',
    event: 'message_created',
    payload: message,
  })

  const response: CreateMessageResponse = { message }
  return Response.json(response, { status: 201 })
}
