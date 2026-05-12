'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAccount } from 'wagmi'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useMeetingStore } from '@/store/meeting-store'
import { StatusBar } from '@/components/StatusBar'
import { MessagesWaterfall } from '@/components/MessagesWaterfall'
import { createStreamingRecorder } from '@/lib/audio-recorder'
import { StreamingStt } from '@/lib/stt-client'
import type { Meeting, Participant } from '@/types/meeting'

export default function RecordingPage() {
  const params = useParams<{ code: string }>()
  const code = params.code
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { meeting, participants, setMeeting, setParticipants, setMyWallet } = useMeetingStore()

  const [loading, setLoading] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)

  const sttRef = useRef<StreamingStt | null>(null)
  const recorderRef = useRef<ReturnType<typeof createStreamingRecorder> | null>(null)
  const meetingIdRef = useRef<string | null>(null)
  const myWalletRef = useRef<string>('')

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
      // Non-fatal: waterfall might miss one message
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

      // Connect STT first, then start recording so the WS is ready for audio
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

  useEffect(() => {
    if (!isConnected || !address) return
    setMyWallet(address)
    myWalletRef.current = address

    refreshState().then((m) => {
      setLoading(false)
      if (m?.status === 'recording') {
        startStreaming()
      } else if (m) {
        const dest = m.status === 'reviewing' ? 'review' : 'lobby'
        router.push(`/meeting/${code}/${dest}`)
      }
    })

    const channel = supabase
      .channel(`meeting:${code}`)
      .on('broadcast', { event: 'recording_ended' }, () => {
        stopStreaming()
        router.push(`/meeting/${code}/sign`)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isConnected, address, code])

  // Keep myWalletRef in sync
  useEffect(() => {
    if (address) myWalletRef.current = address
  }, [address])

  // Keep meetingIdRef in sync
  useEffect(() => {
    if (meeting?.id) meetingIdRef.current = meeting.id
  }, [meeting?.id])

  const handleEndMeeting = useCallback(async () => {
    if (!isHost || isEnding) return
    setIsEnding(true)

    stopStreaming()

    const endRes = await fetch(`/api/meetings/${code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'end-recording', hostAddress: myWallet }),
    })

    if (!endRes.ok) {
      toast.error('Failed to end meeting')
      setIsEnding(false)
      return
    }

    router.push(`/meeting/${code}/sign`)
  }, [isHost, isEnding, code, myWallet, router, stopStreaming])

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
          onClick={() => { setMicError(null); startStreaming() }}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col text-white">
      <StatusBar
        roomCode={code}
        participants={participants}
        myWallet={myWallet}
        recordingStartedAt={meeting?.recordingStartedAt ?? null}
        isRecording={isRecording}
      />

      <MessagesWaterfall roomCode={code} myWallet={myWallet} />

      {isHost && (
        <div className="flex-shrink-0 px-4 py-4 border-t border-gray-800 flex justify-center">
          <button
            onClick={handleEndMeeting}
            disabled={isEnding}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
          >
            {isEnding ? 'Ending...' : 'End Meeting'}
          </button>
        </div>
      )}
    </div>
  )
}
