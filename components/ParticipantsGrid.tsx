'use client'

import type { Participant } from '@/types/meeting'

interface ParticipantsGridProps {
  participants: Participant[]
  myWallet: string | null
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function ParticipantsGrid({ participants, myWallet }: ParticipantsGridProps) {
  const slots = Array.from({ length: 3 }, (_, i) => participants[i] ?? null)

  return (
    <div className="grid grid-cols-3 gap-3">
      {slots.map((p, i) =>
        p ? (
          <div key={p.walletAddress} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-zinc-100 bg-zinc-50">
            <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center text-sm font-medium text-zinc-600">
              {i + 1}
            </div>
            <span className="text-xs font-mono text-zinc-700 text-center break-all">
              {shortAddr(p.walletAddress)}
              {p.walletAddress.toLowerCase() === myWallet?.toLowerCase() && (
                <span className="block text-zinc-400">(you)</span>
              )}
            </span>
            {p.startSig ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Ready
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                Waiting...
              </span>
            )}
          </div>
        ) : (
          <div
            key={`empty-${i}`}
            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-dashed border-zinc-200"
          >
            <div className="w-10 h-10 rounded-full border-2 border-dashed border-zinc-200 flex items-center justify-center text-sm text-zinc-300">
              {i + 1}
            </div>
            <span className="text-xs text-zinc-300">Empty</span>
          </div>
        )
      )}
    </div>
  )
}
