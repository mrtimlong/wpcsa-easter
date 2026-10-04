import { useAnnouncements } from '../announcements.tsx'
import { content } from '../data/content.ts'
import { formatDateTime } from '../data/format.ts'
import { useI18n } from '../i18n/index.tsx'

const SHOW = 2

/** Home page block: the latest announcements' headlines. Hidden when there are none. */
export function LatestNews() {
  const { t, l, locale } = useI18n()
  const { announcements, unread } = useAnnouncements()
  if (announcements.length === 0) return null
  return (
    <section class="latest-news">
      <div class="section-heading">
        <h2>{t('news.latest')}</h2>
        <a href="/news">{t('news.all')}</a>
      </div>
      <ul class="link-list">
        {announcements.slice(0, SHOW).map((a) => (
          <li key={a.id}>
            <a href={`/news#${a.id}`}>
              <strong>
                {a.urgent && <span class="badge badge-urgent">{t('news.urgent')}</span>} {l(a.title)}
                {unread.has(a.id) && <span class="badge badge-new">{t('news.new')}</span>}
              </strong>
              <span class="muted">{formatDateTime(a.posted, content.tournament.timezone, locale, 'short')}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
