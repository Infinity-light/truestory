'use client'

interface ProToggleProps {
  value: boolean
  onChange: (v: boolean) => void
  hasMembership: boolean
  skipAttestation: boolean
  onSkipAttestationChange: (v: boolean) => void
}

export function ProToggle({
  value,
  onChange,
  hasMembership,
  skipAttestation,
  onSkipAttestationChange,
}: ProToggleProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white">
      <div className="flex items-center justify-between p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-900">升级为 Pro 会议</span>
            {hasMembership && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-700 font-medium">
                月卡覆盖
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500">
            {value
              ? hasMembership
                ? '本次免费 · 你持有有效月卡'
                : '0.5 MON / 单场 · 永久加密存证'
              : '免费版 · 中心化存档 + 链上指纹公证'}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={value}
          onClick={() => onChange(!value)}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors
            ${value ? 'bg-zinc-900' : 'bg-zinc-200'}`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform
              ${value ? 'translate-x-5' : 'translate-x-0.5'} translate-y-0.5`}
          />
        </button>
      </div>

      {value && (
        <div className="border-t border-zinc-100 p-4 space-y-3">
          <ul className="space-y-1.5 text-xs text-zinc-600 leading-relaxed">
            <li>
              <span className="font-medium text-zinc-900">永久存档：</span>会议记录加密后上传到
              Arweave 网络，理论可存 200+ 年，不依赖 trueStory 服务存活。
            </li>
            <li>
              <span className="font-medium text-zinc-900">独立解密：</span>仅参与人钱包能凭 Lit
              Protocol 解开内容，路人在 Arweave 上只能看到乱码。
            </li>
            <li>
              <span className="font-medium text-zinc-900">参会凭证：</span>每个参与人钱包会收到一张
              soulbound NFT 作为参与凭证。
            </li>
          </ul>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={skipAttestation}
              onChange={(e) => onSkipAttestationChange(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900"
            />
            <span className="text-xs text-zinc-600 leading-relaxed">
              不 mint 参会凭证 NFT（加密存档仍进行，仅跳过 NFT 步骤，适合需要钱包里不留可见痕迹的场景）
            </span>
          </label>
        </div>
      )}
    </div>
  )
}
