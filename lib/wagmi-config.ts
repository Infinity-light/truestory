import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { defineChain } from 'viem'

export const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monadinfra.com'] },
  },
  blockExplorers: {
    default: { name: 'MonadVision', url: 'https://monadvision.com' },
  },
  testnet: true,
})

export const wagmiConfig = getDefaultConfig({
  appName: 'TriSign',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID!,
  chains: [monadTestnet],
  ssr: true,
})
