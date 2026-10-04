import { content } from '../data/content.ts'
import { formatDateTime } from '../data/format.ts'
import type { Announcement } from '../data/schema.ts'
import { useI18n } from '../i18n/index.tsx'
import { PlainText } from './plain-text.tsx'

export function AnnouncementCard({ announcement: a, isNew }: { announcement: Announcement; isNew?: boolean }) {
  const { t, l, locale } = useI18n()
  return (
    <article id={a.id} class={`card announcement${a.urgent ? ' is-urgent' : ''}`}>
      <div class="card-body">
        <p class="announcement-meta">
          <time dateTime={a.posted}>{formatDateTime(a.posted, content.tournament.timezone, locale, 'short')}</time>
          {a.urgent && <span class="badge badge-urgent">{t('news.urgent')}</span>}
          {a.pinned && <span class="badge">{t('news.pinned')}</span>}
          {isNew && <span class="badge badge-new">{t('news.new')}</span>}
        </p>
        <h2>{l(a.title)}</h2>
        {a.body && <PlainText text={l(a.body)} />}
      </div>
    </article>
  )
}
