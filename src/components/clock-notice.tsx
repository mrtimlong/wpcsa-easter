import { content } from '../data/content.ts'
import { formatDateTime } from '../data/format.ts'
import { clockOverride, resetClock } from '../data/live.ts'
import { useI18n } from '../i18n/index.tsx'

/** On every page while ?at= sets the clock, so testers don't forget. */
export function ClockNotice() {
  const { t, locale } = useI18n()
  if (clockOverride === undefined) return null
  const time = formatDateTime(new Date(clockOverride).toISOString(), content.tournament.timezone, locale)
  return (
    <p class="notice clock-notice">
      {t('clock.notice', { time })}{' '}
      <button type="button" class="link-button" onClick={resetClock}>
        {t('clock.reset')}
      </button>
    </p>
  )
}
