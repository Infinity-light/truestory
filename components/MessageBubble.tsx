'use client'

import type { Message } from '@/types/meeting'

interface MessageBubbleProps {
  message: Message
  isMine: boolean
  speakerColor?: string
}

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function formatTime(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function MessageBubble({ message, isMine, speakerColor }: MessageBubbleProps) {
  const displayText = message.finalText ?? message.originalText
  const color = speakerColor ?? '#888888'

  return (
    <div className={`flex w-full mb-3 ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span
            className="inline-block w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: color }}
            aria-label={`speaker color ${color}`}
          />
          <span className="font-mono">{shortAddress(message.speakerAddress)}</span>
          <span>{formatTime(message.spokenAt)}</span>
        </div>
        <div
          className={`rounded-2xl px-4 py-2 text-sm leading-relaxed break-words border-l-2 ${
            isMine
              ? 'bg-green-600 text-white rounded-tr-sm'
              : 'bg-white text-gray-900 rounded-tl-sm border border-gray-200'
          }`}
          style={!isMine ? { borderLeftColor: color, borderLeftWidth: '3px' } : undefined}
        >
          {displayText}
        </div>
        {message.isDisputed && (
          <div className="flex items-center gap-1 text-xs text-orange-500">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500" />
            disputed
          </div>
        )}
      </div>
    </div>
  )
}
