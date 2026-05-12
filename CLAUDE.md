@AGENTS.md

<!-- AI-MAINTAINED:START -->
# trueStory · AI 项目地图

> 由 documentation-update skill 维护。手工改动请放到本区块外。

## 产品定位

trueStory v2 是"任意小组共识"会议存证产品。2-10 人共识，每人钱包签名上链，最终生成可第三方独立验证的取证级记录。双轨制商业模型：免费版走中心化数据库 + 链上指纹公证；付费 Pro 版加 Arweave 永久加密存档 + Lit Protocol 解密 + 参会凭证 NFT。中英双语 UI，根据浏览器语言自动选择。

## 模块布局

```
app/
  layout.tsx                            # 根布局 + I18nProvider + Providers (wagmi/RainbowKit)
  page.tsx                              # 首页 + 钱包连接 + Pro 月卡/我的会议入口 + 语言切换
  membership/page.tsx                   # Pro 月卡购买页（5 MON / 30 天）
  my-meetings/page.tsx                  # 我参与过的 Pro 会议（参会凭证 NFT 枚举）
  meeting/
    new/page.tsx                        # 创建会议（含 Pro 开关 + 单场付费触发）
    join/page.tsx                       # 加入会议（Pro 隐私预期提示）
    [code]/
      lobby/page.tsx                    # 候场 + host 锁定 roster + N 人 start sig
      recording/page.tsx                # 录音 + STT + end-meeting 提议投票 + 说话人色块
      sign/page.tsx                     # 最终签名 + 链上提交
      done/page.tsx                     # 完成页 + Pro 升级状态 + 取证下载
  api/
    cron/auto-advance                   # Vercel cron, 每天 03:00 UTC 检测 host 掉线 2h 自动 reviewing
    messages                            # POST 新消息, GET ?since=<id> 拉补丁
    meetings/
      route.ts                          # POST 创建 (含 Pro 标志)
      [code]/
        route.ts                        # GET 详情, PATCH lock-roster / end-recording
        join                            # POST 加入
        sign-start                      # POST start sig (含 participantsHash)
        sign-end                        # POST final sig, 触发 sealed + code 释放
        on-chain                        # POST 链上 tx hash 回填
        summary                         # GET 会议摘要 (含 finalMessagesRoot)
        propose-end                     # POST 发起 end meeting 提议
        vote-end                        # POST 投票, 达阈自动推进 reviewing
        cancel-end-proposal             # POST 提议者撤回
        forensic-export                 # GET 取证级 JSON 下载
        pro-upgrade-start               # POST 触发 Pro 升级 pipeline (Arweave + Lit + NFT)

components/
  LangSwitch.tsx                        # 中/英 切换按钮
  ProToggle.tsx                         # Pro 开关组件 (含月卡检测 + 单场付费触发)
  ProUpgradeStatus.tsx                  # Done 页 Pro 升级状态卡
  EndMeetingProposalBar.tsx             # 录音页结束提议条 (含投票 UI)
  MessageBubble.tsx                     # 单条消息气泡 (含 speaker 色点 + 着色边)
  MessagesWaterfall.tsx                 # 录音页消息瀑布流
  SubmitChainButton.tsx                 # 链上提交按钮 (dynamic address[])
  StartButton.tsx                       # Lobby start sig 按钮 (含 participantsHash)
  DownloadRecordButton.tsx              # 取证级 JSON 下载 (调 forensic-export API)

contracts/
  src/
    TrueStoryV2.sol                     # 主合约, dynamic address[] (2-10 人)
    TrueStoryProMembership.sol          # 月卡 NFT, soulbound ERC-721 + EIP-5192
    TrueStoryAttestationNFT.sol         # 参会凭证 NFT, soulbound
    TrueStoryProPayment.sol             # Pro 付费 + finalize + refund (原子化)
  script/DeployV2.s.sol                 # 部署脚本

lib/
  contracts.ts                          # 4 个合约地址常量 + ABI 导出
  contract-write.ts                     # wagmi hooks (submit / pay / membership)
  forensic-export.ts                    # 取证级 JSON builder
  pro-upgrade.ts                        # Pro 升级 pipeline (encrypt / arweave / lit / nft, 当前 placeholder)
  supabase-server.ts                    # 服务端 supabase client + row 转换 + 颜色分配
  hash.ts                               # keccak 工具 (message hash / roots)
  i18n/
    messages.ts                         # 翻译表 (zh-CN + en, 约 70 keys)
    provider.tsx                        # I18nProvider + useTranslation hook

scripts/
  run-migration.py                      # 通过 Supabase Management API 跑 SQL 迁移
                                        # 用法: python scripts/run-migration.py <sql文件> <env文件>
                                        # env 文件需含 SUPABASE_ACCESS_TOKEN

supabase/migrations/
  0002_truestory_v2.sql                 # v2 schema (已应用到生产)
```

## 链上地址 (Monad Testnet, chain 10143)

| 合约 | 地址 |
|------|------|
| TrueStoryV2 | `0x38fBBF4a7fC309cD4b37F3eD055a16535f6193E2` |
| TrueStoryProMembership | `0xA793c002b7c12c0D4480D01A6B30464Ecb0ff66e` |
| TrueStoryAttestationNFT | `0x5bbE70eb6dB50661eb3ad0d6Fdb63245CA53F2f4` |
| TrueStoryProPayment | `0x397EE64eb02Ff7233C23aD8B54ed47cA01AF5659` |

旧合约 `0x89c3c56f0518c5aAA9E9Dd089f7eA725e1833EfD` (TriSign) 已废弃，dapp 不再读取。

## SSOT 指针

- 合约接口：`contracts/src/TrueStoryV2.sol` (主合约)
- 类型定义：`types/meeting.ts` (Meeting / Participant / EndProposal 接口)
- 数据库 schema：`supabase/migrations/0002_truestory_v2.sql` (已应用到生产 Supabase)
- 翻译表：`lib/i18n/messages.ts` (新增文案先加到这里再用 `t('key')` 引用)
- PRD：`.workflow/discovery/truestory-v2-20260512-2250-PRD.md`
- 项目规划：`.workflow/planning/truestory-v2-20260512-2255-项目规划.md`

## 架构决策动机

- **2-10 人动态**：从 trisign 的硬编码 3 改成 Solidity `address[]` + 全员签名。不接 1 人自证（产品定位是"多方协作"）。
- **弃旧合约**：address[3] 是 Solidity 固定数组，链上结构改不了。新合约从零部署，旧合约链上数据不迁移。
- **Pro 创建时决定**：付费触发在 host 点"创建 Pro 会议"那一刻，不在 sealed 后追加。所有参会人 lobby 明示同意。
- **取证级 JSON 一等公民**：下载文件含完整签名 + Merkle proof + 验证指引，可第三方独立验证不依赖 trueStory 存活。
- **room code 动态释放**：sealed 那一刻 code_released_at 写入，partial unique index 让旧 code 可被新会议抢占。
- **end meeting 严格多数**：任一人发起 + 提议者外 ≥ floor((N-1)/2) 同意。2 人时另一人必须同意，10 人时另外 5 人。
- **Arweave + Lit + NFT 原子化**：Pro 升级三件事在合约 finalize 函数里 require 都成才 commit；失败 refund() 退款。
- **i18n 自实现**：不引入 next-intl 等重型库。Next 16 App Router 的 i18n routing 已废，自己写 Context + hook 约 60 行代码，messages 表集中维护。Locale 持久化 localStorage，首次根据 navigator.language 自动选。
- **Supabase migration 通过 Management API**：国内本地直连 pooler 被 DNS 拦截，改走 https://api.supabase.com/v1/projects/{ref}/database/query（cloudflare 1010 通过加浏览器 UA 绕过）。

## 近期方向

- **当前**：v2.0 重构完成 + i18n 基础设施上线。Arweave / Lit Protocol 实际集成 placeholder 模式（待用户提供 AR wallet + Lit capacity credit）。
- **v2.5 路线图**：接入 x402 协议让 AI Agent 能自动付费调用 trueStory；客户端互相对账机制挡共谋攻击；ENS 名解析；i18n 渐进覆盖剩余内页（recording / sign / membership / my-meetings）。

<!-- AI-MAINTAINED:END -->
