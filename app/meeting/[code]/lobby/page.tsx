'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAccount } from 'wagmi'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useMeetingStore } from '@/store/meeting-store'
import { ParticipantsGrid } from '@/components/ParticipantsGrid'
import { StartButton } from '@/components/StartButton'
import type { Participant, Meeting } from '@/types/meeting'

export default function LobbyPage() {
  // useParams() — correct for client components in Next.js 15+
  const params = useParams<{ code: string }>()
  const code = params.code

  const { address, isConnected } = useAccount()
  const router = useRouter()
  const { setMeeting, setParticipants, setMyWallet } = useMeetingStore()

  const [participants, setLocalParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)

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
      .on('broadcast', { event: 'meeting_started' }, () => {
        router.push(`/meeting/${code}/recording`)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isConnected, address, code])

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-zinc-400">Connect your wallet to continue</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-zinc-400">Loading lobby...</p>
      </div>
    )
  }

  const me = participants.find((p) => p.walletAddress.toLowerCase() === myWallet)
  const hasSigned = me?.startSig != null
  const allSigned = participants.length === 3 && participants.every((p) => p.startSig != null)

  return (
    <div className="min-h-screen bg-white flex flex-col">
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
            <p className="text-sm text-zinc-400">
              {allSigned
                ? 'All signed — starting meeting...'
                : participants.length < 3
                ? `Waiting for ${3 - participants.length} more participant${3 - participants.length > 1 ? 's' : ''}`
                : 'Sign to start the meeting'}
            </p>
          </div>

          <ParticipantsGrid participants={participants} myWallet={address ?? null} />

          {address && (
            <StartButton
              roomCode={code}
              walletAddress={address}
              hasSigned={hasSigned}
              allSigned={allSigned}
              onSigned={refreshState}
            />
          )}
        </div>
      </main>
    </div>
  )
}
