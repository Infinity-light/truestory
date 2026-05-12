# trueStory

> **三方共识会议记录，链上签字，不可篡改。**
> 曾用名 **TriSign**——链上合约至今仍以这个名字部署。

**简体中文** · [English](./README.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![Monad Testnet](https://img.shields.io/badge/Monad-Testnet%2010143-7E5BEF)](https://testnet.monadexplorer.com)
[![Solidity 0.8.24](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity)](https://docs.soliditylang.org)

---

## 这是什么

三个远程参与者各自打开浏览器，对着自己的麦克风讲话，看着每个人——自己的、其他两个人的——每一句话被实时转成文字，汇成一条像聊天界面那样滚动的瀑布流。会议结束后，每人独立审阅这份记录，修正自己被语音识别转错的字，对别人的某条发言标注"我不同意"，然后在自己的钱包里签一次字，确认"这就是我说过的话，我对此负责"。三个钱包签名相继落在 Monad Testnet 上，记录被永久封存，从那一刻起，任何人只要拿到这份 JSON 文件和那笔交易哈希，都能在链上验证它没被改过一个字。

这个项目存在的理由，可以用一个简单的设想说清楚：想象三年后某个早期合伙人之间的争执——"这个百亿想法当年到底是谁先提出来的？"今天没有任何中立的记录。trueStory 制造这样的记录：在那次对话发生的当下，由三方自愿共同生成、三方签字、三方共同认账，之后任何人都改不动。

## 在线体验

- **应用**：已部署到 Vercel（最新 URL 见 GitHub 仓库的 Deployments 面板）
- **合约**：[`0x89c3c56f0518c5aAA9E9Dd089f7eA725e1833EfD`](https://testnet.monadexplorer.com/address/0x89c3c56f0518c5aAA9E9Dd089f7eA725e1833EfD)，部署在 Monad Testnet（chain id `10143`）

需要准备：

- 一个兼容 Monad 的 EVM 钱包：MetaMask、Rabby、OKX、Phantom、Coinbase Wallet、Brave Wallet 或任何走 WalletConnect 的钱包都可以。应用刻意把 Rainbow 钱包从列表中拿掉了——它的移动端 namespace 握手会拒绝 `eip155:10143`。
- 少量 Monad Testnet 测试币（MON）用于 gas——三人各自付自己签名那一笔的 gas。

## 一次会议怎么走

```
┌────────────┐   ┌────────────┐   ┌────────────┐
│  主持人 H  │   │  参与者 P1 │   │  参与者 P2 │
└─────┬──────┘   └─────┬──────┘   └─────┬──────┘
      │ 创建会议       │ 用会议号加入   │ 用会议号加入
      ▼                ▼                ▼
            ┌────────────────────┐
            │   /meeting/[code]  │   ← 候机：三人钱包都已连接，
            │       /lobby       │     每人各签一次"准备开始"
            └─────────┬──────────┘
                      ▼
            ┌────────────────────┐
            │     /recording     │   ← 各人浏览器各自采集麦克风音频，
            │   实时 STT 转写    │     DashScope 通过 WebSocket 把文字回传，
            │   文字瀑布流       │     Supabase Realtime 广播给三方
            └─────────┬──────────┘
                      ▼
            ┌────────────────────┐
            │       /sign        │   ← 审阅最终文本，改自己被识别错的字，
            │  修改 / 异议 /     │     对别人的发言标异议，
            │  共识签名          │     然后对 root 做 ECDSA 签名
            └─────────┬──────────┘
                      ▼
            ┌────────────────────┐
            │       /done        │   ← 第三个 submitConsensusSignature 落账后，
            │   已上链封存       │     MeetingSealed 事件触发，显示交易哈希
            └────────────────────┘
```

完整的用户动线在 [`.workflow/discovery/trisign-20260512-1150-PRD.md`](./.workflow/discovery/trisign-20260512-1150-PRD.md) 里有详细描述。

## 技术栈

| 层级           | 选型                                                                   |
|----------------|------------------------------------------------------------------------|
| 前端           | Next.js 16（App Router，React 19）· Tailwind v4 · Zustand              |
| 钱包           | wagmi v2 + RainbowKit（基于 Reown / WalletConnect）                    |
| 实时后端       | Supabase（Postgres + Realtime 通道，负责消息广播和状态同步）           |
| 语音识别       | 阿里云 DashScope `qwen3-asr-flash-realtime`，WebSocket 流式            |
| 智能合约       | Solidity 0.8.24 + Foundry，部署在 Monad Testnet（chain id 10143）      |
| 部署           | Vercel（Edge 友好，但 STT 代理目前跑在 Node runtime）                  |

几个值得提前讲清楚的设计选择：

- **音视频从不在参与者之间传输。** 每个浏览器各自把自己的音频送到 DashScope，三方靠文字流相互"听见"彼此。这样带宽预算很小，隐私故事也更老实。
- **三人各自发起自己那笔签名交易。** 没有 relayer、没有 meta-tx、没有任何人替别人付费。合约强制三人 root 一致才允许 seal。
- **修改和异议是一等公民。** 原始 STT 文本在任何修改之前就被 hash 一次，编辑后的终版文本再 hash 一次。两份 hash 都进入链上 root，所以"最初讲了什么"和"我们最终共同认账的是什么"都被保留。
- **合约名字刻意没改成 trueStory。** 链上至今仍叫 `TriSign`——重命名意味着重新部署，那样会破坏所有已有会议记录的可验证性。UI、package、产品名都迁到了 trueStory，但合约没动。

## 仓库结构

```
.
├── app/                       # Next.js App Router
│   ├── page.tsx               # 首页——连钱包、新建/加入会议
│   ├── meeting/
│   │   ├── new/               # 主持人创建会议（拿到 6 位会议号）
│   │   ├── join/              # 参与者输入会议号
│   │   └── [code]/
│   │       ├── lobby/         # 三人钱包候机区，签"开始"门槛
│   │       ├── recording/     # 实时 STT 瀑布流 + 结束会议按钮
│   │       ├── sign/          # 审阅、修改、标异议、共识签名
│   │       └── done/          # 已封存：交易哈希 + 下载记录 JSON
│   └── api/
│       ├── meetings/          # CRUD + 加入 + 开始签名 + 结束签名 + 上链 + 摘要
│       ├── messages/          # 追加 STT 消息，计算 original hash
│       └── stt/token/         # 给浏览器签发短期 DashScope token
├── components/                # 13 个组件——消息气泡、状态网格、签名按钮等
├── lib/
│   ├── audio-recorder.ts      # MediaRecorder 封装，按 DashScope 要求做 PCM 分帧
│   ├── stt-client.ts          # 对接 qwen3-asr-flash-realtime 的 WebSocket 客户端
│   ├── contract-abi.ts        # TriSign 合约的强类型 ABI
│   ├── contract-write.ts      # 基于 wagmi 的 submitConsensusSignature 调用
│   ├── hash.ts                # 标准化的消息 hash 和 root 计算
│   ├── supabase.ts            # 浏览器端 Supabase 客户端（只持 anon key）
│   ├── supabase-server.ts     # 服务端 only 客户端（service role）——绝不打进浏览器 bundle
│   └── wagmi-config.ts        # Monad Testnet chain 定义 + 经过筛选的钱包列表
├── store/meeting-store.ts     # 会议内客户端状态的 Zustand store
├── types/meeting.ts           # 跨前后端共享的 TypeScript 类型（Meeting / Participant / Message）
├── supabase/migrations/
│   └── 0001_init.sql          # meetings、participants、messages、disputes 四张表
├── contracts/                 # Foundry 项目
│   ├── src/TriSign.sol        # 共识签名合约
│   ├── script/Deploy.s.sol    # 部署到 Monad Testnet 的 forge script
│   └── test/TriSign.t.sol     # 单元测试
└── .workflow/
    ├── discovery/             # PRD
    └── planning/              # 原子任务规划
```

## 数据库 schema

四张表，全由 `supabase/migrations/0001_init.sql` 建好：

- **`meetings`**——每场会议一行。记录 `room_code`（6 位数字，唯一）、`host_address`、`status`（`waiting` → `starting` → `recording` → `reviewing` → `signing` → `sealed`）、`expires_at`（创建后 30 分钟过期），以及最终的 `on_chain_tx_hash`。
- **`participants`**——复合主键 `(meeting_id, wallet_address)`。记录每人的角色（`host` / `participant`）、开始签名、结束签名，以及 `review_completed` 标记。
- **`messages`**——所有 STT 产生的发言。同时持有 `original_text` / `original_hash`（STT 直出）和 `final_text` / `final_hash`（发言人编辑后的终版）。`is_disputed` 在被别人标异议时为 true。
- **`disputes`**——复合主键 `(message_id, disputer_address)`。一条异议一行，所以同一条消息可以被多个人各自标异议。

每条消息持有的这一对 hash 是防篡改故事的核心——它们最终都会进入链上的 `finalMessagesRoot` 和 `disputesRoot`。

## API 路由

全部在 `app/api/` 下：

| 路由                                        | 用途                                                              |
|---------------------------------------------|-------------------------------------------------------------------|
| `POST   /api/meetings`                      | 主持人创建会议，返回 `roomCode` 和 `joinUrl`                      |
| `GET    /api/meetings/[code]`               | 取出会议和参与者列表                                              |
| `POST   /api/meetings/[code]/join`          | 参与者凭会议号加入                                                |
| `POST   /api/meetings/[code]/sign-start`    | 提交自己的"准备开始"签名                                          |
| `POST   /api/meetings/[code]/sign-end`      | 提交自己的结束共识签名（链下记录）                                |
| `GET    /api/meetings/[code]/summary`       | 取出用于做 hash 的最终文本 + 异议摘要                              |
| `POST   /api/meetings/[code]/on-chain`      | 第三人封存交易上链后，把交易哈希写回会议记录                       |
| `POST   /api/messages`                      | 追加一条 STT 消息，同时计算 original-text hash                    |
| `GET    /api/stt/token`                     | 给浏览器签发一个短期 DashScope token，用于建立 WebSocket          |

## 智能合约

合约本身刻意做得很小，源码在 [`contracts/src/TriSign.sol`](./contracts/src/TriSign.sol)。每个参与者用自己的钱包调用 `submitConsensusSignature`——gas 各付各的，不存在 relayer：

```solidity
function submitConsensusSignature(
    bytes32 meetingId,
    address[3] calldata participants,
    bytes32 finalMessagesRoot,
    bytes32 disputesRoot,
    bytes calldata signature
) external;
```

链上强制的几条规则：

- 调用方必须是三个声明的 `participants` 之一。
- 三人必须对同一组 `finalMessagesRoot` 和 `disputesRoot` 达成一致——只要有人提交的 root 和先到的不一致，立即 revert `RootMismatch`。
- 会议被封存后永远不能重签（`AlreadySealed`）。
- 每个人的 ECDSA 签名会被合约用 `keccak256("TriSign End: " ‖ meetingId ‖ finalMessagesRoot ‖ disputesRoot)` 加上以太坊标准签名前缀做恢复验证，恢复出的地址必须等于 `msg.sender`。

第三个有效签名落账时，`MeetingSealed` 事件触发，会议永久不可变。

事后第三方做独立验证用：

```solidity
function verifyMeeting(bytes32 meetingId, bytes32 candidateRoot)
    external view
    returns (bool isValid, address[3] memory signers, bool isSealed);
```

## 本地起步

### 前置条件

- Node.js 20+
- pnpm 9+
- 一个 Supabase 项目（免费版够用）
- 一个 WalletConnect / Reown project id（免费）——[cloud.walletconnect.com](https://cloud.walletconnect.com)
- 一个能调用 `qwen3-asr-flash-realtime` 的 DashScope API key——[dashscope.aliyun.com](https://dashscope.aliyun.com)
- 仅做合约开发时需要：[Foundry](https://book.getfoundry.sh/) 和一个领过 Monad Testnet 测试币的钱包

### 1. 安装

```bash
git clone git@github.com:Infinity-light/truestory.git
cd truestory
pnpm install
```

### 2. 配置环境变量

把 `.env.example` 复制成 `.env.local`，按下面的样子填：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # 服务端 only，绝不下发到浏览器

# WalletConnect / Reown
NEXT_PUBLIC_WC_PROJECT_ID=<your-wc-project-id>

# 智能合约——已部署在 Monad Testnet
NEXT_PUBLIC_TRISIGN_CONTRACT_ADDRESS=0x89c3c56f0518c5aAA9E9Dd089f7eA725e1833EfD

# DashScope STT
DASHSCOPE_API_KEY=<your-dashscope-key>
```

### 3. 初始化数据库

打开 Supabase 的 SQL Editor，把 [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) 整段粘进去跑一次。然后在 Database → Replication 里把 `messages` 和 `participants` 两张表的 Realtime 开关打开。

### 4. 跑起来

```bash
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000)，把钱包连到 Monad Testnet，就能创建或加入会议。想在一台机器上完整跑通三人流程，开三个浏览器 profile 各连一个独立钱包即可。

## 合约开发

合约项目完全独立在 `contracts/` 下，用 Foundry：

```bash
cd contracts
forge install            # 如果还没装过依赖
forge build
forge test
```

重新部署到 Monad Testnet：

```bash
export MONAD_DEPLOYER_PRIVATE_KEY=0x...
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://testnet-rpc.monad.xyz \
  --broadcast
```

脚本最后一行会打印部署地址。把这个地址填进 `.env.local` 的 `NEXT_PUBLIC_TRISIGN_CONTRACT_ADDRESS` 就完事了——合约不走代理也没有迁移步骤，旧合约里已经签好的会议会留在原地，新会议从新合约开始。

## 部署到 Vercel

应用部署在 Vercel 上。首次部署完成后，需要把上面那八个环境变量都在 Vercel 项目设置里配好。三个 `NEXT_PUBLIC_*` 会进入客户端 bundle；`SUPABASE_SERVICE_ROLE_KEY` 和 `DASHSCOPE_API_KEY` 必须只留在服务端。仓库里已经有 `.vercel/` 目录把项目绑好了，所以从仓库根目录跑 `vercel --prod` 就能部署。

## 这个项目不做什么

下面这个清单是刻意写的——它是这个项目能在一天黑客松里成型、又不至于讲假话的边界：

- **参与者之间不传音视频。** 三人靠文字流相互"看见"。
- **不做生物特征签名。** WebAuthn、Face ID、指纹全不做。钱包是唯一的身份。
- **消息一旦产生不允许删除。** STT 抓到的句子留下来。你只能改自己的字（原版会留作可验证），或者对别人的话标异议。
- **不能编辑别人的话。** 对别人发言唯一的反应就是异议。
- **会议固定三人，不多不少。** 第四个浏览器尝试加入会被拒绝，提示"会议已满"。
- **没有"被篡改演示"的现场交互。** 验证页确实能识破篡改，但黑客松现场只走正向路径。

## 项目文档

- **PRD**：[`.workflow/discovery/trisign-20260512-1150-PRD.md`](./.workflow/discovery/trisign-20260512-1150-PRD.md)——这是"产品做什么、为什么这样做"的唯一真源
- **项目规划**：[`.workflow/planning/trisign-20260512-1208-项目规划.md`](./.workflow/planning/trisign-20260512-1208-%E9%A1%B9%E7%9B%AE%E8%A7%84%E5%88%92.md)——黑客松期间执行的原子任务清单

## 协议

[MIT](./LICENSE) © 2026 TriSign Hackathon Team
