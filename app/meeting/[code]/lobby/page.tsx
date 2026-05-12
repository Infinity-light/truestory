'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAccount } from 'wagmi'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useMeetingStore } from '@/store/meeting-store'
import { ParticipantsGrid } from '@/components/ParticipantsGrid'
import { StartButton } from '@/components/StartButton'
import { MIN_PARTICIPANTS, MAX_PARTICIPANTS } from '@/lib/contracts'
import type { Participant, Meeting } from '@/types/meeting'

export default function LobbyPage() {
  const params = useParams<{ code: string }>()
  const code = params.code

  const { address, isConnected } = useAccount()
  const router = useRouter()
  const { setMeeting, setParticipants, setMyWallet } = useMeetingStore()

  const [meeting, setLocalMeeting] = useState<Meeting | null>(null)
  const [participants, setLocalParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [locking, setLocking] = useState(false)

  const myWallet = address?.toLowerCase() ?? null

  const refreshState = useCallback(async () => {
    const res = await fetch(`/api/meetings/${code}`)
    if (!res.ok) {
      toast.error('Failed to load meeting')
      router.push('/')
      return
    }
    const data = await res.json()
    const m = data.meeting as Meeting
    setMeeting(m)
    setLocalMeeting(m)
    setParticipants(data.participants as Participant[])
    setLocalParticipants(data.participants as Participant[])

    if (m.status === 'recording') {
      router.push(`/meeting/${code}/recording`)
    }
  }, [code, router, setMeeting, setParticipants])

  useEffect(() => {
    if (!isConnected || !address) return
    setMyWallet(address)

    refreshState().finally(() => setLoading(false))

    const channel = supabase
      .channel(`meeting:${code}`)
      .on('broadcast', { event: 'participant_joined' }, refreshState)
      .on('broadcast', { event: 'participant_signed_start' }, refreshState)
      .on('broadcast', { event: 'roster_locked' }, refreshState)
      .on('broadcast', { event: 'meeting_started' }, () => {
        router.push(`/meeting/${code}/recording`)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isConnected, address, code])

  async function handleLockRoster() {
    if (!address || !meeting) return
    setLocking(true)
    try {
      const res = await fetch(`/api/meetings/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lock-roster', hostAddress: address }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to lock roster')
        return
      }
      await refreshState()
    } finally {
      setLocking(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-zinc-400">Connect your wallet to continue</p>
      </div>
    )
  }

  if (loading || !meeting) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-zinc-400">Loading lobby...</p>
      </div>
    )
  }

  const isHost = meeting.hostAddress.toLowerCase() === myWallet
  const rosterLocked = meeting.expectedCount != null
  const expectedCount = meeting.expectedCount ?? 0
  const me = participants.find((p) => p.walletAddress.toLowerCase() === myWallet)
  const hasSigned = me?.startSig != null
  const allSigned =
    rosterLocked &&
    participants.length === expectedCount &&
    participants.every((p) => p.startSig != null)

  const participantAddresses = participants.map(
    (p) => p.walletAddress as `0x${string}`,
  )

  const headerStatus = !rosterLocked
    ? participants.length < MIN_PARTICIPANTS
      ? `Need at least ${MIN_PARTICIPANTS - participants.length} more participant${
          MIN_PARTICIPANTS - participants.length > 1 ? 's' : ''
        } to start (${participants.length}/${MAX_PARTICIPANTS} joined)`
      : isHost
      ? `Ready when you are — ${participants.length} participants, max ${MAX_PARTICIPANTS}`
      : `Waiting for host to lock the roster (${participants.length} joined)`
    : allSigned
    ? 'All signed — starting meeting...'
    : `${participants.filter((p) => p.startSig != null).length} of ${expectedCount} signed`

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {meeting.isPro && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs text-amber-900">
          Pro 会议 · 会议结束后将永久加密存证到 Arweave，参与人凭钱包独立解密
        </div>
      )}

      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
        <button
          onClick={() => router.push('/')}
          className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          Leave
        </button>
        <span className="text-sm font-semibold tracking-tight text-zinc-900">
          Meeting {code}
        </span>
        <div className="w-10" />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-1">
            <h1 className="text-lg font-semibold text-zinc-900">Lobby</h1>
            <p className="text-sm text-zinc-400">{headerStatus}</p>
          </div>

          <ParticipantsGrid participants={participants} myWallet={address ?? null} />

          {address && !rosterLocked && isHost && (
            <button
              onClick={handleLockRoster}
              disabled={locking || participants.length < MIN_PARTICIPANTS}
              className="w-full h-11 rounded-lg bg-zinc-900 text-white text-sm font-medium
                         transition-colors hover:bg-zinc-700
                         disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed"
            >
              {locking
                ? 'Locking...'
                : `Start meeting (lock roster, ${participants.length} ${
                    participants.length === 1 ? 'person' : 'people'
                  })`}
            </button>
          )}

          {address && (
            <StartButton
              meetingId={meeting.id}
              roomCode={code}
              walletAddress={address}
              participants={participantAddresses}
              hasSigned={hasSigned}
              allSigned={allSigned}
              rosterLocked={rosterLocked}
              onSigned={refreshState}
            />
          )}
        </div>
      </main>
    </div>
  )
}
