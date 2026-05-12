'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAccount } from 'wagmi'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { MeetingSummaryCard } from '@/components/MeetingSummaryCard'
import { SigningStatusGrid } from '@/components/SigningStatusGrid'
import { SignButton } from '@/components/SignButton'
import { SubmitChainButton } from '@/components/SubmitChainButton'

interface SummaryParticipant {
  address: string
  role: 'host' | 'participant'
  hasEndSigned: boolean
  endSig?: string
}

interface SummaryMessage {
  id: string
  speaker: string
  finalText: string
  finalHash: string
  spokenAt: string
}

interface SummaryDispute {
  messageId: string
  disputer: string
}

interface MeetingSummary {
  meeting: { roomCode: string; id: string; status: string }
  participants: SummaryParticipant[]
  messages: SummaryMessage[]
  disputes: SummaryDispute[]
  finalMessagesRoot: `0x${string}`
  disputesRoot: `0x${string}`
  signedMessage: string
}

export default function SignPage() {
  const params = useParams<{ code: string }>()
  const code = params.code
  const { address, isConnected } = useAccount()
  const router = useRouter()

  const [summary, setSummary] = useState<MeetingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  // Holds my wallet signature after I sign (needed for on-chain submission)
  const [mySignature, setMySignature] = useState<`0x${string}` | null>(null)

  const myAddress = address?.toLowerCase() ?? null

  const fetchSummary = useCallback(async () => {
    const res = await fetch(`/api/meetings/${code}/summary`)
    if (!res.ok) {
      toast.error('Failed to load meeting summary')
      router.push('/')
      return
    }
    const data: MeetingSummary = await res.json()
    setSummary(data)

    if (data.meeting.status === 'sealed') {
      router.push(`/meeting/${code}/done`)
    }
  }, [code, router])

  useEffect(() => {
    if (!isConnected || !address) return
    fetchSummary().finally(() => setLoading(false))

    const channel = supabase
      .channel(`meeting:${code}-sign`)
      .on('broadcast', { event: 'all_signed' }, () => {
        router.push(`/meeting/${code}/done`)
      })
      .on('broadcast', { event: 'participant_signed_end' }, fetchSummary)
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

  if (loading || !summary) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-zinc-400">Loading summary...</p>
      </div>
    )
  }

  const me = summary.participants.find((p) => p.address.toLowerCase() === myAddress)
  const hasSigned = me?.hasEndSigned ?? false
  const allSigned =
    summary.participants.length === 3 && summary.participants.every((p) => p.hasEndSigned)

  const myMessageCount = summary.messages.filter(
    (m) => m.speaker.toLowerCase() === myAddress
  ).length

  // Build sorted participants tuple for on-chain call (must be exactly 3)
  const participantsTuple =
    summary.participants.length === 3
      ? (summary.participants.map((p) => p.address) as [
          `0x${string}`,
          `0x${string}`,
          `0x${string}`,
        ])
      : null

  // Resolve my signature — prefer local state (from this session), fall back to DB value
  const resolvedSig =
    mySignature ?? (me?.endSig ? (me.endSig as `0x${string}`) : null)

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
        <span className="text-sm font-semibold tracking-tight text-zinc-900">Sign Record</span>
        <span className="font-mono text-sm text-zinc-400">{code}</span>
      </header>

      <main className="flex flex-1 flex-col items-center px-6 py-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-lg font-semibold text-zinc-900">Meeting complete</h1>
            <p className="text-sm text-zinc-400">
              {allSigned
                ? 'All signed — submit to chain'
                : hasSigned
                ? 'Waiting for others to sign'
                : 'Review the record and sign to confirm'}
            </p>
          </div>

          <MeetingSummaryCard
            roomCode={code}
            messageCount={summary.messages.length}
            myMessageCount={myMessageCount}
            disputeCount={summary.disputes.length}
          />

          <SigningStatusGrid signers={summary.participants} myAddress={address ?? null} />

          {/* Step 1: off-chain wallet sign */}
          {!hasSigned && address && (
            <SignButton
              roomCode={code}
              walletAddress={address}
              meetingId={summary.meeting.id}
              finalMessagesRoot={summary.finalMessagesRoot}
              disputesRoot={summary.disputesRoot}
              onSigned={(sig) => {
                setMySignature(sig)
                fetchSummary()
              }}
            />
          )}

          {/* Step 1 done, waiting for others */}
          {hasSigned && !allSigned && (
            <div className="w-full h-11 rounded-lg bg-zinc-100 flex items-center justify-center">
              <span className="text-sm text-zinc-400">Waiting for others...</span>
            </div>
          )}

          {/* Step 2: each person submits their own sig on-chain */}
          {allSigned && participantsTuple && resolvedSig && (
            <SubmitChainButton
              roomCode={code}
              meetingId={summary.meeting.id}
              participants={participantsTuple}
              finalMessagesRoot={summary.finalMessagesRoot}
              disputesRoot={summary.disputesRoot}
              mySignature={resolvedSig}
            />
          )}

          {/* All signed but sig not resolved yet (edge: page reload without local state) */}
          {allSigned && (!participantsTuple || !resolvedSig) && (
            <div className="w-full h-11 rounded-lg bg-zinc-100 flex items-center justify-center">
              <span className="text-sm text-zinc-400">Loading chain button...</span>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
