import { content } from '../data/content.ts'
import { formatDateTime, formatTime } from '../data/format.ts'
import { useI18n } from '../i18n/index.tsx'
import { useFreshness } from '../results.tsx'

/** "Updated 2 min ago", or a warning when the results can't be refreshed. Real time, even in demo mode. */
export function ResultsUpdated() {
  const { t, locale } = useI18n()
  const { servedAt, stale } = useFreshness()
  const age = Date.now() - servedAt
  if (stale) {
    const iso = new Date(servedAt).toISOString()
    const timeZone = content.tournament.timezone
    const time = age < 12 * 3600_000 ? formatTime(iso, timeZone) : formatDateTime(iso, timeZone, locale, 'short')
    return (
      <p class="notice" role="status">
        {t('results.stale', { time })}
      </p>
    )
  }
  const minutes = Math.floor(age / 60_000)
  return (
    <p class="muted results-updated">{minutes < 1 ? t('results.updatedNow') : t('results.updated', { n: minutes })}</p>
  )
}
