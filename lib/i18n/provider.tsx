'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  messages,
  type Locale,
  type MessageKey,
} from './messages'

interface I18nContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: MessageKey) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

const STORAGE_KEY = 'truestory.locale'

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null
    if (stored && SUPPORTED_LOCALES.includes(stored)) return stored
  } catch {
    // localStorage blocked
  }
  const nav = (window.navigator?.language ?? '').toLowerCase()
  if (nav.startsWith('zh')) return 'zh-CN'
  return 'en'
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setLocaleState(detectInitialLocale())
    setHydrated(true)
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    try {
      window.localStorage.setItem(STORAGE_KEY, l)
    } catch {
      // localStorage blocked
    }
    // Also reflect in <html lang="..."> for accessibility / SEO
    try {
      document.documentElement.lang = l
    } catch {
      // SSR or restricted env
    }
  }, [])

  const t = useCallback(
    (key: MessageKey): string => {
      const entry = messages[key]
      if (!entry) return key
      return entry[locale] ?? entry[DEFAULT_LOCALE] ?? key
    },
    [locale],
  )

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  )

  // Prevent hydration mismatch: render with DEFAULT_LOCALE on server, swap to detected locale after mount.
  // Children always receive a t() that works; locale just may briefly flip on first paint.
  void hydrated

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useTranslation() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    // Fallback for components rendered outside provider (shouldn't happen in real flow)
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {
        // no-op
      },
      t: (key: MessageKey) => messages[key]?.[DEFAULT_LOCALE] ?? key,
    }
  }
  return ctx
}
