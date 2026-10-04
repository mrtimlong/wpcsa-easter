import { useState } from 'preact/hooks'
import { FixtureCard } from '../components/fixture-card.tsx'
import { ResultsUpdated } from '../components/results-updated.tsx'
import { DemoNotice, fixtureSports, NoTeamsYet, type SportChoice, SportFilter } from '../components/sport-filter.tsx'
import { content } from '../data/content.ts'
import { dayKey, formatDay } from '../data/format.ts'
import { currentTime, DEMO } from '../data/live.ts'
import { fixtureTeams } from '../data/resolve.ts'
import type { Fixture } from '../data/schema.ts'
import { useFavourites } from '../favourites.tsx'
import { useI18n } from '../i18n/index.tsx'
import { useResults } from '../results.tsx'

const timeZone = content.tournament.timezone
const sportOf = new Map(content.competitions.map((c) => [c.id, c.sport]))

/** When the first game starts: before then, there are no results to expect. */
const firstStart = Math.min(...content.fixtures.map((f) => Date.parse(f.start)))

export function Results() {
  const { t, locale } = useI18n()
  const results = useResults()
  const [sport, setSport] = useState<SportChoice>('all')
  const { favourites } = useFavourites()

  const withResults = content.fixtures
    .filter((f) => results.has(f.id))
    .filter((f) =>
      sport === 'all'
        ? true
        : sport === 'mine'
          ? fixtureTeams(f, content, results).some((id) => favourites.has(id))
          : sportOf.get(f.competition) === sport,
    )
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
      <ResultsUpdated />
      <SportFilter value={sport} onChange={setSport} includeMine options={fixtureSports} />
      {sport === 'mine' && favourites.size === 0 && <NoTeamsYet />}
      {withResults.length === 0 && !(sport === 'mine' && favourites.size === 0) && (
        <p class="muted">
          {sport === 'mine'
            ? t('myTeams.noResults')
            : currentTime() < firstStart
              ? t('results.notStarted', {
                  day: formatDay(dayKey(new Date(firstStart).toISOString(), timeZone), locale),
                })
              : t('results.empty')}
        </p>
      )}
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
