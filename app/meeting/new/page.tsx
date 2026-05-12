'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useMeetingStore } from '@/store/meeting-store'
import { RoomCodeDisplay } from '@/components/RoomCodeDisplay'
import { ParticipantsList } from '@/components/ParticipantsList'
import { ProToggle } from '@/components/ProToggle'
import {
  useProMembershipActive,
  usePayForProMeeting,
  buildMeetingId,
} from '@/lib/contract-write'
import type { Participant, Meeting } from '@/types/meeting'

type Phase = 'setup' | 'paying' | 'creating' | 'waiting'

export default function NewMeetingPage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const { setMeeting, setParticipants, setMyWallet } = useMeetingStore()

  const [phase, setPhase] = useState<Phase>('setup')
  const [isPro, setIsPro] = useState(false)
  const [skipAttestation, setSkipAttestation] = useState(false)
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [joinUrl, setJoinUrl] = useState<string>('')
  const [participants, setLocalParticipants] = useState<Participant[]>([])
  const createdRef = useRef(false)
  const pendingMeetingIdRef = useRef<string | null>(null)

  const { data: hasMembership } = useProMembershipActive(address)

  const {
    payForMeeting,
    hash: payHash,
    isSuccess: paySuccess,
    error: payError,
    isPending: payPending,
    isConfirming: payConfirming,
  } = usePayForProMeeting()

  async function createMeetingRecord(meetingUuid: string) {
    if (!address) return
    setPhase('creating')
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostAddress: address,
          isPro,
          skipAttestation,
          clientMeetingId: meetingUuid,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to create meeting')
        setPhase('setup')
        createdRef.current = false
        return
      }
      const data = await res.json()
      setRoomCode(data.roomCode)
      setJoinUrl(data.joinUrl)
      setMyWallet(address)

      const stateRes = await fetch(`/api/meetings/${data.roomCode}`)
      if (stateRes.ok) {
        const state = await stateRes.json()
        setMeeting(state.meeting as Meeting)
        setParticipants(state.participants as Participant[])
        setLocalParticipants(state.participants as Participant[])
      }
      setPhase('waiting')
    } catch (e) {
      toast.error('Failed to create meeting')
      setPhase('setup')
      createdRef.current = false
    }
  }

  useEffect(() => {
    if (paySuccess && pendingMeetingIdRef.current && !createdRef.current) {
      createdRef.current = true
      createMeetingRecord(pendingMeetingIdRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paySuccess])

  useEffect(() => {
    if (payError) {
      toast.error('Payment cancelled or failed')
      setPhase('setup')
      pendingMeetingIdRef.current = null
      createdRef.current = false
    }
  }, [payError])

  useEffect(() => {
    if (!roomCode) return
    const channel = supabase
      .channel(`meeting:${roomCode}`)
      .on('broadcast', { event: 'participant_joined' }, async () => {
        const refreshRes = await fetch(`/api/meetings/${roomCode}`)
        if (refreshRes.ok) {
          const refreshed = await refreshRes.json()
          setParticipants(refreshed.participants)
          setLocalParticipants(refreshed.participants)
        }
      })
      .on('broadcast', { event: 'meeting_started' }, () => {
        router.push(`/meeting/${roomCode}/lobby`)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomCode, router, setParticipants])

  async function handleCreate() {
    if (!address || phase !== 'setup') return

    const meetingUuid = crypto.randomUUID()
    pendingMeetingIdRef.current = meetingUuid

    if (isPro) {
      setPhase('paying')
      const meetingIdBytes32 = buildMeetingId(meetingUuid)
      payForMeeting(meetingIdBytes32, Boolean(hasMembership))
    } else {
      createMeetingRecord(meetingUuid)
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-zinc-400">Connect your wallet to continue</p>
      </div>
    )
  }

  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            Back
          </button>
          <span className="text-sm font-semibold tracking-tight text-zinc-900">New meeting</span>
          <div className="w-10" />
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-6 py-8">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
                创建新会议
              </h1>
              <p className="text-sm text-zinc-500">2-10 人共识，每人钱包签名上链</p>
            </div>

            <ProToggle
              value={isPro}
              onChange={setIsPro}
              hasMembership={Boolean(hasMembership)}
              skipAttestation={skipAttestation}
              onSkipAttestationChange={setSkipAttestation}
            />

            <button
              onClick={handleCreate}
              className="w-full h-11 rounded-lg bg-zinc-900 text-white text-sm font-medium
                         transition-colors hover:bg-zinc-700"
            >
              {isPro && !hasMembership
                ? '支付 0.5 MON 并创建 Pro 会议'
                : isPro
                ? '创建 Pro 会议（月卡覆盖）'
                : '创建会议'}
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (phase === 'paying') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-2 max-w-sm px-6">
          <p className="text-sm font-medium text-zinc-900">
            {payPending
              ? '请在钱包中确认 Pro 付款'
              : payConfirming
              ? '等待链上确认...'
              : '正在处理付款...'}
          </p>
          {payHash && (
            <p className="text-xs text-zinc-400 break-all font-mono">{payHash}</p>
          )}
        </div>
      </div>
    )
  }

  if (phase === 'creating' || !roomCode) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-zinc-400">Creating meeting...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {isPro && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs text-amber-900">
          Pro 会议 · 永久加密存证 ·{' '}
          {skipAttestation ? '不 mint NFT' : '将给参与人各 mint 一张参会凭证 NFT'}
        </div>
      )}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
        <button
          onClick={() => router.push('/')}
          className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          Back
        </button>
        <span className="text-sm font-semibold tracking-tight text-zinc-900">New meeting</span>
        <div className="w-10" />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm space-y-8">
          <RoomCodeDisplay roomCode={roomCode} joinUrl={joinUrl + (isPro ? '&pro=1' : '')} />

          <ParticipantsList participants={participants} myWallet={address ?? null} />

          {participants.length >= 2 && (
            <button
              onClick={() => router.push(`/meeting/${roomCode}/lobby`)}
              className="w-full h-11 rounded-lg bg-zinc-900 text-white text-sm font-medium
                         transition-colors hover:bg-zinc-700"
            >
              Go to lobby
            </button>
          )}

          {participants.length < 2 && (
            <p className="text-center text-xs text-zinc-400">
              Share the code or link — at least 1 more participant needed
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
