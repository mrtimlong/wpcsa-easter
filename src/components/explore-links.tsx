import { useAnnouncements } from '../announcements.tsx'
import { content } from '../data/content.ts'
import type { MessageKey } from '../i18n/en.ts'
import { useI18n } from '../i18n/index.tsx'

type Link = { href: string; title: MessageKey; description: MessageKey; show?: boolean }

const links: Link[] = [
  { href: '/news', title: 'news.title', description: 'more.news' },
  { href: '/info', title: 'info.title', description: 'more.info' },
  { href: '/rules', title: 'rules.title', description: 'more.rules' },
  { href: '/teams', title: 'teams.title', description: 'more.teams' },
  { href: '/my-teams', title: 'myTeams.title', description: 'more.myTeams' },
  { href: '/venues', title: 'venues.title', description: 'more.venues' },
  { href: '/vendors', title: 'vendors.title', description: 'more.vendors', show: content.vendors.length > 0 },
  { href: '/sponsors', title: 'sponsors.title', description: 'more.sponsors', show: content.sponsors.length > 0 },
  { href: '/visit', title: 'nav.visit', description: 'more.visit', show: content.guide !== undefined },
]

/** Home page: everything that isn't in the tab bar. */
export function ExploreLinks() {
  const { t, l } = useI18n()
  const { unread } = useAnnouncements()
  return (
    <section class="explore">
      <h2>{t('home.explore')}</h2>
      <ul class="link-grid">
        {links
          .filter((link) => link.show !== false)
          .map((link) => (
            <li key={link.href}>
              <a href={link.href}>
                <strong>
                  {t(link.title)}
                  {link.href === '/news' && unread.size > 0 && (
                    <span class="badge badge-new">{t('news.unread', { n: unread.size })}</span>
                  )}
                </strong>
                <span class="muted">{t(link.description, { city: l(content.tournament.host) })}</span>
              </a>
            </li>
          ))}
      </ul>
    </section>
  )
}
