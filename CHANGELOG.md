# Changelog

All notable changes to trueStory will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- 国际化（i18n）：内置中英双语切换，Header 右上角圆角按钮一键切换，选择持久化到 localStorage，刷新后保留。首次访问根据浏览器语言自动选 zh-CN 或 en。轻量级实现（React Context + useTranslation hook + 翻译表），首页完整覆盖，其他页面渐进接入。
- 录音页发言人颜色：每个参与者在 Lobby 加入时随机分配色彩，录音瀑布流上的消息卡片左侧色点 + 左边框依此颜色着色，N 人会议同时发言也能视觉区分。
- Supabase migration 运行器：`scripts/run-migration.py`，通过 Supabase Management API 远程执行 SQL，绕开国内直连 pooler 被 DNS 拦截的问题。未来 schema 变更不再需要手动去 Studio 粘 SQL。
- 动态人数共识：2-10 人任意小组都能开会议，host 在 lobby 手动点"锁定 roster"那一刻冻结名单。
- Pro 升级双轨：免费版走中心化数据库 + 链上指纹；Pro 版加 Arweave 永久加密存档 + Lit Protocol 解密 + soulbound 参会凭证 NFT。
- Pro 月卡 NFT：5 MON / 30 天 soulbound 月卡，持卡期间所有创建的 Pro 会议零额外付费。
- Pro 单场付费：未持月卡可单次付 0.5 MON 升级 Pro。
- end meeting 严格多数投票：任一人发起 + 提议者外 ≥ floor((N-1)/2) 同意才结束。
- 取证级下载文件：JSON 含完整 N 人签名、Merkle proof、链上交易号、验证指引，第三方可独立验证。
- 参会凭证 NFT 默认 mint，Pro 用户可勾选"不 mint NFT"保护钱包隐私。
- room code 动态释放：sealed 那一刻 6 位 code 立刻可被新会议抢占。
- start sig 包含 participantsHash 防中间人塞人。
- 客户端掉线自动补拉错过消息（GET /api/messages?since=<id>）。
- Vercel cron 每 10 分钟检测 host 掉线 2h 自动推进 reviewing 避免会议挂死。
- "我的会议"页面枚举参会凭证 NFT（实际解密链路 placeholder）。
- "Pro 月卡"购买页。

### Changed
- 项目名 TriSign → trueStory，slogan "Three-party consensus" → "Trustless Meeting Records · 不需取信的会议记录"。
- 主合约：弃用旧 TriSign（`0x89c3c5...EfD`），新部署 TrueStoryV2 在 `0x38fBBF...93E2`，支持动态 `address[]` 而非固定 `address[3]`。
- end meeting 权限：从"仅 host"改成"任一参与者发起 + 多数同意"。
- Done 页 tx 展示：从"3 人 tx 平铺"改成"主显示最后一笔 seal tx + 折叠详情"。
- 加入页错误文案："3 participants max" → "10 participants max"。

### Removed
- 旧合约引用：`lib/contract-abi.ts` 删除，统一走 `lib/contracts.ts` 4 个合约地址。
- 旧 Counter / TriSign 合约源码和测试。
- 1 人会议场景：trueStory 不接 1 人自证，最低 2 人。

### Security
- start sig 内容现在包含完整 participants 列表的 keccak 哈希，防止后期偷塞参与人。
- 部分唯一索引 `meetings_active_code` 替代全表唯一约束，sealed 之后老 code 失效不可查。

### Fixed
- Vercel Hobby plan cron 限制：auto-advance 从每 10 分钟改为每天 03:00 UTC 一次（Hobby plan 限免每天 1 次）。
- tsconfig target 升级到 ES2020 以支持 BigInt literal（合约金额常量需要）。
- Supabase schema migration 0002 已应用到生产数据库（meetings + participants 新字段 + end_proposals 新表 + 部分唯一索引）。
