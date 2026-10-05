import { useState } from 'preact/hooks'
import { useSlotName } from '../components/fixture-card.tsx'
import { fixtureSports, type SportChoice, SportFilter } from '../components/sport-filter.tsx'
import { content } from '../data/content.ts'
import { dayKey, formatDay, formatTime, scoreSummary } from '../data/format.ts'
import { currentTime } from '../data/live.ts'
import type { Fixture, Result } from '../data/schema.ts'
import { useI18n } from '../i18n/index.tsx'
import { useAdmin } from './admin.tsx'

const timeZone = content.tournament.timezone
const sportOf = new Map(content.competitions.map((c) => [c.id, c.sport]))
const competitionById = new Map(content.competitions.map((c) => [c.id, c]))
const venueById = new Map(content.venues.map((v) => [v.id, v]))
const days = [...new Set(content.fixtures.map((f) => dayKey(f.start, timeZone)))].sort()
const byStart = [...content.fixtures].sort((a, b) => Date.parse(a.start) - Date.parse(b.start))

/** Started and nothing final recorded (live results still need a final score). */
export function needsResult(fixture: Fixture, result: Result | undefined, time: number): boolean {
  return Date.parse(fixture.start) <= time && (!result || result.status === 'live')
}

/** Pick a game: by day, by sport, by game number or team, or every game still needing a result. */
export function Games() {
  const { t, locale } = useI18n()
  const { results, maySport } = useAdmin()
  const slotName = useSlotName(results)
  const time = currentTime()
  const mySports = fixtureSports.filter(maySport)
  const today = dayKey(new Date(time).toISOString(), timeZone)
  const [day, setDay] = useState(days.includes(today) ? today : days[0])
  const [due, setDue] = useState(false)
  const [sport, setSport] = useState<SportChoice>('all')
  const [search, setSearch] = useState('')

  const query = search.trim().toLowerCase()
  const matches = (f: Fixture) =>
    String(f.number ?? '') === query ||
    [f.home, f.away].some((slot) => slotName(slot, f).name.toLowerCase().includes(query))

  const shown = byStart
    .filter((f) =>
      query ? matches(f) : due ? needsResult(f, results.get(f.id), time) : dayKey(f.start, timeZone) === day,
    )
    .filter((f) => {
      const s = sportOf.get(f.competition)
      return s && maySport(s) && (sport === 'all' || s === sport)
    })

  if (!mySports.length) return <p class="notice">{t('admin.error.forbidden')}</p>

  return (
    <>
      <h1>{t('admin.games.title')}</h1>
      <input
        type="search"
        class="admin-search"
        placeholder={t('admin.games.search')}
        aria-label={t('admin.games.search')}
        value={search}
        onInput={(e) => setSearch(e.currentTarget.value)}
      />
      {!query && (
        <div class="tabs" role="tablist">
          <button type="button" role="tab" class="tab" aria-selected={due} onClick={() => setDue(true)}>
            {t('admin.games.due')}
          </button>
          {days.map((d) => (
            <button
              key={d}
              type="button"
              role="tab"
              class="tab"
              aria-selected={!due && d === day}
              onClick={() => {
                setDue(false)
                setDay(d)
              }}
            >
              {formatDay(d, locale, 'short')}
            </button>
          ))}
        </div>
      )}
      {mySports.length > 1 && <SportFilter value={sport} onChange={setSport} options={mySports} />}
      {shown.length === 0 && <p class="muted">{due && !query ? t('admin.games.dueNone') : t('admin.games.none')}</p>}
      <ul class="admin-games">
        {shown.map((f) => (
          <GameRow
            key={f.id}
            fixture={f}
            result={results.get(f.id)}
            due={needsResult(f, results.get(f.id), time)}
            showDay={due || !!query}
          />
        ))}
      </ul>
    </>
  )
}

function GameRow({
  fixture: f,
  result,
  due,
  showDay,
}: {
  fixture: Fixture
  result?: Result
  due: boolean
  showDay: boolean
}) {
  const { t, l, locale } = useI18n()
  const { results } = useAdmin()
  const slotName = useSlotName(results)
  const competition = competitionById.get(f.competition)
  const court = venueById.get(f.venue)?.courts.find((c) => c.id === f.court)
  const score = scoreSummary(result)
  return (
    <li class={`admin-game${competition ? ` sport-${competition.sport}` : ''}${due ? ' is-due' : ''}`}>
      <a href={`/admin/game/${encodeURIComponent(f.id)}`}>
        <span class="admin-game-meta">
          <time dateTime={f.start}>
            {showDay && `${formatDay(dayKey(f.start, timeZone), locale, 'short')} `}
            {formatTime(f.start, timeZone)}
          </time>
          {f.number !== undefined && <span>{t('fixture.game', { n: f.number })}</span>}
          {court && <span>{l(court.name)}</span>}
          {competition && <span>{l(competition.name)}</span>}
        </span>
        <span class="admin-game-teams">
          {slotName(f.home, f).name} – {slotName(f.away, f).name}
        </span>
        <span class="admin-game-result">
          {result ? (
            <>
              <span class={`badge badge-${result.status}`}>{t(`status.${result.status}`)}</span>
              {score && ` ${score.home}–${score.away}`}
              {score?.detail && <span class="muted"> ({score.detail})</span>}
            </>
          ) : (
            <span class="muted">{t('admin.games.noResult')}</span>
          )}
        </span>
      </a>
    </li>
  )
}
