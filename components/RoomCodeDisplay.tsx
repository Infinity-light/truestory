'use client'

import { useState } from 'react'

interface RoomCodeDisplayProps {
  roomCode: string
  joinUrl: string
}

export function RoomCodeDisplay({ roomCode, joinUrl }: RoomCodeDisplayProps) {
  const [codeCopied, setCodeCopied] = useState(false)
  const [urlCopied, setUrlCopied] = useState(false)

  async function copyCode() {
    await navigator.clipboard.writeText(roomCode)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(joinUrl)
    setUrlCopied(true)
    setTimeout(() => setUrlCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2">Meeting code</p>
        <div className="flex items-center justify-center gap-3">
          <span className="text-5xl font-mono font-semibold tracking-[0.15em] text-zinc-900">
            {roomCode}
          </span>
          <button
            onClick={copyCode}
            className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors px-2 py-1 border border-zinc-200 rounded"
          >
            {codeCopied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-100">
        <span className="flex-1 text-xs text-zinc-500 truncate font-mono">{joinUrl}</span>
        <button
          onClick={copyUrl}
          className="shrink-0 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          {urlCopied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </div>
  )
}
