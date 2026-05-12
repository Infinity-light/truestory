'use client'

import { useState } from 'react'
import { useSignMessage } from 'wagmi'
import { toast } from 'sonner'
import { buildParticipantsHash } from '@/lib/contract-write'

interface StartButtonProps {
  meetingId: string
  roomCode: string
  walletAddress: string
  participants: `0x${string}`[]
  hasSigned: boolean
  allSigned: boolean
  rosterLocked: boolean
  onSigned: () => void
}

export function StartButton({
  meetingId,
  roomCode,
  walletAddress,
  participants,
  hasSigned,
  allSigned,
  rosterLocked,
  onSigned,
}: StartButtonProps) {
  const [signing, setSigning] = useState(false)
  const { signMessageAsync } = useSignMessage()

  async function handleStart() {
    setSigning(true)
    try {
      const ts = Date.now()
      const participantsHash = buildParticipantsHash(participants)
      // Signed message binds the meetingId + frozen participants list + timestamp.
      const message = `trueStory Start: meetingId=${meetingId} participantsHash=${participantsHash} ts=${ts}`

      const signature = await signMessageAsync({ message })

      const res = await fetch(`/api/meetings/${roomCode}/sign-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, signature, signedMessage: message }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to submit signature')
        return
      }

      onSigned()
    } catch (err: unknown) {
      if (err instanceof Error && err.message.toLowerCase().includes('rejected')) return
      toast.error('Signing failed')
    } finally {
      setSigning(false)
    }
  }

  if (!rosterLocked) {
    return (
      <button
        disabled
        className="w-full h-11 rounded-lg bg-zinc-100 text-zinc-400 text-sm font-medium cursor-not-allowed"
      >
        Waiting for host to lock the roster
      </button>
    )
  }

  if (allSigned) {
    return (
      <button
        disabled
        className="w-full h-11 rounded-lg bg-emerald-600 text-white text-sm font-medium cursor-default"
      >
        All signed — redirecting...
      </button>
    )
  }

  if (hasSigned) {
    return (
      <button
        disabled
        className="w-full h-11 rounded-lg bg-zinc-200 text-zinc-400 text-sm font-medium cursor-not-allowed"
      >
        Waiting for others to sign...
      </button>
    )
  }

  return (
    <button
      onClick={handleStart}
      disabled={signing}
      className="w-full h-11 rounded-lg bg-zinc-900 text-white text-sm font-medium
                 transition-colors hover:bg-zinc-700
                 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed"
    >
      {signing ? 'Signing...' : 'Sign to join meeting'}
    </button>
  )
}
