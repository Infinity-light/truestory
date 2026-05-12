import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  metaMaskWallet,
  rabbyWallet,
  okxWallet,
  phantomWallet,
  coinbaseWallet,
  walletConnectWallet,
  braveWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { createConfig, http } from 'wagmi'
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

const projectId =
  process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'dev-placeholder-set-in-env-local'

// Only wallets that can dynamically add chain 10143 via wallet_addEthereumChain
// or have Monad Testnet preset. Rainbow is intentionally excluded — its mobile
// app rejects the eip155:10143 namespace handshake ("No accounts found in
// approved namespaces").
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Monad-compatible',
      wallets: [
        metaMaskWallet,
        rabbyWallet,
        okxWallet,
        phantomWallet,
        coinbaseWallet,
        walletConnectWallet,
        braveWallet,
      ],
    },
  ],
  { appName: 'trueStory', projectId },
)

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors,
  transports: { [monadTestnet.id]: http() },
  ssr: true,
})
