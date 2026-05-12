'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Message, Participant } from '@/types/meeting'
import { MessageBubble } from './MessageBubble'

interface MessagesWaterfallProps {
  roomCode: string
  myWallet: string
  participants?: Participant[]
  initialMessages?: Message[]
}

export function MessagesWaterfall({
  roomCode,
  myWallet,
  participants = [],
  initialMessages = [],
}: MessagesWaterfallProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Build address → color map for fast lookup in bubble render
  const colorMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of participants) {
      m.set(p.walletAddress.toLowerCase(), p.color)
    }
    return m
  }, [participants])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const channel = supabase
      .channel(`meeting:${roomCode}:messages`)
      .on('broadcast', { event: 'message_created' }, ({ payload }) => {
        const msg = payload as Message
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      })
      .on('broadcast', { event: 'message_updated' }, ({ payload }) => {
        const updated = payload as Message
        setMessages((prev) =>
          prev.map((m) => (m.id === updated.id ? updated : m)),
        )
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomCode])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-8">
        开始讲话即可，文字会在屏幕上自动出现
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isMine={msg.speakerAddress.toLowerCase() === myWallet.toLowerCase()}
          speakerColor={colorMap.get(msg.speakerAddress.toLowerCase())}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}

export type { MessagesWaterfallProps }
