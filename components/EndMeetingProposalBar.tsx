'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface EndMeetingProposalBarProps {
  roomCode: string
  myAddress: string
  proposerAddress: string
  agreedCount: number
  threshold: number
  myVote: 'agreed' | 'disagreed' | null
}

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

export function EndMeetingProposalBar({
  roomCode,
  myAddress,
  proposerAddress,
  agreedCount,
  threshold,
  myVote,
}: EndMeetingProposalBarProps) {
  const [voting, setVoting] = useState(false)
  const isProposer = proposerAddress.toLowerCase() === myAddress.toLowerCase()

  async function vote(agree: boolean) {
    setVoting(true)
    try {
      const res = await fetch(`/api/meetings/${roomCode}/vote-end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterAddress: myAddress, agree }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to vote')
      }
    } finally {
      setVoting(false)
    }
  }

  async function cancelProposal() {
    setVoting(true)
    try {
      const res = await fetch(`/api/meetings/${roomCode}/cancel-end-proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposerAddress: myAddress }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to cancel')
      }
    } finally {
      setVoting(false)
    }
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between gap-3">
      <div className="text-sm text-amber-900">
        <span className="font-medium">{shortAddr(proposerAddress)}</span> 提议结束会议 ·{' '}
        <span className="font-mono">
          {agreedCount}/{threshold}
        </span>{' '}
        同意
      </div>
      <div className="flex items-center gap-2">
        {isProposer ? (
          <button
            onClick={cancelProposal}
            disabled={voting}
            className="px-3 py-1.5 rounded-md bg-white border border-amber-300 text-xs text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            撤销
          </button>
        ) : (
          <>
            <button
              onClick={() => vote(true)}
              disabled={voting || myVote === 'agreed'}
              className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {myVote === 'agreed' ? '✓ 已同意' : '同意'}
            </button>
            <button
              onClick={() => vote(false)}
              disabled={voting || myVote === 'disagreed'}
              className="px-3 py-1.5 rounded-md bg-white border border-zinc-300 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              {myVote === 'disagreed' ? '✓ 已反对' : '不同意'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
