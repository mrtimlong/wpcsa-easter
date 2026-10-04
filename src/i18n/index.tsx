import { type ComponentChildren, createContext } from 'preact'
import { useContext, useEffect, useState } from 'preact/hooks'
import { en, type MessageKey } from './en.ts'
import { zhHant } from './zh-Hant.ts'

export type Locale = 'en' | 'zh-Hant'

const STORAGE_KEY = 'locale'

const messages: Record<Locale, Partial<Record<MessageKey, string>>> = {
  en,
  'zh-Hant': zhHant,
}

export function translate(locale: Locale, key: MessageKey, params?: Record<string, string | number>): string {
  const template = messages[locale][key] ?? en[key]
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
}

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'zh-Hant') return saved
  } catch {
    // Storage unavailable (private mode etc.): fall through to browser language.
  }
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh-Hant' : 'en'
}

/** Bilingual content text ({ en, zh? }) in the given locale, falling back to English. */
export function localize(locale: Locale, text: { en: string; zh?: string }): string {
  return (locale === 'zh-Hant' && text.zh) || text.en
}

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: MessageKey, params?: Record<string, string | number>) => string
  /** Localizes content text from content/<year>/*.json. */
  l: (text: { en: string; zh?: string }) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ComponentChildren }) {
  const [locale, setLocale] = useState<Locale>(initialLocale)

  useEffect(() => {
    document.documentElement.lang = locale
    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      // Ignore: the choice just won't persist.
    }
  }, [locale])

  const t = (key: MessageKey, params?: Record<string, string | number>) => translate(locale, key, params)

  const l = (text: { en: string; zh?: string }) => localize(locale, text)

  return <I18nContext.Provider value={{ locale, setLocale, t, l }}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}
