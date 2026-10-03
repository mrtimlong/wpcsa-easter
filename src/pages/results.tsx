import { useState } from 'preact/hooks'
import { FixtureCard } from '../components/fixture-card.tsx'
import { DemoNotice, SportFilter, type SportChoice } from '../components/sport-filter.tsx'
import { content } from '../data/content.ts'
import { dayKey, formatDay } from '../data/format.ts'
import { DEMO, results } from '../data/live.ts'
import type { Fixture } from '../data/schema.ts'
import { useI18n } from '../i18n/index.tsx'

const timeZone = content.tournament.timezone
const sportOf = new Map(content.competitions.map((c) => [c.id, c.sport]))

export function Results() {
  const { t, locale } = useI18n()
  const [sport, setSport] = useState<SportChoice>('all')

  const withResults = content.fixtures
    .filter((f) => results.has(f.id))
    .filter((f) => sport === 'all' || sportOf.get(f.competition) === sport)
    .sort((a, b) => Date.parse(b.start) - Date.parse(a.start)) // most recent first

  const live = withResults.filter((f) => results.get(f.id)?.status === 'live')
  const finished = withResults.filter((f) => results.get(f.id)?.status !== 'live')

  const byDay = new Map<string, Fixture[]>()
  for (const f of finished) {
    const key = dayKey(f.start, timeZone)
    byDay.set(key, [...(byDay.get(key) ?? []), f])
  }

  return (
    <section>
      <h1>{t('results.title')}</h1>
      {DEMO && <DemoNotice />}
      <SportFilter value={sport} onChange={setSport} />
      {withResults.length === 0 && <p class="muted">{t('results.empty')}</p>}
      {live.length > 0 && (
        <>
          <h2 class="day-heading">{t('results.live')}</h2>
          {live.map((f) => (
            <FixtureCard key={f.id} fixture={f} />
          ))}
        </>
      )}
      {[...byDay].map(([key, fixtures]) => (
        <div key={key}>
          <h2 class="day-heading">{formatDay(key, locale)}</h2>
          {fixtures.map((f) => (
            <FixtureCard key={f.id} fixture={f} />
          ))}
        </div>
      ))}
    </section>
  )
}
