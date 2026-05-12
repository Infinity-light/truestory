'use client'

import type { Participant } from '@/types/meeting'

interface ParticipantsListProps {
  participants: Participant[]
  myWallet: string | null
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function ParticipantsList({ participants, myWallet }: ParticipantsListProps) {
  const slots = Array.from({ length: 3 }, (_, i) => participants[i] ?? null)

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-400 uppercase tracking-widest">Participants</p>
      <div className="space-y-2">
        {slots.map((p, i) =>
          p ? (
            <div
              key={p.walletAddress}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-100"
            >
              <span className="w-5 h-5 rounded-full bg-zinc-200 flex items-center justify-center text-xs text-zinc-500 shrink-0">
                {i + 1}
              </span>
              <span className="flex-1 text-sm font-mono text-zinc-700">
                {shortAddr(p.walletAddress)}
                {p.walletAddress.toLowerCase() === myWallet?.toLowerCase() && (
                  <span className="ml-2 text-xs text-zinc-400">(you)</span>
                )}
              </span>
              {p.role === 'host' && (
                <span className="text-xs text-zinc-400 border border-zinc-200 px-1.5 py-0.5 rounded">
                  host
                </span>
              )}
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            </div>
          ) : (
            <div
              key={`empty-${i}`}
              className="flex items-center gap-3 px-3 py-2 rounded-lg border border-dashed border-zinc-200"
            >
              <span className="w-5 h-5 rounded-full border border-dashed border-zinc-300 flex items-center justify-center text-xs text-zinc-300 shrink-0">
                {i + 1}
              </span>
              <span className="text-sm text-zinc-300">Waiting for participant...</span>
            </div>
          )
        )}
      </div>
    </div>
  )
}
