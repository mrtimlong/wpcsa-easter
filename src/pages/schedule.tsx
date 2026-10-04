import { useState } from 'preact/hooks'
import { FixtureCard } from '../components/fixture-card.tsx'
import { DemoNotice, NoTeamsYet, type SportChoice, SportFilter } from '../components/sport-filter.tsx'
import { content } from '../data/content.ts'
import { dayKey, formatDay, formatTime } from '../data/format.ts'
import { DEMO, now } from '../data/live.ts'
import { fixtureTeams } from '../data/resolve.ts'
import type { Fixture, ProgrammeItem } from '../data/schema.ts'
import { useFavourites } from '../favourites.tsx'
import { useI18n } from '../i18n/index.tsx'
import { useResults } from '../results.tsx'

const timeZone = content.tournament.timezone
const sportOf = new Map(content.competitions.map((c) => [c.id, c.sport]))
const venueById = new Map(content.venues.map((v) => [v.id, v]))

type Entry = { start: string; fixture?: Fixture; item?: ProgrammeItem }

const days = [...new Set([...content.fixtures, ...content.programme].map((e) => dayKey(e.start, timeZone)))].sort()

const periods = ['all', 'morning', 'afternoon', 'evening'] as const
type Period = (typeof periods)[number]

/** Morning is before 12:00, afternoon 12:00–17:59, evening 18:00 on (tournament time). */
function periodOf(iso: string): Exclude<Period, 'all'> {
  const hour = Number(formatTime(iso, timeZone).slice(0, 2))
  return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
}

export function Schedule() {
  const { t, l, locale } = useI18n()
  const results = useResults()
  const today = dayKey(new Date(now).toISOString(), timeZone)
  const [day, setDay] = useState(days.includes(today) ? today : days[0])
  const [sport, setSport] = useState<SportChoice>('all')
  const [period, setPeriod] = useState<Period>('all')
  const { favourites } = useFavourites()
  const isMine = (f: Fixture) => fixtureTeams(f, content, results).some((id) => favourites.has(id))

  const entries: Entry[] = [
    ...content.programme
      .filter((p) => dayKey(p.start, timeZone) === day)
      .filter((p) => sport === 'all' || (sport !== 'mine' && p.sports?.includes(sport)))
      .map((item): Entry => ({ start: item.start, item })),
    ...content.fixtures
      .filter((f) => dayKey(f.start, timeZone) === day)
      .filter((f) => sport === 'all' || (sport === 'mine' ? isMine(f) : sportOf.get(f.competition) === sport))
      .map((fixture): Entry => ({ start: fixture.start, fixture })),
  ]
    .filter((e) => period === 'all' || periodOf(e.start) === period)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start) || (a.item ? -1 : 1)) // events before games

  const byTime = new Map<string, Entry[]>()
  for (const entry of entries) {
    const time = formatTime(entry.start, timeZone)
    byTime.set(time, [...(byTime.get(time) ?? []), entry])
  }

  return (
    <section>
      <h1>{t('schedule.title')}</h1>
      {DEMO && <DemoNotice />}
      <div class="tabs" role="tablist">
        {days.map((d) => (
          <button key={d} type="button" role="tab" class="tab" aria-selected={d === day} onClick={() => setDay(d)}>
            {formatDay(d, locale, 'short')}
          </button>
        ))}
      </div>
      <SportFilter value={sport} onChange={setSport} includeMine />
      <fieldset class="chips" aria-label={t('schedule.period')}>
        {periods.map((p) => (
          <button key={p} type="button" class="chip" aria-pressed={period === p} onClick={() => setPeriod(p)}>
            {t(`schedule.period.${p}`)}
          </button>
        ))}
      </fieldset>
      {sport === 'mine' && favourites.size === 0 && <NoTeamsYet />}
      <h2 class="day-heading">{formatDay(day, locale)}</h2>
      {entries.length === 0 && !(sport === 'mine' && favourites.size === 0) && (
        <p class="muted">
          {period !== 'all'
            ? t('schedule.emptyPeriod')
            : sport === 'mine'
              ? t('myTeams.noGamesThisDay')
              : t('schedule.empty')}
        </p>
      )}
      {[...byTime].map(([time, group]) => (
        <div key={time} class="time-group">
          <h3 class="time-heading">{time}</h3>
          {group.map(({ fixture, item }) =>
            fixture ? (
              <FixtureCard key={fixture.id} fixture={fixture} showTime={false} />
            ) : (
              item && (
                <div key={item.id} class="programme-item">
                  <strong>{l(item.title)}</strong>
                  <span class="muted">
                    {item.end && `${t('schedule.until', { time: formatTime(item.end, timeZone) })} · `}
                    {item.venue && l(venueById.get(item.venue)?.name ?? { en: item.venue })}
                  </span>
                  {item.notes && <span>{l(item.notes)}</span>}
                </div>
              )
            ),
          )}
        </div>
      ))}
    </section>
  )
}
