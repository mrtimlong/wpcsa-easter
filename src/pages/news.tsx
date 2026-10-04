import { useEffect, useState } from 'preact/hooks'
import { useAnnouncements } from '../announcements.tsx'
import { AnnouncementCard } from '../components/announcement-card.tsx'
import { useScrollToHash } from '../hooks/scroll-to-hash.ts'
import { useI18n } from '../i18n/index.tsx'

/** Organiser announcements during the weekend. Opening the page marks them all read. */
export function News() {
  useScrollToHash()
  const { t } = useI18n()
  const { announcements, unread, markAllRead } = useAnnouncements()
  // Keep the "New" labels for this visit, even though they're marked read straight away.
  const [newThisVisit] = useState(unread)

  useEffect(() => {
    if (announcements.length > 0) markAllRead()
  }, [announcements, markAllRead])

  return (
    <section>
      <h1>{t('news.title')}</h1>
      {announcements.length === 0 && <p class="muted">{t('news.empty')}</p>}
      {announcements.map((a) => (
        <AnnouncementCard key={a.id} announcement={a} isNew={newThisVisit.has(a.id) || unread.has(a.id)} />
      ))}
    </section>
  )
}
