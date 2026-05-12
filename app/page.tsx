'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const { isConnected } = useAccount()
  const router = useRouter()

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
        <span className="text-sm font-semibold tracking-tight text-zinc-900">TriSign</span>
        <ConnectButton />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Three-party consensus
            </h1>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Record meetings with tamper-proof signatures.<br />
              Every word, every dispute, on-chain.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/meeting/new')}
              disabled={!isConnected}
              className="w-full h-11 rounded-lg bg-zinc-900 text-white text-sm font-medium
                         transition-colors hover:bg-zinc-700
                         disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed"
            >
              New meeting
            </button>

            <button
              onClick={() => router.push('/meeting/join')}
              disabled={!isConnected}
              className="w-full h-11 rounded-lg border border-zinc-200 bg-white text-zinc-900 text-sm font-medium
                         transition-colors hover:bg-zinc-50
                         disabled:border-zinc-100 disabled:text-zinc-300 disabled:cursor-not-allowed"
            >
              Join meeting
            </button>
          </div>

          {!isConnected && (
            <p className="text-center text-xs text-zinc-400">
              Connect your wallet to continue
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
