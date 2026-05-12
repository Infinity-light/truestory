# trueStory

> **Three-party consensus meeting records, signed on-chain, tamper-proof.**
> Formerly known as **TriSign** — the on-chain contract still carries that name.

[简体中文](./README.zh-CN.md) · **English**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![Monad Testnet](https://img.shields.io/badge/Monad-Testnet%2010143-7E5BEF)](https://testnet.monadexplorer.com)
[![Solidity 0.8.24](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity)](https://docs.soliditylang.org)

---

## What is this?

Three remote participants open their browser, each speak into their own microphone, and watch every word — their own and the other two — flow into a shared, chat-style real-time transcription stream. When the meeting ends, each person reviews the record, fixes their own STT mistakes, optionally flags disagreement on what someone else said, and then signs in their wallet to confirm "this is what I said, I stand behind it." Three wallet signatures hit Monad Testnet, the record is sealed, and from that point on anyone holding the JSON file and the transaction hash can verify on-chain that no word has been altered.

The reason the project exists is a simple thought experiment: imagine a startup co-founder argument three years from now over "who actually first proposed this billion-dollar idea." Today there is no neutral record. trueStory makes that record — voluntarily produced by all three sides at the moment of the conversation, signed by all three sides, and immutable.

## Live demo

- **App**: deployed to Vercel (see the GitHub repo's "Deployments" panel for the latest URL)
- **Contract**: [`0x89c3c56f0518c5aAA9E9Dd089f7eA725e1833EfD`](https://testnet.monadexplorer.com/address/0x89c3c56f0518c5aAA9E9Dd089f7eA725e1833EfD) on Monad Testnet (chain id `10143`)

You will need:

- Any Monad-compatible EVM wallet (MetaMask, Rabby, OKX, Phantom, Coinbase Wallet, Brave Wallet, or anything that speaks WalletConnect). The app intentionally drops Rainbow Wallet because its mobile namespace handshake rejects `eip155:10143`.
- A small amount of MON on Monad Testnet for gas — each of the three participants pays their own signature gas.

## How it works

```
┌────────────┐   ┌────────────┐   ┌────────────┐
│  Host (H)  │   │ Guest (P1) │   │ Guest (P2) │
└─────┬──────┘   └─────┬──────┘   └─────┬──────┘
      │ create room    │ join via code  │ join via code
      ▼                ▼                ▼
            ┌────────────────────┐
            │   /meeting/[code]  │   ← lobby: three wallets connected,
            │       /lobby       │     each signs "ready to start"
            └─────────┬──────────┘
                      ▼
            ┌────────────────────┐
            │     /recording     │   ← each browser captures its own mic,
            │   real-time STT    │     DashScope streams text back via WS,
            │  waterfall stream  │     Supabase Realtime fans it out
            └─────────┬──────────┘
                      ▼
            ┌────────────────────┐
            │       /sign        │   ← review final text, fix your own STT,
            │  edit / dispute /  │     dispute the other side's lines,
            │  consensus sign    │     then ECDSA-sign the merkle-style roots
            └─────────┬──────────┘
                      ▼
            ┌────────────────────┐
            │       /done        │   ← when the third submitConsensusSignature
            │  sealed on-chain   │     lands, MeetingSealed fires, tx hash shown
            └────────────────────┘
```

The user-facing flow is described in detail in [`.workflow/discovery/trisign-20260512-1150-PRD.md`](./.workflow/discovery/trisign-20260512-1150-PRD.md).

## Tech stack

| Layer            | Choice                                                                 |
|------------------|------------------------------------------------------------------------|
| Frontend         | Next.js 16 (App Router, React 19) · Tailwind v4 · Zustand              |
| Wallet           | wagmi v2 + RainbowKit (Reown WalletConnect)                            |
| Realtime backend | Supabase (Postgres + Realtime channels for message + status sync)       |
| Speech-to-text   | Alibaba Cloud DashScope `qwen3-asr-flash-realtime` over WebSocket      |
| Smart contract   | Solidity 0.8.24, Foundry, deployed on Monad Testnet (chain id 10143)   |
| Hosting          | Vercel (Edge-friendly, but the STT proxy currently runs on the Node runtime) |

A few design choices worth flagging up front:

- **No audio is ever transmitted between participants.** Each browser sends its own audio to DashScope and the three sides "hear" each other only through the text stream. This keeps the bandwidth budget small and the privacy story honest.
- **Each of the three participants submits their own signature transaction.** There is no relayer, no meta-tx, no one paying for everyone. The contract enforces that all three roots agree before sealing.
- **Edits and disputes are first-class.** The original STT output is hashed before any edit, and the final edited text is hashed after. Both hashes live on-chain inside the sealed root, so "what was first said" and "what we all agreed on" are both preserved.
- **The contract is intentionally not named "trueStory".** It is still `TriSign` on-chain because rebranding it would mean redeploying and breaking every existing recorded meeting. The UI, package, and product name moved to "trueStory"; the contract did not.

## Repository layout

```
.
├── app/                       # Next.js App Router
│   ├── page.tsx               # Landing — connect wallet, new / join meeting
│   ├── meeting/
│   │   ├── new/               # Host creates a meeting (gets 6-digit room code)
│   │   ├── join/              # Guest enters room code
│   │   └── [code]/
│   │       ├── lobby/         # Three-wallet pre-flight, sign-start gate
│   │       ├── recording/     # Live STT waterfall, end-meeting button
│   │       ├── sign/          # Review, edit, dispute, consensus-sign
│   │       └── done/          # Sealed: tx hash + download JSON record
│   └── api/
│       ├── meetings/          # CRUD + join + sign-start + sign-end + on-chain + summary
│       ├── messages/          # Append STT message, compute original hash
│       └── stt/token/         # Short-lived DashScope token for the browser
├── components/                # 13 components — message bubble, status grids, etc.
├── lib/
│   ├── audio-recorder.ts      # MediaRecorder wrapper, PCM framing for DashScope
│   ├── stt-client.ts          # WebSocket client for qwen3-asr-flash-realtime
│   ├── contract-abi.ts        # Typed ABI for the TriSign contract
│   ├── contract-write.ts      # submitConsensusSignature helper via wagmi
│   ├── hash.ts                # Canonical message + roots hashing
│   ├── supabase.ts            # Browser-side Supabase client (anon key only)
│   ├── supabase-server.ts     # Server-only client (service role) — never bundled to browser
│   └── wagmi-config.ts        # Monad Testnet chain definition + curated wallet list
├── store/meeting-store.ts     # Zustand store for in-meeting client state
├── types/meeting.ts           # Shared TypeScript types (Meeting / Participant / Message)
├── supabase/migrations/
│   └── 0001_init.sql          # meetings, participants, messages, disputes
├── contracts/                 # Foundry project
│   ├── src/TriSign.sol        # The consensus-signature contract
│   ├── script/Deploy.s.sol    # forge script for Monad Testnet deployment
│   └── test/TriSign.t.sol     # Unit tests
└── .workflow/
    ├── discovery/             # PRD
    └── planning/              # Atomic task plan
```

## Database schema

Four tables, all created by `supabase/migrations/0001_init.sql`:

- **`meetings`** — one row per meeting. Tracks `room_code` (6 digits, unique), `host_address`, `status` (`waiting` → `starting` → `recording` → `reviewing` → `signing` → `sealed`), `expires_at` (30 min from creation), and the eventual `on_chain_tx_hash`.
- **`participants`** — composite key `(meeting_id, wallet_address)`. Records each person's role (`host` / `participant`), their start-signature, end-signature, and a `review_completed` flag.
- **`messages`** — every STT-produced utterance. Carries both `original_text` / `original_hash` (what STT produced) and `final_text` / `final_hash` (what the speaker confirmed after editing). `is_disputed` is true when another participant flagged it.
- **`disputes`** — composite key `(message_id, disputer_address)`. One row per dispute, so the same message can be disputed by multiple peers.

The pair of hashes per message is the heart of the tamper-evidence story — both end up under `finalMessagesRoot` and `disputesRoot` on-chain.

## API surface

All routes live under `app/api/`:

| Route                                       | Purpose                                                              |
|---------------------------------------------|----------------------------------------------------------------------|
| `POST   /api/meetings`                      | Host creates a new meeting, gets `roomCode` and `joinUrl`            |
| `GET    /api/meetings/[code]`               | Fetch meeting + participant list                                     |
| `POST   /api/meetings/[code]/join`          | Guest joins by room code                                             |
| `POST   /api/meetings/[code]/sign-start`    | Submit your "ready to start" signature                               |
| `POST   /api/meetings/[code]/sign-end`      | Submit your end-of-meeting consensus signature (off-chain record)    |
| `GET    /api/meetings/[code]/summary`       | Get the final-text + disputes summary used for hashing               |
| `POST   /api/meetings/[code]/on-chain`      | Record the on-chain tx hash once the third signature has been sealed |
| `POST   /api/messages`                      | Append a new STT message + compute the original-text hash            |
| `GET    /api/stt/token`                     | Mint a short-lived DashScope token for the browser WebSocket         |

## Smart contract

The contract is intentionally small and lives in [`contracts/src/TriSign.sol`](./contracts/src/TriSign.sol). Each participant calls `submitConsensusSignature` with their own wallet — gas is paid per signer, not by a relayer:

```solidity
function submitConsensusSignature(
    bytes32 meetingId,
    address[3] calldata participants,
    bytes32 finalMessagesRoot,
    bytes32 disputesRoot,
    bytes calldata signature
) external;
```

Rules enforced on-chain:

- Only one of the three declared `participants` can call.
- All three must agree on the same `finalMessagesRoot` and `disputesRoot` — any mismatch reverts with `RootMismatch`.
- A meeting can never be re-signed after being sealed (`AlreadySealed`).
- Each signer's ECDSA signature is recovered against `keccak256("TriSign End: " ‖ meetingId ‖ finalMessagesRoot ‖ disputesRoot)` wrapped with the standard Ethereum signed-message prefix.

When the third valid signature lands, `MeetingSealed` fires and the meeting is permanently immutable.

For independent verification later:

```solidity
function verifyMeeting(bytes32 meetingId, bytes32 candidateRoot)
    external view
    returns (bool isValid, address[3] memory signers, bool isSealed);
```

## Getting started

### Prerequisites

- Node.js 20+
- pnpm 9+
- A Supabase project (free tier is enough)
- A WalletConnect / Reown project id (free) — [cloud.walletconnect.com](https://cloud.walletconnect.com)
- A DashScope API key with access to the `qwen3-asr-flash-realtime` model — [dashscope.aliyun.com](https://dashscope.aliyun.com)
- For contract work only: [Foundry](https://book.getfoundry.sh/) and a Monad Testnet faucet wallet

### 1. Install

```bash
git clone git@github.com:Infinity-light/truestory.git
cd truestory
pnpm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # server-only, never sent to browser

# WalletConnect / Reown
NEXT_PUBLIC_WC_PROJECT_ID=<your-wc-project-id>

# Smart contract — already deployed on Monad Testnet
NEXT_PUBLIC_TRISIGN_CONTRACT_ADDRESS=0x89c3c56f0518c5aAA9E9Dd089f7eA725e1833EfD

# DashScope STT
DASHSCOPE_API_KEY=<your-dashscope-key>
```

### 3. Initialize the database

In the Supabase SQL editor, paste and run [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql). Then enable Realtime on the `messages` and `participants` tables (Database → Replication → toggle on).

### 4. Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), connect a wallet on Monad Testnet, and you can create or join a meeting. To run the full three-party flow on one machine, use three separate browser profiles with three distinct wallets.

## Contract development

The contract project is fully isolated under `contracts/` and uses Foundry:

```bash
cd contracts
forge install            # if you haven't yet
forge build
forge test
```

To redeploy to Monad Testnet:

```bash
export MONAD_DEPLOYER_PRIVATE_KEY=0x...
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://testnet-rpc.monad.xyz \
  --broadcast
```

The deployed address is printed at the end of the script. Update `NEXT_PUBLIC_TRISIGN_CONTRACT_ADDRESS` in `.env.local` and you are done — there is no proxy and no migration step because past meetings live under their old `meetingId` in the old contract anyway.

## Deployment

The app is deployed on Vercel. After the first deploy, all eight environment variables above need to be set in Vercel's project settings (the three `NEXT_PUBLIC_*` ones become part of the client bundle; `SUPABASE_SERVICE_ROLE_KEY` and `DASHSCOPE_API_KEY` must stay server-only). The repository already contains a `.vercel/` directory linking it to the project, so `vercel --prod` from the repo root will deploy.

## What this project does *not* do

This list is deliberate — it is the boundary that lets the project ship as a one-day hackathon MVP without dishonest claims:

- **No audio is sent between participants.** The three sides see each other through text only.
- **No biometric signatures.** WebAuthn, Face ID, fingerprint are all out. The wallet is the only identity.
- **Messages cannot be deleted.** Once a sentence is captured by STT, it stays. You can only edit your own text (with the original kept for verification) or flag disagreement on someone else's.
- **You cannot edit anyone else's words.** Disputes are the only available reaction to what someone else said.
- **Exactly three participants, no more, no less.** A fourth join attempt is rejected with "meeting is full."
- **No "tampered demo" interactive mode.** The verify page proves tamper-detection works, but during the live hackathon demo we only walk the happy path.

## Project documents

- **PRD**: [`.workflow/discovery/trisign-20260512-1150-PRD.md`](./.workflow/discovery/trisign-20260512-1150-PRD.md) — the source of truth for what the product is and why
- **Plan**: [`.workflow/planning/trisign-20260512-1208-项目规划.md`](./.workflow/planning/trisign-20260512-1208-%E9%A1%B9%E7%9B%AE%E8%A7%84%E5%88%92.md) — the atomic-task breakdown executed during the hackathon

## License

[MIT](./LICENSE) © 2026 TriSign Hackathon Team
