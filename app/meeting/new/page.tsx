'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useMeetingStore } from '@/store/meeting-store'
import { RoomCodeDisplay } from '@/components/RoomCodeDisplay'
import { ParticipantsList } from '@/components/ParticipantsList'
import type { Participant, Meeting } from '@/types/meeting'

export default function NewMeetingPage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const { setMeeting, setParticipants, setMyWallet, addParticipant, updateParticipant } =
    useMeetingStore()

  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [joinUrl, setJoinUrl] = useState<string>('')
  const [participants, setLocalParticipants] = useState<Participant[]>([])
  const [creating, setCreating] = useState(false)
  const createdRef = useRef(false)

  useEffect(() => {
    if (!isConnected || !address || createdRef.current) return
    createdRef.current = true

    async function createMeeting() {
      setCreating(true)
      try {
        const res = await fetch('/api/meetings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hostAddress: address }),
        })
        if (!res.ok) {
          const err = await res.json()
          toast.error(err.error ?? 'Failed to create meeting')
          return
        }
        const data = await res.json()
        setRoomCode(data.roomCode)
        setJoinUrl(data.joinUrl)
        setMyWallet(address!)

        // Fetch initial meeting + participants state
        const stateRes = await fetch(`/api/meetings/${data.roomCode}`)
        if (stateRes.ok) {
          const state = await stateRes.json()
          setMeeting(state.meeting as Meeting)
          setParticipants(state.participants as Participant[])
          setLocalParticipants(state.participants as Participant[])
        }

        // Subscribe to Realtime for new joins / status changes
        const channel = supabase
          .channel(`meeting:${data.roomCode}`)
          .on('broadcast', { event: 'participant_joined' }, async () => {
            const refreshRes = await fetch(`/api/meetings/${data.roomCode}`)
            if (refreshRes.ok) {
              const refreshed = await refreshRes.json()
              setParticipants(refreshed.participants)
              setLocalParticipants(refreshed.participants)
            }
          })
          .on('broadcast', { event: 'participant_signed_start' }, async () => {
            const refreshRes = await fetch(`/api/meetings/${data.roomCode}`)
            if (refreshRes.ok) {
              const refreshed = await refreshRes.json()
              setParticipants(refreshed.participants)
              setLocalParticipants(refreshed.participants)
            }
          })
          .on('broadcast', { event: 'meeting_started' }, () => {
            router.push(`/meeting/${data.roomCode}/lobby`)
          })
          .subscribe()

        return () => {
          supabase.removeChannel(channel)
        }
      } finally {
        setCreating(false)
      }
    }

    createMeeting()
  }, [isConnected, address])

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-zinc-400">Connect your wallet to continue</p>
      </div>
    )
  }

  if (creating || !roomCode) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-zinc-400">Creating meeting...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
        <button
          onClick={() => router.push('/')}
          className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          Back
        </button>
        <span className="text-sm font-semibold tracking-tight text-zinc-900">New meeting</span>
        <div className="w-10" />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm space-y-8">
          <RoomCodeDisplay roomCode={roomCode} joinUrl={joinUrl} />

          <ParticipantsList participants={participants} myWallet={address ?? null} />

          {participants.length === 3 && (
            <button
              onClick={() => router.push(`/meeting/${roomCode}/lobby`)}
              className="w-full h-11 rounded-lg bg-zinc-900 text-white text-sm font-medium
                         transition-colors hover:bg-zinc-700"
            >
              Go to lobby
            </button>
          )}

          {participants.length < 3 && (
            <p className="text-center text-xs text-zinc-400">
              Share the code or link — waiting for {3 - participants.length} more
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
