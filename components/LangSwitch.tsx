'use client'

import { useTranslation } from '@/lib/i18n/provider'
import type { Locale } from '@/lib/i18n/messages'

export function LangSwitch() {
  const { locale, setLocale } = useTranslation()

  function toggle() {
    const next: Locale = locale === 'zh-CN' ? 'en' : 'zh-CN'
    setLocale(next)
  }

  return (
    <button
      onClick={toggle}
      aria-label="Switch language"
      className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors px-2 py-1 rounded border border-zinc-200 hover:border-zinc-400 font-mono"
    >
      {locale === 'zh-CN' ? 'EN' : '中'}
    </button>
  )
}
