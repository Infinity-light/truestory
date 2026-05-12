'use client'

import { useState } from 'react'
import { useSignMessage } from 'wagmi'
import { toast } from 'sonner'

interface StartButtonProps {
  roomCode: string
  walletAddress: string
  hasSigned: boolean
  allSigned: boolean
  onSigned: () => void
}

export function StartButton({
  roomCode,
  walletAddress,
  hasSigned,
  allSigned,
  onSigned,
}: StartButtonProps) {
  const [signing, setSigning] = useState(false)
  const { signMessageAsync } = useSignMessage()

  async function handleStart() {
    setSigning(true)
    try {
      const ts = Date.now()
      const message = `TriSign Start: roomCode=${roomCode} ts=${ts}`

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
      // User rejected wallet signing — silent, no toast needed
      if (err instanceof Error && err.message.toLowerCase().includes('rejected')) return
      toast.error('Signing failed')
    } finally {
      setSigning(false)
    }
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
      {signing ? 'Signing...' : 'Start meeting'}
    </button>
  )
}
