import { PlainText } from '../components/plain-text.tsx'
import { sports } from '../components/sport-filter.tsx'
import { SportIcon } from '../components/sport-icon.tsx'
import { content } from '../data/content.ts'
import type { Competition, Contact } from '../data/schema.ts'
import { useScrollToHash } from '../hooks/scroll-to-hash.ts'
import { useI18n } from '../i18n/index.tsx'

/** Tournament information: contacts, how each competition is played, then rules etc. from info.json. */
export function Info() {
  useScrollToHash()
  const { t, l } = useI18n()
  const sections = content.info?.sections ?? []
  const contents = [
    ...(content.contacts.length > 0 ? [{ id: 'contacts', title: t('info.contacts') }] : []),
    { id: 'format', title: t('info.format') },
    ...sections.map((s) => ({ id: s.id, title: l(s.title) })),
  ]

  return (
    <article class="info">
      <h1>{t('info.title')}</h1>
      <nav aria-label={t('info.contents')}>
        <ul class="chips chips-wrap info-contents">
          {contents.map((c) => (
            <li key={c.id}>
              <a class="chip" href={`#${c.id}`}>
                {c.title}
              </a>
            </li>
          ))}
          <li>
            <a class="chip" href="/rules">
              {t('rules.title')} →
            </a>
          </li>
        </ul>
      </nav>

      {content.contacts.length > 0 && (
        <section id="contacts">
          <h2>{t('info.contacts')}</h2>
          <ul class="contacts">
            {content.contacts.map((contact) => (
              <ContactCard key={contact.id} contact={contact} />
            ))}
          </ul>
        </section>
      )}

      <section id="format">
        <h2>{t('info.format')}</h2>
        {sports.map((sport) => (
          <div key={sport} class={`info-sport sport-${sport}`}>
            <h3>
              <SportIcon sport={sport} /> {t(`sport.${sport}`)}
            </h3>
            {content.competitions
              .filter((c) => c.sport === sport)
              .map((c) => (
                <CompetitionFormat key={c.id} competition={c} />
              ))}
          </div>
        ))}
      </section>

      {sections.map((section) => (
        <section key={section.id} id={section.id}>
          <h2>{l(section.title)}</h2>
          <PlainText text={l(section.body)} />
        </section>
      ))}
    </article>
  )
}

function ContactCard({ contact }: { contact: Contact }) {
  const { t, l } = useI18n()
  const digits = contact.phone?.replace(/[^0-9]/g, '')
  return (
    <li class="card contact">
      <div class="card-body">
        <strong>{l(contact.role)}</strong>
        {contact.name && <span>{contact.name}</span>}
        {contact.notes && <span class="muted">{l(contact.notes)}</span>}
        <span class="card-links">
          {contact.phone && <a href={`tel:+${digits}`}>{t('info.call', { phone: contact.phone })}</a>}
          {contact.phone && contact.whatsapp && (
            <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer">
              {t('info.whatsapp')}
            </a>
          )}
          {contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}
        </span>
      </div>
    </li>
  )
}

/** Counts derived from the fixtures, plus the competition's own description if it has one. */
function CompetitionFormat({ competition }: { competition: Competition }) {
  const { t, l } = useI18n()
  const teams = content.teams.filter((team) => team.competition === competition.id).length
  const fixtures = content.fixtures.filter((f) => f.competition === competition.id)
  const groupGames = fixtures.filter((f) => f.stage === 'group').length
  const knockouts = fixtures.filter((f) => f.stage === 'knockout').length
  const bestOf = [...new Set(fixtures.map((f) => f.format?.bestOf).filter((n) => n !== undefined))].sort()
  const facts = [
    t('format.teams', { n: teams }),
    competition.groups && t('format.pools', { pools: competition.groups.join(', ') }),
    groupGames > 0 && t('format.groupGames', { n: groupGames }),
    knockouts > 0 && t('format.knockouts', { n: knockouts }),
    bestOf.length > 0 && t('format.bestOf', { n: bestOf.join('/') }),
  ].filter(Boolean)

  return (
    <div class="competition-format">
      {l(competition.name) !== t(`sport.${competition.sport}`) && <h4>{l(competition.name)}</h4>}
      <p class="muted">{facts.join(' · ')}</p>
      {competition.format && <PlainText text={l(competition.format)} />}
    </div>
  )
}
