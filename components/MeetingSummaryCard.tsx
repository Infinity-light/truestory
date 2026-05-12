'use client'

interface MeetingSummaryCardProps {
  roomCode: string
  messageCount: number
  myMessageCount: number
  disputeCount: number
}

export function MeetingSummaryCard({
  roomCode,
  messageCount,
  myMessageCount,
  disputeCount,
}: MeetingSummaryCardProps) {
  return (
    <div className="w-full rounded-xl border border-zinc-100 bg-zinc-50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Meeting</span>
        <span className="font-mono text-sm font-semibold text-zinc-900 tracking-widest">
          {roomCode}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center py-3 rounded-lg bg-white border border-zinc-100">
          <span className="text-xl font-semibold text-zinc-900">{messageCount}</span>
          <span className="text-xs text-zinc-400 mt-0.5">messages</span>
        </div>
        <div className="flex flex-col items-center py-3 rounded-lg bg-white border border-zinc-100">
          <span className="text-xl font-semibold text-zinc-900">{myMessageCount}</span>
          <span className="text-xs text-zinc-400 mt-0.5">by you</span>
        </div>
        <div className="flex flex-col items-center py-3 rounded-lg bg-white border border-zinc-100">
          <span className="text-xl font-semibold text-zinc-900">{disputeCount}</span>
          <span className="text-xs text-zinc-400 mt-0.5">disputes</span>
        </div>
      </div>
    </div>
  )
}
