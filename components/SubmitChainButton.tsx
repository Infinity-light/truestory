'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useSubmitConsensusSignature, buildMeetingId } from '@/lib/contract-write'

interface SubmitChainButtonProps {
  roomCode: string
  meetingId: string
  participants: readonly `0x${string}`[]
  finalMessagesRoot: `0x${string}`
  disputesRoot: `0x${string}`
  mySignature: `0x${string}`
}

export function SubmitChainButton({
  roomCode,
  meetingId,
  participants,
  finalMessagesRoot,
  disputesRoot,
  mySignature,
}: SubmitChainButtonProps) {
  const router = useRouter()
  const { submitSignature, hash: txHash, isPending, isConfirming, isSuccess, error } =
    useSubmitConsensusSignature()
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (isSuccess && txHash && !submitted) {
      setSubmitted(true)
      fetch(`/api/meetings/${roomCode}/on-chain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash }),
      }).catch(() => {})
      router.push(`/meeting/${roomCode}/done?tx=${txHash}`)
    }
  }, [isSuccess, txHash, submitted, roomCode, router])

  useEffect(() => {
    if (error) {
      toast.error('Transaction failed: ' + (error.message ?? 'unknown error'))
    }
  }, [error])

  function handleSubmit() {
    const id = buildMeetingId(meetingId)
    submitSignature(id, participants, finalMessagesRoot, disputesRoot, mySignature)
  }

  if (isSuccess) {
    return (
      <button
        disabled
        className="w-full h-11 rounded-lg bg-emerald-600 text-white text-sm font-medium cursor-default"
      >
        Confirmed — redirecting...
      </button>
    )
  }

  return (
    <button
      onClick={handleSubmit}
      disabled={isPending || isConfirming}
      className="w-full h-11 rounded-lg bg-zinc-900 text-white text-sm font-medium
                 transition-colors hover:bg-zinc-700
                 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed"
    >
      {isPending
        ? 'Confirm in wallet...'
        : isConfirming
        ? 'Waiting for confirmation...'
        : 'Submit to chain'}
    </button>
  )
}
