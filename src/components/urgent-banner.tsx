import { useLocation } from 'preact-iso'
import { useAnnouncements } from '../announcements.tsx'
import { useI18n } from '../i18n/index.tsx'

/** The latest urgent announcement, on every page until dismissed (not on the announcements page itself). */
export function UrgentBanner() {
  const { t, l } = useI18n()
  const { path } = useLocation()
  const { banner, dismiss } = useAnnouncements()
  if (!banner || path === '/news') return null
  return (
    <div class="urgent-banner" role="status">
      <a href={`/news#${banner.id}`}>
        <strong>{t('news.urgent')}:</strong> {l(banner.title)}
      </a>
      <button type="button" aria-label={t('news.dismiss')} onClick={() => dismiss(banner.id)}>
        ×
      </button>
    </div>
  )
}
