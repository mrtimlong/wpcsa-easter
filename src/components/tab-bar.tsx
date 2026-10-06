import { useLocation } from 'preact-iso'
import { useAnnouncements } from '../announcements.tsx'
import type { MessageKey } from '../i18n/en.ts'
import { useI18n } from '../i18n/index.tsx'

// Simple line icons (24×24, currentColor), like sport-icon.tsx. Decorative: labels are always shown.
const icons = {
  home: <path d="M3.5 10.5 12 3.5l8.5 7M5.5 9v11h5v-6h3v6h5V9" />,
  schedule: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2" />
    </>
  ),
  standings: <path d="M4 20.5v-7h5v7M9 20.5V8h6v12.5M15 20.5v-9.5h5v9.5M3 20.5h18M11.5 5l.5-1.5.5 1.5" />,
  teams: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19.5c.6-3.4 3-5.5 6-5.5s5.4 2.1 6 5.5" />
      <path d="M15.5 4.9a3.2 3.2 0 0 1 0 6.2M17 14.3c2.2.6 3.7 2.5 4 5.2" />
    </>
  ),
}

const tabs: { href: string; icon: keyof typeof icons; label: MessageKey }[] = [
  { href: '/', icon: 'home', label: 'nav.home' },
  { href: '/schedule', icon: 'schedule', label: 'nav.schedule' },
  { href: '/standings', icon: 'standings', label: 'nav.standings' },
  { href: '/teams', icon: 'teams', label: 'nav.teams' },
]

/** Fixed bottom navigation. Home is current for the pages it links to (news, info, venues…). */
export function TabBar() {
  const { t } = useI18n()
  const { path } = useLocation()
  const { unread } = useAnnouncements()
  const tabOf = (href: string) => href !== '/' && (path === href || path.startsWith(`${href}/`))
  const main = tabs.some((tab) => tabOf(tab.href))
  return (
    <nav class="tab-bar" aria-label={t('nav.label')}>
      {tabs.map((tab) => {
        const current = tab.href === '/' ? !main : tabOf(tab.href)
        return (
          <a key={tab.href} href={tab.href} aria-current={current ? 'page' : undefined}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              {icons[tab.icon]}
            </svg>
            <span>{t(tab.label)}</span>
            {/* New announcements are on Home. */}
            {tab.href === '/' && unread.size > 0 && (
              <span class="tab-dot" role="img" aria-label={t('news.unread', { n: unread.size })} />
            )}
          </a>
        )
      })}
    </nav>
  )
}
