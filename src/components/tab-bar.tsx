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
  results: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
      <path d="M12 5.5v13M6.5 10.5l1.5-1v5M15.5 9.5h2.5l-2.5 5h2.5" />
    </>
  ),
  standings: <path d="M4 20.5v-7h5v7M9 20.5V8h6v12.5M15 20.5v-9.5h5v9.5M3 20.5h18M11.5 5l.5-1.5.5 1.5" />,
  more: (
    <>
      <circle cx="5.5" cy="12" r="1.3" />
      <circle cx="12" cy="12" r="1.3" />
      <circle cx="18.5" cy="12" r="1.3" />
    </>
  ),
}

const tabs: { href: string; icon: keyof typeof icons; label: MessageKey }[] = [
  { href: '/', icon: 'home', label: 'nav.home' },
  { href: '/schedule', icon: 'schedule', label: 'nav.schedule' },
  { href: '/results', icon: 'results', label: 'nav.results' },
  { href: '/standings', icon: 'standings', label: 'nav.standings' },
  { href: '/more', icon: 'more', label: 'nav.more' },
]

/** Fixed bottom navigation. "More" is current for every page that isn't one of the main four. */
export function TabBar() {
  const { t } = useI18n()
  const { path } = useLocation()
  const { unread } = useAnnouncements()
  const main = tabs.slice(0, -1).some((tab) => tab.href === path)
  return (
    <nav class="tab-bar" aria-label={t('nav.label')}>
      {tabs.map((tab) => {
        const current = tab.href === path || (tab.href === '/more' && !main)
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
            {/* New announcements live under More. */}
            {tab.href === '/more' && unread.size > 0 && (
              <span class="tab-dot" role="img" aria-label={t('news.unread', { n: unread.size })} />
            )}
          </a>
        )
      })}
    </nav>
  )
}
