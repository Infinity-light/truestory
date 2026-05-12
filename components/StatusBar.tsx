'use client'

import { useEffect, useState } from 'react'
import type { Participant } from '@/types/meeting'

interface StatusBarProps {
  roomCode: string
  participants: Participant[]
  myWallet: string
  recordingStartedAt: string | null
  isRecording: boolean
}

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function useElapsedTime(startIso: string | null): string {
  const [elapsed, setElapsed] = useState('00:00')

  useEffect(() => {
    if (!startIso) return
    const startMs = new Date(startIso).getTime()

    function tick() {
      const diff = Math.floor((Date.now() - startMs) / 1000)
      const mm = String(Math.floor(diff / 60)).padStart(2, '0')
      const ss = String(diff % 60).padStart(2, '0')
      setElapsed(`${mm}:${ss}`)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startIso])

  return elapsed
}

export function StatusBar({
  roomCode,
  participants,
  myWallet,
  recordingStartedAt,
  isRecording,
}: StatusBarProps) {
  const elapsed = useElapsedTime(recordingStartedAt)

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700 text-white text-sm">
      <div className="flex items-center gap-3">
        <span className="font-mono font-bold text-gray-300">#{roomCode}</span>
        <div className="flex items-center gap-1.5">
          {participants.map((p) => (
            <div
              key={p.walletAddress}
              title={p.walletAddress}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                p.walletAddress.toLowerCase() === myWallet.toLowerCase()
                  ? 'bg-green-700 text-green-100'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"
              />
              {shortAddress(p.walletAddress)}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="font-mono text-gray-300">{elapsed}</span>
        {isRecording && (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-red-400 text-xs font-medium">REC</span>
          </div>
        )}
      </div>
    </div>
  )
}
