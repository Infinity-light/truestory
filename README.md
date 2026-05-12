# trueStory

三方共识会议记录，链上签字防篡改。Three-party consensus meeting records, signed on-chain, tamper-proof.

三个远程参与者各自打开浏览器，对着自己的麦克风讲话，看着对方的话被实时 STT 转写成文字流。会议结束后，每人在自己的钱包中签字确认这就是说过的话。三个钱包签名上链 Monad Testnet 后，任何人未来都能链上验证这份会议纪要没有被改过——每个字、每条异议都不可篡改。

Three remote participants each open their browser, speak into their own mic, and watch each other's words flow into a shared chat-style real-time transcription stream. After the meeting, each person signs in their wallet to confirm "this is what I said". Three wallet signatures hit Monad Testnet, and anyone with the JSON record + tx hash can later verify on-chain that no word was tampered with.

## Tech Stack 技术栈

- **Frontend**: Next.js 16 (App Router) · Tailwind v4 · shadcn/ui
- **Wallet**: wagmi v2 + RainbowKit (Reown WalletConnect)
- **Backend**: Supabase (Postgres + Realtime)
- **STT**: Alibaba Cloud DashScope Realtime ASR (qwen3-asr-flash-realtime via WebSocket)
- **Smart Contract**: Solidity 0.8.24 deployed on Monad Testnet (chain id 10143)
- **Deployment**: Vercel

## Contract 合约

Monad Testnet (chain id 10143): [`0x89c3c56f0518c5aAA9E9Dd089f7eA725e1833EfD`](https://monadvision.com/address/0x89c3c56f0518c5aAA9E9Dd089f7eA725e1833EfD)

## Project Docs 项目文档

- PRD: `.workflow/discovery/trisign-20260512-1150-PRD.md`
- Project plan: `.workflow/planning/trisign-20260512-1208-项目规划.md`
