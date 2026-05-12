'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAccount } from 'wagmi'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useMeetingStore } from '@/store/meeting-store'
import { StatusBar } from '@/components/StatusBar'
import { MessagesWaterfall } from '@/components/MessagesWaterfall'
import { EndMeetingProposalBar } from '@/components/EndMeetingProposalBar'
import { createStreamingRecorder } from '@/lib/audio-recorder'
import { StreamingStt } from '@/lib/stt-client'
import type { Meeting, Participant } from '@/types/meeting'

interface ActiveProposal {
  proposerAddress: string
  agreedAddresses: string[]
  disagreedAddresses: string[]
  threshold: number
}

export default function RecordingPage() {
  const params = useParams<{ code: string }>()
  const code = params.code
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { meeting, participants, setMeeting, setParticipants, setMyWallet } = useMeetingStore()

  const [loading, setLoading] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [isProposing, setIsProposing] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const [activeProposal, setActiveProposal] = useState<ActiveProposal | null>(null)

  const sttRef = useRef<StreamingStt | null>(null)
  const recorderRef = useRef<ReturnType<typeof createStreamingRecorder> | null>(null)
  const meetingIdRef = useRef<string | null>(null)
  const myWalletRef = useRef<string>('')
  const lastMessageIdRef = useRef<string | null>(null)

  const myWallet = address ?? ''
  const isHost = meeting?.hostAddress.toLowerCase() === myWallet.toLowerCase()

  const postMessage = useCallback(async (text: string) => {
    const meetingId = meetingIdRef.current
    if (!meetingId || !myWalletRef.current || !text.trim()) return
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId,
          speakerAddress: myWalletRef.current,
          originalText: text.trim(),
          spokenAt: new Date().toISOString(),
        }),
      })
    } catch {
      // Non-fatal
    }
  }, [])

  const startStreaming = useCallback(async () => {
    try {
      const stt = new StreamingStt({
        onTranscript: ({ text, isFinal }) => {
          if (isFinal) postMessage(text)
        },
        onError: (err) => {
          console.error('STT error', err)
          toast.error('STT connection error')
        },
      })

      const recorder = createStreamingRecorder({
        onPcmChunk: (pcm16) => stt.sendPcm16(pcm16),
        sampleRate: 16000,
        bufferSize: 4096,
      })

      await stt.connect()
      await recorder.start()

      sttRef.current = stt
      recorderRef.current = recorder
      setIsRecording(true)
      setMicError(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('getUserMedia') || msg.includes('Permission')) {
        setMicError('Microphone access denied. Please allow microphone and reload.')
      } else {
        setMicError(`Failed to start recording: ${msg}`)
      }
    }
  }, [postMessage])

  const stopStreaming = useCallback(() => {
    sttRef.current?.stop()
    recorderRef.current?.stop()
    sttRef.current = null
    recorderRef.current = null
    setIsRecording(false)
  }, [])

  const refreshState = useCallback(async () => {
    const res = await fetch(`/api/meetings/${code}`)
    if (!res.ok) {
      toast.error('Failed to load meeting')
      router.push('/')
      return null
    }
    const data = await res.json()
    setMeeting(data.meeting as Meeting)
    setParticipants(data.participants as Participant[])
    meetingIdRef.current = data.meeting.id
    return data.meeting as Meeting
  }, [code, router, setMeeting, setParticipants])

  const fetchMissedMessages = useCallback(async () => {
    const meetingId = meetingIdRef.current
    if (!meetingId) return
    const since = lastMessageIdRef.current
    const url = `/api/messages?meeting_id=${meetingId}${since ? `&since=${since}` : ''}`
    try {
      const res = await fetch(url)
      if (!res.ok) return
      const data = await res.json()
      const messages = data.messages as { id: string }[]
      if (messages.length > 0) {
        toast(`Caught up · ${messages.length} 条消息`, { duration: 3000 })
        lastMessageIdRef.current = messages[messages.length - 1].id
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (!isConnected || !address) return
    setMyWallet(address)
    myWalletRef.current = address

    refreshState().then((m) => {
      setLoading(false)
      if (m?.status === 'recording') {
        startStreaming()
      } else if (m) {
        const dest = m.status === 'reviewing' ? 'sign' : 'lobby'
        router.push(`/meeting/${code}/${dest}`)
      }
    })

    const channel = supabase
      .channel(`meeting:${code}`)
      .on('broadcast', { event: 'recording_ended' }, () => {
        stopStreaming()
        router.push(`/meeting/${code}/sign`)
      })
      .on('broadcast', { event: 'end_proposed' }, async () => {
        // Refresh proposal state
        const res = await fetch(`/api/meetings/${code}`)
        if (res.ok) {
          const data = await res.json()
          const m = data.meeting as Meeting
          if (m.status === 'recording') {
            // Build proposal view from broadcast — alternatively fetch /end-proposals endpoint
            // Here we trust the broadcast payload
          }
          // Re-fetch active proposal directly
          await refetchProposal()
        }
      })
      .on('broadcast', { event: 'end_voted' }, () => {
        refetchProposal()
      })
      .on('broadcast', { event: 'end_cancelled' }, () => {
        setActiveProposal(null)
      })
      .on('system', { event: 'reconnected' } as never, () => {
        fetchMissedMessages()
      })
      .subscribe()

    // Re-fetch on regain network
    function onOnline() {
      fetchMissedMessages()
      refetchProposal()
    }
    window.addEventListener('online', onOnline)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('online', onOnline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, code])

  async function refetchProposal() {
    const res = await fetch(`/api/meetings/${code}`)
    if (!res.ok) return
    const data = await res.json()
    const m = data.meeting as Meeting & {
      proposedEndBy?: string | null
    }
    if (!m.recordingStartedAt) return
    // We don't have a dedicated endpoint for proposal state, but the broadcast carries enough info.
    // Simpler: parse meeting.proposed_end_by; if set, fetch the proposal row.
    // For now: probe by re-fetching meeting; presence of proposed_end_by indicates active proposal.
  }

  useEffect(() => {
    if (address) myWalletRef.current = address
  }, [address])

  useEffect(() => {
    if (meeting?.id) meetingIdRef.current = meeting.id
  }, [meeting?.id])

  const handleProposeEnd = useCallback(async () => {
    if (!address || isProposing) return
    setIsProposing(true)
    try {
      const res = await fetch(`/api/meetings/${code}/propose-end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposerAddress: address }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to propose end')
      }
    } finally {
      setIsProposing(false)
    }
  }, [address, code, isProposing])

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-sm text-gray-400">Connect your wallet to continue</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    )
  }

  if (micError) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-red-400 text-center max-w-sm">{micError}</p>
        <button
          onClick={() => {
            setMicError(null)
            startStreaming()
          }}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600"
        >
          Retry
        </button>
      </div>
    )
  }

  const proposedEndBy = (meeting as (Meeting & { proposedEndBy?: string | null }) | null)?.proposedEndBy
  const showProposalBar = proposedEndBy && activeProposal

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col text-white">
      {showProposalBar && activeProposal && (
        <EndMeetingProposalBar
          roomCode={code}
          myAddress={myWallet}
          proposerAddress={activeProposal.proposerAddress}
          agreedCount={activeProposal.agreedAddresses.length}
          threshold={activeProposal.threshold}
          myVote={
            activeProposal.agreedAddresses.some((a) => a.toLowerCase() === myWallet.toLowerCase())
              ? 'agreed'
              : activeProposal.disagreedAddresses.some((a) => a.toLowerCase() === myWallet.toLowerCase())
              ? 'disagreed'
              : null
          }
        />
      )}

      <StatusBar
        roomCode={code}
        participants={participants}
        myWallet={myWallet}
        recordingStartedAt={meeting?.recordingStartedAt ?? null}
        isRecording={isRecording}
      />

      <MessagesWaterfall roomCode={code} myWallet={myWallet} />

      <div className="flex-shrink-0 px-4 py-4 border-t border-gray-800 flex justify-center">
        <button
          onClick={handleProposeEnd}
          disabled={isProposing || Boolean(proposedEndBy)}
          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
        >
          {proposedEndBy
            ? '已有结束提议'
            : isProposing
            ? 'Proposing...'
            : isHost
            ? 'End Meeting · 发起结束提议'
            : 'Propose End · 发起结束提议'}
        </button>
      </div>
    </div>
  )
}
