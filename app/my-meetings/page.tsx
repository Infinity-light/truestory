'use client'

import { useRouter } from 'next/navigation'
import { useAccount, useReadContract } from 'wagmi'
import { ATTESTATION_NFT_ADDRESS, attestationNftAbi } from '@/lib/contracts'

export default function MyMeetingsPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()

  const { data: balance } = useReadContract({
    address: ATTESTATION_NFT_ADDRESS,
    abi: attestationNftAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-zinc-400">Connect your wallet to continue</p>
      </div>
    )
  }

  const nftCount = balance ? Number(balance as bigint) : 0

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
          我参与过的会议
        </span>
        <div className="w-10" />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
              我的 Pro 会议
            </h1>
            <p className="text-sm text-zinc-500 leading-relaxed">
              你钱包里持有 {nftCount} 张参会凭证 NFT。
            </p>
          </div>

          {nftCount === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center space-y-2">
              <p className="text-sm text-zinc-700">还没有参与过 Pro 会议</p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                创建会议时勾选 Pro 模式、或加入别人创建的 Pro 会议，结束后会自动收到一张参会凭证
                NFT。
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 leading-relaxed">
              <p className="font-medium mb-2">⚠ Pro 解密链路 placeholder</p>
              <p>
                你的钱包持有 {nftCount} 张参会凭证 NFT，每张对应一场参与过的 Pro 会议。
                完整解密链路（Lit Protocol + Arweave 下载）目前处于 placeholder 模式——
                等用户提供 Lit capacity credit 和 Arweave wallet 后激活，届时此页面会枚举每张
                NFT 并展示「点击解密查看」按钮。
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
