// Date/time and score formatting. Times are always shown in the tournament's timezone,
// whatever timezone the viewer's phone is in.
import type { Locale } from '../i18n/index.tsx'
import type { Result } from './schema.ts'

const intlLocale = (locale: Locale) => (locale === 'zh-Hant' ? 'zh-Hant' : 'en-ZA')

/** Tournament-local calendar day, e.g. "2025-04-20". Used to group by day. */
export function dayKey(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(iso),
  )
}

/** "Sunday, 20 April" / "4月20日 星期日" */
export function formatDay(key: string, locale: Locale, style: 'long' | 'short' = 'long'): string {
  const date = new Date(`${key}T12:00:00Z`)
  const options: Intl.DateTimeFormatOptions =
    style === 'long'
      ? { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }
      : { weekday: 'short', day: 'numeric', timeZone: 'UTC' }
  return new Intl.DateTimeFormat(intlLocale(locale), options).format(date)
}

/** "16:50" */
export function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(
    new Date(iso),
  )
}

export type ScoreSummary = {
  home: number
  away: number
  /** Set/game scores, e.g. "25–20, 18–25, 15–11" (volleyball, badminton). */
  detail?: string
}

/** Headline score per side: points, or sets/games won (an in-progress set isn't counted). */
export function scoreSummary(result: Result | undefined): ScoreSummary | null {
  const score = result?.score
  if (!score) return null
  if (!('sets' in score)) return { home: score.home, away: score.away }
  const complete = result.status === 'live' ? score.sets.slice(0, -1) : score.sets
  return {
    home: complete.filter(([h, a]) => h > a).length,
    away: complete.filter(([h, a]) => a > h).length,
    detail: score.sets.map(([h, a]) => `${h}–${a}`).join(', '),
  }
}
