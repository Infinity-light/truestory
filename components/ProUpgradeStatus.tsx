'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ProStatus } from '@/types/meeting'

interface ProUpgradeStatusProps {
  roomCode: string
  initialStatus: ProStatus
  arweaveTxId: string | null
}

const STAGE_LABELS: Record<string, string> = {
  encrypting: '正在加密会议记录...',
  uploading: '正在上传到 Arweave...',
  registering: '正在注册 Lit ACC...',
  minting: '正在 mint 参会凭证 NFT...',
}

export function ProUpgradeStatus({ roomCode, initialStatus, arweaveTxId }: ProUpgradeStatusProps) {
  const [status, setStatus] = useState<ProStatus>(initialStatus)
  const [stage, setStage] = useState<string>('encrypting')
  const [arweave, setArweave] = useState<string | null>(arweaveTxId)
  const [error, setError] = useState<string | null>(null)
  const [placeholderMode, setPlaceholderMode] = useState(false)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const channel = supabase
      .channel(`meeting:${roomCode}`)
      .on('broadcast', { event: 'pro_upgrade_progress' }, (msg) => {
        setStage((msg.payload as { stage?: string })?.stage ?? 'encrypting')
      })
      .on('broadcast', { event: 'pro_upgrade_finalized' }, (msg) => {
        const payload = msg.payload as {
          arweaveTxId: string
          placeholderMode: boolean
        }
        setStatus('finalized')
        setArweave(payload.arweaveTxId)
        setPlaceholderMode(Boolean(payload.placeholderMode))
      })
      .on('broadcast', { event: 'pro_upgrade_failed' }, (msg) => {
        const payload = msg.payload as { error?: string }
        setStatus('refunded')
        setError(payload?.error ?? 'unknown error')
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomCode])

  // Auto-kick off upgrade if status is 'paid' (sealed just happened, backend hasn't been triggered yet)
  useEffect(() => {
    if (initialStatus === 'paid' && !started) {
      setStarted(true)
      fetch(`/api/meetings/${roomCode}/pro-upgrade-start`, { method: 'POST' })
        .then((res) => res.json())
        .then((data) => {
          if (data.error && status !== 'finalized') {
            setError(data.error)
          }
        })
        .catch(() => {})
    }
  }, [initialStatus, started, roomCode, status])

  if (status === 'finalized') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-emerald-600 text-lg">✓</span>
          <span className="text-sm font-medium text-emerald-900">Pro 升级完成</span>
        </div>
        {arweave && !placeholderMode && (
          <a
            href={`https://arweave.net/${arweave}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-700 hover:underline break-all font-mono block"
          >
            ar://{arweave}
          </a>
        )}
        {placeholderMode && (
          <p className="text-xs text-amber-700">
            ⚠ 当前 Arweave / Lit Protocol 集成处于 placeholder 模式
            <br />
            等用户提供 AR 钱包和 Lit capacity credit 后自动激活
          </p>
        )}
      </div>
    )
  }

  if (status === 'refunded' || error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-rose-600 text-lg">!</span>
          <span className="text-sm font-medium text-rose-900">Pro 升级失败</span>
        </div>
        {error && <p className="text-xs text-rose-700">{error}</p>}
        <p className="text-xs text-rose-600">已支付的 MON 将自动退回您的钱包</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
        <span className="text-sm font-medium text-amber-900">Pro 升级处理中</span>
      </div>
      <p className="text-xs text-amber-700">
        {STAGE_LABELS[stage] ?? STAGE_LABELS.encrypting}
      </p>
    </div>
  )
}
