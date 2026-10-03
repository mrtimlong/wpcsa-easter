import { useState } from 'preact/hooks'
import { FixtureCard } from '../components/fixture-card.tsx'
import { DemoNotice, SportFilter, type SportChoice } from '../components/sport-filter.tsx'
import { content } from '../data/content.ts'
import { dayKey, formatDay, formatTime } from '../data/format.ts'
import { DEMO, now } from '../data/live.ts'
import type { Fixture, ProgrammeItem } from '../data/schema.ts'
import { useI18n } from '../i18n/index.tsx'

const timeZone = content.tournament.timezone
const sportOf = new Map(content.competitions.map((c) => [c.id, c.sport]))
const venueById = new Map(content.venues.map((v) => [v.id, v]))

type Entry = { start: string; fixture?: Fixture; item?: ProgrammeItem }

const days = [...new Set([...content.fixtures, ...content.programme].map((e) => dayKey(e.start, timeZone)))].sort()

export function Schedule() {
  const { t, l, locale } = useI18n()
  const today = dayKey(new Date(now).toISOString(), timeZone)
  const [day, setDay] = useState(days.includes(today) ? today : days[0])
  const [sport, setSport] = useState<SportChoice>('all')

  const entries: Entry[] = [
    ...content.programme
      .filter((p) => dayKey(p.start, timeZone) === day)
      .filter((p) => sport === 'all' || p.sports?.includes(sport))
      .map((item): Entry => ({ start: item.start, item })),
    ...content.fixtures
      .filter((f) => dayKey(f.start, timeZone) === day)
      .filter((f) => sport === 'all' || sportOf.get(f.competition) === sport)
      .map((fixture): Entry => ({ start: fixture.start, fixture })),
  ].sort((a, b) => Date.parse(a.start) - Date.parse(b.start) || (a.item ? -1 : 1)) // events before games

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
      <SportFilter value={sport} onChange={setSport} />
      <h2 class="day-heading">{formatDay(day, locale)}</h2>
      {entries.length === 0 && <p class="muted">{t('schedule.empty')}</p>}
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
