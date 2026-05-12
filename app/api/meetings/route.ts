import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { CreateMeetingRequest, CreateMeetingResponse } from '@/types/meeting'

function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr)
}

function generateRoomCode(): string {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
}

export async function POST(request: NextRequest) {
  let body: Partial<CreateMeetingRequest>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid request body' }, { status: 400 })
  }

  const { hostAddress } = body
  if (!hostAddress || !isValidAddress(hostAddress)) {
    return Response.json({ error: 'invalid hostAddress' }, { status: 400 })
  }

  // Generate unique room code — retry up to 5 times on conflict
  let roomCode = ''
  let meetingId = ''
  for (let attempt = 0; attempt < 5; attempt++) {
    roomCode = generateRoomCode()

    const { data, error } = await supabaseAdmin
      .from('meetings')
      .insert({
        room_code: roomCode,
        host_address: hostAddress,
        status: 'waiting',
      })
      .select()
      .single()

    if (!error && data) {
      meetingId = data.id
      break
    }

    // 23505 = unique_violation in Postgres
    if (error?.code !== '23505') {
      return Response.json({ error: 'failed to create meeting' }, { status: 500 })
    }
  }

  if (!meetingId) {
    return Response.json({ error: 'failed to generate unique room code' }, { status: 500 })
  }

  // Insert host as first participant
  const { error: participantError } = await supabaseAdmin
    .from('participants')
    .insert({
      meeting_id: meetingId,
      wallet_address: hostAddress,
      role: 'host',
    })

  if (participantError) {
    return Response.json({ error: 'failed to add host participant' }, { status: 500 })
  }

  const joinUrl = `${request.nextUrl.origin}/meeting/join?code=${roomCode}`

  const response: CreateMeetingResponse = {
    meetingId,
    roomCode,
    joinUrl,
  }

  return Response.json(response, { status: 201 })
}
