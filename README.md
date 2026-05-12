# TriSign

Three-party consensus meeting records on Monad — hackathon project.

Three remote participants open their browsers, talk into their own mics, and watch each other's STT-transcribed words flow into a shared chat-style waterfall. After the meeting, each person reviews the full transcript: correcting their own mistranscribed lines, flagging others' statements they disagree with. Three wallet signatures later, the meeting record is sealed on Monad testnet — final message hashes + disputes mapping immutably attested. Anyone with the JSON file + tx hash can later verify nothing has been tampered with.

Built in one day for the Monad hackathon. Stack: Next.js 14 + Tailwind + shadcn/ui · wagmi + RainbowKit · Supabase (Postgres + Realtime) · Alibaba Cloud DashScope STT (Qwen3-ASR-Flash-Realtime) · Foundry (Solidity 0.8.24) · Vercel.

## Quick links

- PRD: `.workflow/discovery/trisign-20260512-1150-PRD.md`
- Project plan: `.workflow/planning/trisign-20260512-1208-项目规划.md`

## Local dev

```bash
pnpm install
cp .env.example .env.local  # fill in DASHSCOPE_API_KEY, SUPABASE_*, NEXT_PUBLIC_WC_PROJECT_ID
pnpm dev
```

Smart contract dev:

```bash
cd contracts
forge install
forge build
forge test -vv
```
