'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
        <span className="text-sm font-semibold tracking-tight text-zinc-900">trueStory</span>
        <ConnectButton />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              三方共识 · Three-party consensus
            </h1>
            <p className="text-sm text-zinc-500 leading-relaxed">
              用区块链签名记录会议，每句话、每条异议都上链不可篡改。<br />
              Tamper-proof meeting records — every word, every dispute, on-chain.
            </p>
          </div>

          <ConnectButton.Custom>
            {({ account, chain, openConnectModal, openChainModal, mounted }) => {
              const ready = mounted
              const connected = ready && account && chain
              const wrongNetwork = connected && chain.unsupported

              function handleAction(target: '/meeting/new' | '/meeting/join') {
                if (!connected) {
                  openConnectModal()
                  return
                }
                if (wrongNetwork) {
                  openChainModal()
                  return
                }
                router.push(target)
              }

              return (
                <div
                  className="space-y-3"
                  style={{ opacity: ready ? 1 : 0, pointerEvents: ready ? 'auto' : 'none' }}
                  aria-hidden={!ready}
                >
                  <button
                    onClick={() => handleAction('/meeting/new')}
                    className="w-full h-11 rounded-lg bg-zinc-900 text-white text-sm font-medium
                               transition-colors hover:bg-zinc-700"
                  >
                    新建会议 · New meeting
                  </button>

                  <button
                    onClick={() => handleAction('/meeting/join')}
                    className="w-full h-11 rounded-lg border border-zinc-200 bg-white text-zinc-900 text-sm font-medium
                               transition-colors hover:bg-zinc-50"
                  >
                    加入会议 · Join meeting
                  </button>

                  {!connected && (
                    <p className="text-center text-xs text-zinc-400">
                      点击按钮自动唤起钱包连接 · Click any button to connect wallet
                    </p>
                  )}

                  {wrongNetwork && (
                    <p className="text-center text-xs text-amber-600">
                      请切换到 Monad Testnet · Please switch to Monad Testnet
                    </p>
                  )}
                </div>
              )
            }}
          </ConnectButton.Custom>
        </div>
      </main>

      <footer className="px-6 py-4 text-center text-xs text-zinc-400">
        trueStory · 合约 Contract:{' '}
        <a
          href="https://testnet.monadexplorer.com/address/0x89c3c56f0518c5aAA9E9Dd089f7eA725e1833EfD"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono hover:text-zinc-600"
        >
          0x89c3c5…1833EfD
        </a>
        {' · '}Monad Testnet
      </footer>
    </div>
  )
}
