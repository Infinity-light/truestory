'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAccount } from 'wagmi'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useMeetingStore } from '@/store/meeting-store'
import { StatusBar } from '@/components/StatusBar'
import { MessagesWaterfall } from '@/components/MessagesWaterfall'
import { createAudioRecorder } from '@/lib/audio-recorder'
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

  const recorderRef = useRef(createAudioRecorder())

  const myWallet = address ?? ''
  const isHost = meeting?.hostAddress.toLowerCase() === myWallet.toLowerCase()

  // Load meeting state
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
    return data.meeting as Meeting
  }, [code, router, setMeeting, setParticipants])

  // Start microphone recording
  const startRecording = useCallback(async () => {
    try {
      await recorderRef.current.start()
      setIsRecording(true)
      setMicError(null)
    } catch {
      setMicError('Microphone access denied. Please allow microphone and reload.')
    }
  }, [])

  useEffect(() => {
    if (!isConnected || !address) return
    setMyWallet(address)

    refreshState().then((m) => {
      setLoading(false)
      if (m?.status === 'recording') {
        startRecording()
      } else if (m) {
        const dest = m.status === 'reviewing' ? 'review' : 'lobby'
        router.push(`/meeting/${code}/${dest}`)
      }
    })

    const channel = supabase
      .channel(`meeting:${code}`)
      .on('broadcast', { event: 'recording_ended' }, () => {
        // All participants navigate to /sign when recording ends (simplified path A: no review)
        router.push(`/meeting/${code}/sign`)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isConnected, address, code])

  const handleEndMeeting = useCallback(async () => {
    if (!isHost || isEnding) return
    setIsEnding(true)

    // Stop recording and get the audio blob
    let audioBlob: Blob | null = null
    if (recorderRef.current.isRecording()) {
      try {
        audioBlob = await recorderRef.current.stop()
        setIsRecording(false)
      } catch (err) {
        toast.error('Failed to stop recorder')
        setIsEnding(false)
        return
      }
    }

    // End the meeting on the backend
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

    // Upload audio for STT if we have a blob
    if (audioBlob && meeting?.id) {
      toast.loading('Transcribing audio...', { id: 'stt' })
      try {
        const form = new FormData()
        form.append('audio', audioBlob, 'recording.webm')
        form.append('speakerAddress', myWallet)
        form.append('meetingId', meeting.id)

        const sttRes = await fetch('/api/stt/recognize', { method: 'POST', body: form })
        if (sttRes.ok) {
          const { text } = await sttRes.json()
          if (text?.trim()) {
            await fetch('/api/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                meetingId: meeting.id,
                speakerAddress: myWallet,
                originalText: text,
                spokenAt: new Date().toISOString(),
              }),
            })
          }
        }
        toast.dismiss('stt')
      } catch {
        toast.dismiss('stt')
        toast.error('STT failed — your speech was not transcribed')
      }
    }

    // Navigate to sign page (path A: skip review)
    router.push(`/meeting/${code}/sign`)
  }, [isHost, isEnding, code, meeting, myWallet, router])

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
          onClick={() => { setMicError(null); startRecording() }}
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
