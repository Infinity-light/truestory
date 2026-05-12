'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAccount } from 'wagmi'
import { toast } from 'sonner'
import { useMeetingStore } from '@/store/meeting-store'
import type { Meeting, Participant } from '@/types/meeting'

function JoinForm() {
  const searchParams = useSearchParams()
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const { setMeeting, setParticipants, setMyWallet } = useMeetingStore()

  const [code, setCode] = useState(searchParams.get('code') ?? '')
  const [joining, setJoining] = useState(false)

  async function handleJoin() {
    if (!address || code.length !== 6) return
    setJoining(true)
    try {
      const res = await fetch(`/api/meetings/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      })

      if (!res.ok) {
        const err = await res.json()
        const messages: Record<number, string> = {
          404: 'Meeting not found',
          409: err.error === 'meeting_full'
            ? 'This meeting is full (3 participants max)'
            : 'Meeting is no longer accepting participants',
          410: 'This meeting has expired',
        }
        toast.error(messages[res.status] ?? err.error ?? 'Failed to join meeting')
        return
      }

      const data = await res.json()
      setMyWallet(address)

      // Fetch full meeting state
      const stateRes = await fetch(`/api/meetings/${code}`)
      if (stateRes.ok) {
        const state = await stateRes.json()
        setMeeting(state.meeting as Meeting)
        setParticipants(state.participants as Participant[])
      }

      router.push(`/meeting/${code}/lobby`)
    } finally {
      setJoining(false)
    }
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
        <span className="text-sm font-semibold tracking-tight text-zinc-900">Join meeting</span>
        <div className="w-10" />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Enter meeting code</h1>
            <p className="text-sm text-zinc-400">Ask the host for the 6-digit code</p>
          </div>

          <input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="w-full h-14 rounded-lg border border-zinc-200 bg-white px-4
                       text-center text-3xl font-mono tracking-[0.2em] text-zinc-900
                       placeholder:text-zinc-200
                       focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          />

          <button
            onClick={handleJoin}
            disabled={!isConnected || code.length !== 6 || joining}
            className="w-full h-11 rounded-lg bg-zinc-900 text-white text-sm font-medium
                       transition-colors hover:bg-zinc-700
                       disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed"
          >
            {joining ? 'Joining...' : 'Join meeting'}
          </button>

          {!isConnected && (
            <p className="text-center text-xs text-zinc-400">Connect your wallet to join</p>
          )}
        </div>
      </main>
    </div>
  )
}

export default function JoinMeetingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <p className="text-sm text-zinc-400">Loading...</p>
        </div>
      }
    >
      <JoinForm />
    </Suspense>
  )
}
