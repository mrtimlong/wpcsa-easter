import { content } from '../data/content.ts'
import type { MessageKey } from '../i18n/en.ts'
import { useI18n } from '../i18n/index.tsx'

type Link = { href: string; title: MessageKey; description: MessageKey; show?: boolean }

const links: Link[] = [
  { href: '/my-teams', title: 'myTeams.title', description: 'more.myTeams' },
  { href: '/visit', title: 'nav.visit', description: 'more.visit', show: content.guide !== undefined },
]

/** Everything that doesn't fit in the tab bar. */
export function More() {
  const { t, l } = useI18n()
  return (
    <section>
      <h1>{t('more.title')}</h1>
      <ul class="link-list">
        {links
          .filter((link) => link.show !== false)
          .map((link) => (
            <li key={link.href}>
              <a href={link.href}>
                <strong>{t(link.title)}</strong>
                <span class="muted">{t(link.description, { city: l(content.tournament.host) })}</span>
              </a>
            </li>
          ))}
      </ul>
    </section>
  )
}
