'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { toast } from 'sonner'
import {
  useProMembershipActive,
  usePurchaseMembership,
} from '@/lib/contract-write'
import { useReadContract } from 'wagmi'
import {
  PRO_MEMBERSHIP_ADDRESS,
  proMembershipAbi,
} from '@/lib/contracts'

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function MembershipPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { data: isActive, refetch: refetchActive } = useProMembershipActive(address)

  const { data: membership } = useReadContract({
    address: PRO_MEMBERSHIP_ADDRESS,
    abi: proMembershipAbi,
    functionName: 'getMembership',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const {
    purchase,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  } = usePurchaseMembership()

  useEffect(() => {
    if (isSuccess) {
      toast.success('月卡购买成功')
      refetchActive()
    }
  }, [isSuccess, refetchActive])

  useEffect(() => {
    if (error) {
      const msg = (error.message ?? '').toLowerCase()
      if (!msg.includes('rejected')) {
        toast.error('购买失败：' + (error.message ?? ''))
      }
    }
  }, [error])

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-zinc-400">Connect your wallet to continue</p>
      </div>
    )
  }

  const m = membership as { startAt: bigint; endAt: bigint; holder: string } | undefined
  const endAtNum = m?.endAt ? Number(m.endAt) : 0
  const active = Boolean(isActive)

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
        <button
          onClick={() => router.push('/')}
          className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          Back
        </button>
        <span className="text-sm font-semibold tracking-tight text-zinc-900">
          trueStory Pro
        </span>
        <div className="w-10" />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
              Pro 月卡
            </h1>
            <p className="text-sm text-zinc-500 leading-relaxed">
              持有月卡期间，所有创建的会议默认走 Pro 路径——永久加密存证到 Arweave、Lit
              Protocol 解密、参会凭证 NFT，全部自动覆盖。
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-semibold text-zinc-900">5 MON</span>
              <span className="text-xs text-zinc-500">/ 30 天</span>
            </div>
            <ul className="space-y-1.5 text-xs text-zinc-600 leading-relaxed">
              <li>· 月卡期内创建的 Pro 会议零额外付费</li>
              <li>· soulbound NFT，不可转让</li>
              <li>· 到期自动失效，可续费购买新月卡</li>
            </ul>
          </div>

          {active && endAtNum > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-medium text-emerald-900">月卡有效中</p>
              <p className="text-xs text-emerald-700 mt-1">
                到期时间：{formatDate(endAtNum)}
              </p>
            </div>
          )}

          <button
            onClick={purchase}
            disabled={isPending || isConfirming}
            className="w-full h-11 rounded-lg bg-zinc-900 text-white text-sm font-medium
                       transition-colors hover:bg-zinc-700
                       disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed"
          >
            {isPending
              ? '请在钱包中确认...'
              : isConfirming
              ? '等待链上确认...'
              : active
              ? '续费一个月（叠加 30 天）'
              : '购买月卡 · 5 MON'}
          </button>

          {hash && (
            <p className="text-center text-[10px] text-zinc-400 break-all font-mono">
              {hash}
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
