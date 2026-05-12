// trueStory i18n catalogs.
// Add new keys as `key: { 'zh-CN': '...', en: '...' }`.
// Component code calls `t('key')` via useTranslation() — see provider.tsx.

export type Locale = 'zh-CN' | 'en'

export const SUPPORTED_LOCALES: Locale[] = ['zh-CN', 'en']

export const DEFAULT_LOCALE: Locale = 'zh-CN'

export const messages = {
  // Header / global
  'header.myMeetings': { 'zh-CN': '我的会议', en: 'My Meetings' },
  'header.proMembership': { 'zh-CN': 'Pro 月卡', en: 'Pro Pass' },
  'lang.zh': { 'zh-CN': '中', en: 'ZH' },
  'lang.en': { 'zh-CN': 'EN', en: 'EN' },

  // Home page
  'home.title': {
    'zh-CN': '不需取信的会议记录',
    en: 'Trustless Meeting Records',
  },
  'home.subtitle': {
    'zh-CN': '每句话、每条异议都由参与人共识签名上链。',
    en: 'Multi-party consensus, cryptographically verifiable, no operator needed.',
  },
  'home.newMeeting': { 'zh-CN': '新建会议', en: 'New meeting' },
  'home.joinMeeting': { 'zh-CN': '加入会议', en: 'Join meeting' },
  'home.connectHint': {
    'zh-CN': '点击按钮自动唤起钱包连接',
    en: 'Click any button to connect wallet',
  },
  'home.wrongNetwork': {
    'zh-CN': '请切换到 Monad Testnet',
    en: 'Please switch to Monad Testnet',
  },
  'home.footerContract': { 'zh-CN': '合约', en: 'Contract' },

  // New meeting page
  'new.back': { 'zh-CN': '返回', en: 'Back' },
  'new.pageTitle': { 'zh-CN': '新建会议', en: 'New meeting' },
  'new.title': { 'zh-CN': '创建新会议', en: 'Create a new meeting' },
  'new.subtitle': {
    'zh-CN': '2-10 人共识，每人钱包签名上链',
    en: '2-10 participants, each signs on-chain with their own wallet',
  },
  'new.createFree': { 'zh-CN': '创建会议', en: 'Create meeting' },
  'new.createProPay': {
    'zh-CN': '支付 0.5 MON 并创建 Pro 会议',
    en: 'Pay 0.5 MON and create Pro meeting',
  },
  'new.createProMembership': {
    'zh-CN': '创建 Pro 会议（月卡覆盖）',
    en: 'Create Pro meeting (covered by membership)',
  },
  'new.payingPrompt': {
    'zh-CN': '请在钱包中确认 Pro 付款',
    en: 'Please confirm Pro payment in your wallet',
  },
  'new.payingConfirming': {
    'zh-CN': '等待链上确认...',
    en: 'Waiting for on-chain confirmation...',
  },
  'new.creating': { 'zh-CN': '正在创建会议...', en: 'Creating meeting...' },
  'new.proBannerWithNft': {
    'zh-CN': 'Pro 会议 · 永久加密存证 · 将给参与人各 mint 一张参会凭证 NFT',
    en: 'Pro meeting · Permanent encrypted archive · Attestation NFT for each participant',
  },
  'new.proBannerNoNft': {
    'zh-CN': 'Pro 会议 · 永久加密存证 · 不 mint NFT',
    en: 'Pro meeting · Permanent encrypted archive · No NFT',
  },
  'new.shareHint': {
    'zh-CN': '分享 code 或链接 — 至少还需要 1 个参与者',
    en: 'Share the code or link — at least 1 more participant needed',
  },
  'new.goToLobby': { 'zh-CN': '进入候场', en: 'Go to lobby' },

  // ProToggle
  'proToggle.title': { 'zh-CN': '升级为 Pro 会议', en: 'Upgrade to Pro meeting' },
  'proToggle.coveredBadge': { 'zh-CN': '月卡覆盖', en: 'Membership covered' },
  'proToggle.descActiveFree': {
    'zh-CN': '本次免费 · 你持有有效月卡',
    en: 'Free this time · Active membership detected',
  },
  'proToggle.descActivePaid': {
    'zh-CN': '0.5 MON / 单场 · 永久加密存证',
    en: '0.5 MON / meeting · Permanent encrypted archive',
  },
  'proToggle.descFree': {
    'zh-CN': '免费版 · 中心化存档 + 链上指纹公证',
    en: 'Free tier · Centralized archive + on-chain fingerprint',
  },
  'proToggle.feature1': {
    'zh-CN': '永久存档：会议记录加密后上传到 Arweave 网络，理论可存 200+ 年。',
    en: 'Permanent archive: encrypted upload to Arweave network, theoretically lasting 200+ years.',
  },
  'proToggle.feature2': {
    'zh-CN': '独立解密：仅参与人钱包能凭 Lit Protocol 解开内容。',
    en: 'Independent decryption: only participant wallets can decrypt via Lit Protocol.',
  },
  'proToggle.feature3': {
    'zh-CN': '参会凭证：每个参与人钱包会收到一张 soulbound NFT。',
    en: 'Attestation: each participant receives a soulbound NFT in their wallet.',
  },
  'proToggle.skipAttestation': {
    'zh-CN': '不 mint 参会凭证 NFT（加密存档仍进行）',
    en: 'Skip attestation NFT (encrypted archive still happens)',
  },

  // Lobby
  'lobby.leave': { 'zh-CN': '离开', en: 'Leave' },
  'lobby.title': { 'zh-CN': '候场', en: 'Lobby' },
  'lobby.loading': { 'zh-CN': '加载候场中...', en: 'Loading lobby...' },
  'lobby.connectWallet': {
    'zh-CN': '连接钱包以继续',
    en: 'Connect your wallet to continue',
  },
  'lobby.proBadge': {
    'zh-CN': 'Pro 会议 · 会议结束后将永久加密存证到 Arweave，参与人凭钱包独立解密',
    en: 'Pro meeting · After end, permanently encrypted archive to Arweave; participants decrypt with their wallets',
  },
  'lobby.startMeeting': {
    'zh-CN': '开始会议（锁定名单）',
    en: 'Start meeting (lock roster)',
  },
  'lobby.locking': { 'zh-CN': '锁定中...', en: 'Locking...' },
  'lobby.allSigned': {
    'zh-CN': '全员签名完成 — 正在进入会议...',
    en: 'All signed — entering meeting...',
  },
  'lobby.waitingHost': {
    'zh-CN': '等待 host 锁定名单',
    en: 'Waiting for host to lock the roster',
  },

  // Join
  'join.title': { 'zh-CN': '加入会议', en: 'Join meeting' },
  'join.enterCode': { 'zh-CN': '请输入会议号', en: 'Enter meeting code' },
  'join.codeHint': {
    'zh-CN': '向 host 索取 6 位数字会议号',
    en: 'Ask the host for the 6-digit code',
  },
  'join.button': { 'zh-CN': '加入会议', en: 'Join meeting' },
  'join.joining': { 'zh-CN': '加入中...', en: 'Joining...' },
  'join.connectFirst': {
    'zh-CN': '连接钱包以加入',
    en: 'Connect your wallet to join',
  },
  'join.proNotice': {
    'zh-CN': '这是一场 Pro 会议，整场内容将在结束后加密上传到 Arweave 永久存档，参与人凭钱包独立解密。加入意味着同意该机制，不接受请勿加入。',
    en: 'This is a Pro meeting. Content will be encrypted and permanently archived to Arweave after the meeting; each participant can decrypt independently with their wallet. By joining you consent to this.',
  },

  // Done
  'done.home': { 'zh-CN': '首页', en: 'Home' },
  'done.title': { 'zh-CN': '已上链', en: 'On chain' },
  'done.subtitle': {
    'zh-CN': '会议记录已永久记录在 Monad 上',
    en: 'Meeting record permanently recorded on Monad',
  },
  'done.room': { 'zh-CN': '房间号', en: 'Room' },
  'done.messages': { 'zh-CN': '消息数', en: 'Messages' },
  'done.participants': { 'zh-CN': '参与人', en: 'Participants' },
  'done.signatures': { 'zh-CN': '签名状态', en: 'Signatures' },
  'done.expand': { 'zh-CN': '展开详情', en: 'Show details' },
  'done.collapse': { 'zh-CN': '收起', en: 'Collapse' },
  'done.sealTxLabel': { 'zh-CN': '链上盖章交易', en: 'Seal transaction' },
  'done.sealTxNote': {
    'zh-CN': '这是触发合约 MeetingSealed 事件的最后一笔交易。完整 N 人签名 tx 列表见下载文件。',
    en: 'The final tx that triggered MeetingSealed. Full per-participant tx list is in the download file.',
  },
  'done.download': {
    'zh-CN': '下载取证记录',
    en: 'Download forensic record',
  },
  'done.downloading': { 'zh-CN': '生成中...', en: 'Generating...' },

  // DownloadButton
  'download.button': {
    'zh-CN': '下载取证记录',
    en: 'Download forensic record',
  },

  // Membership
  'membership.back': { 'zh-CN': '返回', en: 'Back' },
  'membership.title': { 'zh-CN': 'Pro 月卡', en: 'Pro Membership' },
  'membership.description': {
    'zh-CN': '持有月卡期间，所有创建的会议默认走 Pro 路径——永久加密存证到 Arweave、Lit Protocol 解密、参会凭证 NFT，全部自动覆盖。',
    en: 'Active membership auto-applies Pro path to all your meetings: encrypted Arweave archive, Lit Protocol decryption, attestation NFTs.',
  },
  'membership.priceUnit': { 'zh-CN': '/ 30 天', en: '/ 30 days' },
  'membership.feature1': {
    'zh-CN': '月卡期内创建的 Pro 会议零额外付费',
    en: 'Zero additional fee for Pro meetings during membership',
  },
  'membership.feature2': {
    'zh-CN': 'soulbound NFT，不可转让',
    en: 'Soulbound NFT, non-transferable',
  },
  'membership.feature3': {
    'zh-CN': '到期自动失效，可续费购买新月卡',
    en: 'Auto-expires; renew by purchasing a new card',
  },
  'membership.active': { 'zh-CN': '月卡有效中', en: 'Membership active' },
  'membership.expiresAt': { 'zh-CN': '到期时间', en: 'Expires at' },
  'membership.buy': { 'zh-CN': '购买月卡', en: 'Buy membership' },
  'membership.renew': {
    'zh-CN': '续费一个月（叠加 30 天）',
    en: 'Renew (+30 days)',
  },
  'membership.confirming': { 'zh-CN': '请在钱包中确认...', en: 'Confirm in wallet...' },
  'membership.waiting': { 'zh-CN': '等待链上确认...', en: 'Waiting for confirmation...' },

  // Common
  'common.connectFirst': {
    'zh-CN': '连接钱包以继续',
    en: 'Connect your wallet to continue',
  },
} as const

export type MessageKey = keyof typeof messages
