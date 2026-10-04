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

/** "26 – 29 March 2027" / "2027年3月26日至29日" (dates are YYYY-MM-DD) */
export function formatDateRange(start: string, end: string, locale: Locale): string {
  const format = new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return format.formatRange(new Date(`${start}T12:00:00Z`), new Date(`${end}T12:00:00Z`))
}

/** "Sunday, 20 April, 15:00" (or "Sun 20 Apr, 15:00" short) in the tournament's timezone */
export function formatDateTime(
  iso: string,
  timeZone: string,
  locale: Locale,
  style: 'long' | 'short' = 'long',
): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: style,
    day: 'numeric',
    month: style,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).format(new Date(iso))
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

/** "+02:00": the timezone's UTC offset at an instant. */
function utcOffset(instant: number, timeZone: string): string {
  const name = new Intl.DateTimeFormat('en', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(new Date(instant))
    .find((p) => p.type === 'timeZoneName')!.value
  return name === 'GMT' ? '+00:00' : name.slice(3)
}

/** An instant as tournament-local date-time with offset, the format the data uses: "2027-03-26T13:30+02:00". */
export function toLocalIso(instant: number, timeZone: string): string {
  return `${dayKey(new Date(instant).toISOString(), timeZone)}T${formatTime(new Date(instant).toISOString(), timeZone)}${utcOffset(instant, timeZone)}`
}

/** A datetime-local input value ("2027-03-26T13:30") read as tournament time. */
export function fromLocalInput(value: string, timeZone: string): string {
  // The offset at roughly that time (close enough: tournaments don't straddle a DST change).
  return `${value}${utcOffset(Date.parse(`${value}Z`), timeZone)}`
}

/** The other way: a data date-time as a datetime-local input value, in tournament time. */
export function toLocalInput(iso: string, timeZone: string): string {
  return toLocalIso(Date.parse(iso), timeZone).slice(0, 16)
}
