'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useAccount } from 'wagmi'
import { TxHashLink } from '@/components/TxHashLink'
import { DownloadRecordButton } from '@/components/DownloadRecordButton'
import { ProUpgradeStatus } from '@/components/ProUpgradeStatus'
import type { Meeting, ProStatus } from '@/types/meeting'

interface SummaryData {
  meeting: { id: string; roomCode: string; onChainTxHash: string | null }
  participants: Array<{ address: string; hasEndSigned: boolean; endSig?: string }>
  messages: unknown[]
  disputes: unknown[]
  finalMessagesRoot: string
  disputesRoot: string
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export default function DonePage() {
  const params = useParams<{ code: string }>()
  const code = params.code
  const searchParams = useSearchParams()
  const txFromQuery = searchParams.get('tx')
  const router = useRouter()
  const { isConnected } = useAccount()

  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [meetingV2, setMeetingV2] = useState<Meeting | null>(null)
  const [showAllTx, setShowAllTx] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchSummary = useCallback(async () => {
    const [summaryRes, fullRes] = await Promise.all([
      fetch(`/api/meetings/${code}/summary`),
      fetch(`/api/meetings/${code}`),
    ])
    if (summaryRes.ok) {
      const data: SummaryData = await summaryRes.json()
      setSummary(data)
    }
    if (fullRes.ok) {
      const data = await fullRes.json()
      setMeetingV2(data.meeting as Meeting)
    }
  }, [code])

  useEffect(() => {
    fetchSummary().finally(() => setLoading(false))
  }, [fetchSummary])

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-zinc-400">Connect your wallet to continue</p>
      </div>
    )
  }

  if (loading || !summary) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-zinc-400">Loading...</p>
      </div>
    )
  }

  const sealTx = txFromQuery ?? summary.meeting.onChainTxHash
  const allParticipantSigs = summary.participants.filter((p) => p.hasEndSigned)

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
        <button
          onClick={() => router.push('/')}
          className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          Home
        </button>
        <span className="font-mono text-sm text-zinc-400">{code}</span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm space-y-6">
          {/* Success indicator */}
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center">
              <svg
                className="h-8 w-8 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-xl font-semibold text-zinc-900">On chain</h1>
              <p className="text-sm text-zinc-400">
                Meeting record permanently recorded on Monad
              </p>
            </div>
          </div>

          {/* Pro upgrade status — Pro 会议才显示 */}
          {meetingV2?.isPro && (
            <ProUpgradeStatus
              roomCode={code}
              initialStatus={meetingV2.proStatus as ProStatus}
              arweaveTxId={meetingV2.arweaveTxId}
            />
          )}

          {/* Meeting details */}
          <div className="w-full rounded-xl border border-zinc-100 bg-zinc-50 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Room</span>
              <span className="font-mono text-sm font-semibold text-zinc-900 tracking-widest">
                {code}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Messages</span>
              <span className="text-sm font-medium text-zinc-900">
                {(summary.messages as unknown[]).length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Participants</span>
              <span className="text-sm font-medium text-zinc-900">
                {summary.participants.length}
              </span>
            </div>
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Signatures</span>
                <button
                  onClick={() => setShowAllTx(!showAllTx)}
                  className="text-[10px] text-zinc-400 hover:text-zinc-700 underline underline-offset-2"
                >
                  {showAllTx ? '收起' : '展开详情'}
                </button>
              </div>
              {showAllTx && (
                <div className="space-y-1">
                  {summary.participants.map((p) => (
                    <div key={p.address} className="flex items-center justify-between">
                      <span className="font-mono text-xs text-zinc-600">
                        {shortAddr(p.address)}
                      </span>
                      <span className="text-xs text-emerald-600 font-medium">Signed</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Primary seal tx — only show the final one that triggered MeetingSealed */}
          {sealTx && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 font-medium">链上盖章 · Seal transaction</p>
              <TxHashLink txHash={sealTx} />
              <p className="text-[10px] text-zinc-400">
                这是触发合约 MeetingSealed 事件的最后一笔交易。完整 N 人签名 tx 列表见下载文件。
              </p>
            </div>
          )}

          {/* Download */}
          <DownloadRecordButton roomCode={code} />
        </div>
      </main>
    </div>
  )
}
