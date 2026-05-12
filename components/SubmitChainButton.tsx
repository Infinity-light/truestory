'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWaitForTransactionReceipt } from 'wagmi'
import { toast } from 'sonner'
import { useSubmitConsensus, buildMeetingId } from '@/lib/contract-write'

interface AllSignature {
  addr: string
  sig: string
  signedAt: string
}

interface SubmitChainButtonProps {
  roomCode: string
  meetingId: string
  finalMessagesRoot: `0x${string}`
  disputesRoot: `0x${string}`
  allSignatures: AllSignature[]
}

export function SubmitChainButton({
  roomCode,
  meetingId,
  finalMessagesRoot,
  disputesRoot,
  allSignatures,
}: SubmitChainButtonProps) {
  const router = useRouter()
  const { submitConsensus, data: txHash, isPending, isError, error } = useSubmitConsensus()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (isSuccess && txHash && !submitted) {
      setSubmitted(true)
      // Save tx hash to DB
      fetch(`/api/meetings/${roomCode}/on-chain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash }),
      }).catch(() => {})
      router.push(`/meeting/${roomCode}/done?tx=${txHash}`)
    }
  }, [isSuccess, txHash, submitted, roomCode, router])

  useEffect(() => {
    if (isError && error) {
      toast.error('Transaction failed: ' + (error.message ?? 'unknown error'))
    }
  }, [isError, error])

  function handleSubmit() {
    if (allSignatures.length < 3) {
      toast.error('Need all 3 signatures')
      return
    }

    const id = buildMeetingId(meetingId)
    const sigs = allSignatures
      .slice(0, 3)
      .map((s) => s.sig) as [`0x${string}`, `0x${string}`, `0x${string}`]

    submitConsensus(id, finalMessagesRoot, disputesRoot, sigs)
  }

  const isLoading = isPending || isConfirming

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
      disabled={isLoading}
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
