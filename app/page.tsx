'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n/provider'
import { LangSwitch } from '@/components/LangSwitch'

export default function HomePage() {
  const router = useRouter()
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
        <span className="text-sm font-semibold tracking-tight text-zinc-900">trueStory</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/my-meetings')}
            className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            {t('header.myMeetings')}
          </button>
          <button
            onClick={() => router.push('/membership')}
            className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            {t('header.proMembership')}
          </button>
          <LangSwitch />
          <ConnectButton />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              {t('home.title')}
            </h1>
            <p className="text-sm text-zinc-500 leading-relaxed">
              {t('home.subtitle')}
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
                    {t('home.newMeeting')}
                  </button>

                  <button
                    onClick={() => handleAction('/meeting/join')}
                    className="w-full h-11 rounded-lg border border-zinc-200 bg-white text-zinc-900 text-sm font-medium
                               transition-colors hover:bg-zinc-50"
                  >
                    {t('home.joinMeeting')}
                  </button>

                  {!connected && (
                    <p className="text-center text-xs text-zinc-400">
                      {t('home.connectHint')}
                    </p>
                  )}

                  {wrongNetwork && (
                    <p className="text-center text-xs text-amber-600">
                      {t('home.wrongNetwork')}
                    </p>
                  )}
                </div>
              )
            }}
          </ConnectButton.Custom>
        </div>
      </main>

      <footer className="px-6 py-4 text-center text-xs text-zinc-400">
        trueStory · {t('home.footerContract')}:{' '}
        <a
          href="https://testnet.monadexplorer.com/address/0x38fBBF4a7fC309cD4b37F3eD055a16535f6193E2"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono hover:text-zinc-600"
        >
          0x38fBBF…6193E2
        </a>
        {' · '}Monad Testnet
      </footer>
    </div>
  )
}
