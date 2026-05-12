'use client'

import { useState } from 'react'
import { useSignMessage } from 'wagmi'
import { toast } from 'sonner'
import { buildConsensusMessage, buildMeetingId } from '@/lib/contract-write'

interface SignButtonProps {
  roomCode: string
  walletAddress: string
  meetingId: string
  finalMessagesRoot: `0x${string}`
  disputesRoot: `0x${string}`
  onSigned: (signature: `0x${string}`) => void
}

export function SignButton({
  roomCode,
  walletAddress,
  meetingId,
  finalMessagesRoot,
  disputesRoot,
  onSigned,
}: SignButtonProps) {
  const [signing, setSigning] = useState(false)
  const { signMessageAsync } = useSignMessage()

  async function handleSign() {
    setSigning(true)
    try {
      const onChainMeetingId = buildMeetingId(meetingId)
      const consensusHash = buildConsensusMessage(onChainMeetingId, finalMessagesRoot, disputesRoot)

      // Sign raw hash — wallet prepends EIP-191 prefix automatically
      const signature = await signMessageAsync({ message: { raw: consensusHash } })

      const res = await fetch(`/api/meetings/${roomCode}/sign-end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          signature,
          signedMessage: consensusHash,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to submit signature')
        return
      }

      onSigned(signature)
    } catch (err: unknown) {
      if (err instanceof Error && err.message.toLowerCase().includes('rejected')) return
      toast.error('Signing failed')
    } finally {
      setSigning(false)
    }
  }

  return (
    <button
      onClick={handleSign}
      disabled={signing}
      className="w-full h-11 rounded-lg bg-zinc-900 text-white text-sm font-medium
                 transition-colors hover:bg-zinc-700
                 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed"
    >
      {signing ? 'Signing...' : 'Sign meeting record'}
    </button>
  )
}
