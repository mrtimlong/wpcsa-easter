// Schedule and results in one: every game of a day, with its score once it has one. On a tournament
// day it opens at "Now" (the first game still on or to come), and a button brings you back there.
import { Fragment, type Ref } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { FixtureCard, isOver } from '../components/fixture-card.tsx'
import { ResultsUpdated } from '../components/results-updated.tsx'
import { DemoNotice, NoTeamsYet, type SportChoice, SportFilter } from '../components/sport-filter.tsx'
import { content } from '../data/content.ts'
import { dayKey, formatDay, formatTime } from '../data/format.ts'
import { currentTime, DEMO } from '../data/live.ts'
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

export function Schedule() {
  const { t, l, locale } = useI18n()
  const results = useResults()
  const time = currentTime()
  const today = dayKey(new Date(time).toISOString(), timeZone)
  const isEventDay = days.includes(today)
  const [day, setDay] = useState(isEventDay ? today : days[0])
  const [sport, setSport] = useState<SportChoice>('all')
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
  ].sort((a, b) => Date.parse(a.start) - Date.parse(b.start) || (a.item ? -1 : 1)) // events before games

  const byTime = new Map<string, Entry[]>()
  for (const entry of entries) {
    const key = formatTime(entry.start, timeZone)
    byTime.set(key, [...(byTime.get(key) ?? []), entry])
  }
  const groups = [...byTime]

  // "Now" goes before the first time slot with a game still on or to come (or after them all).
  // Programme events count once they've started: some last all day ("Games, 08:00–21:00").
  const over = (e: Entry) =>
    e.fixture ? isOver(e.fixture, results.get(e.fixture.id), time) : Date.parse(e.start) <= time
  const nowIndex = day === today ? groups.findIndex(([, group]) => !group.every(over)) : -1
  const nowAt = day !== today ? undefined : nowIndex === -1 ? groups.length : nowIndex
  const hasResults = entries.some((e) => e.fixture && results.has(e.fixture.id))

  // Open at "Now", and offer a way back when it's off screen or on another day.
  const marker = useRef<HTMLDivElement>(null)
  const [markerVisible, setMarkerVisible] = useState(true)
  const [jump, setJump] = useState<ScrollBehavior | null>(nowAt ? 'instant' : null)
  useEffect(() => {
    if (!jump || !marker.current) return
    marker.current.scrollIntoView({ behavior: jump, block: 'start' })
    setJump(null)
  }, [jump, day])
  useEffect(() => {
    const el = marker.current
    if (!el) return
    const observer = new IntersectionObserver(([e]) => setMarkerVisible(e.isIntersecting))
    observer.observe(el)
    return () => observer.disconnect()
  }, [day, nowAt])
  const showJump = isEventDay && (day !== today || !markerVisible)

  return (
    <section>
      <h1>{t('schedule.title')}</h1>
      {DEMO && <DemoNotice />}
      {hasResults && <ResultsUpdated />}
      <div class="tabs" role="tablist">
        {days.map((d) => (
          <button key={d} type="button" role="tab" class="tab" aria-selected={d === day} onClick={() => setDay(d)}>
            {d === today ? t('schedule.today') : formatDay(d, locale, 'short')}
          </button>
        ))}
      </div>
      <SportFilter value={sport} onChange={setSport} includeMine />
      {sport === 'mine' && favourites.size === 0 && <NoTeamsYet />}
      <h2 class="day-heading">{formatDay(day, locale)}</h2>
      {entries.length === 0 && !(sport === 'mine' && favourites.size === 0) && (
        <p class="muted">{sport === 'mine' ? t('myTeams.noGamesThisDay') : t('schedule.empty')}</p>
      )}
      {groups.map(([key, group], i) => (
        <Fragment key={key}>
          {i === nowAt && <NowMarker markerRef={marker} time={time} />}
          <div class="time-group">
            <h3 class="time-heading">{key}</h3>
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
        </Fragment>
      ))}
      {nowAt === groups.length && groups.length > 0 && <NowMarker markerRef={marker} time={time} done />}
      {showJump && (
        <button
          type="button"
          class="jump-now"
          onClick={() => {
            setDay(today)
            setJump('smooth')
          }}
        >
          {t('schedule.jumpToNow')}
        </button>
      )}
    </section>
  )
}

function NowMarker({ markerRef, time, done }: { markerRef: Ref<HTMLDivElement>; time: number; done?: boolean }) {
  const { t } = useI18n()
  return (
    <div ref={markerRef} class="now-marker">
      <span>
        {t('schedule.now', { time: formatTime(new Date(time).toISOString(), timeZone) })}
        {done && ` · ${t('schedule.dayDone')}`}
      </span>
    </div>
  )
}
