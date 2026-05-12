import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { defineChain } from 'viem'

export const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'MonadExplorer', url: 'https://testnet.monadexplorer.com' },
  },
  testnet: true,
})

// Fallback prevents SSR crash when .env.local is not yet configured (Wave 0 dev).
// Replace with a real WalletConnect projectId from cloud.walletconnect.com before deploying.
export const wagmiConfig = getDefaultConfig({
  appName: 'trueStory',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'dev-placeholder-set-in-env-local',
  chains: [monadTestnet],
  ssr: true,
})
