import { content } from '../data/content.ts'
import { dayKey, formatDay, formatTime, scoreSummary } from '../data/format.ts'
import { currentTime } from '../data/live.ts'
import { outcome } from '../data/outcome.ts'
import { resolveSlot } from '../data/resolve.ts'
import type { Fixture, Result, Slot } from '../data/schema.ts'
import { useFavourites } from '../favourites.tsx'
import { useI18n } from '../i18n/index.tsx'
import { useResults } from '../results.tsx'
import { SportIcon } from './sport-icon.tsx'

const fixtureById = new Map(content.fixtures.map((f) => [f.id, f]))
const teamById = new Map(content.teams.map((t) => [t.id, t]))
const competitionById = new Map(content.competitions.map((c) => [c.id, c]))
const venueById = new Map(content.venues.map((v) => [v.id, v]))

/**
 * Team name for a slot, or a description of who it will be ("Winner of Game 49").
 * Resolves against the published results unless given others (the admin screens' latest).
 */
export function useSlotName(resultMap?: Map<string, Result>) {
  const { t, l } = useI18n()
  const published = useResults()
  return (slot: Slot, fixture: Fixture): { name: string; known: boolean; teamId?: string } => {
    const teamId = resolveSlot(slot, fixture, content, resultMap ?? published)
    if (teamId) return { name: teamById.get(teamId)?.name ?? teamId, known: true, teamId }
    if ('tbc' in slot) return { name: l(slot.tbc), known: false }
    if ('winnerOf' in slot || 'loserOf' in slot) {
      const ref = fixtureById.get('winnerOf' in slot ? slot.winnerOf : slot.loserOf)
      const game = ref?.number ?? '?'
      return { name: t('winnerOf' in slot ? 'slot.winnerOf' : 'slot.loserOf', { game }), known: false }
    }
    if ('position' in slot) {
      const name = slot.group
        ? t('slot.groupPosition', { group: slot.group, position: slot.position })
        : t('slot.position', { position: slot.position })
      return { name, known: false }
    }
    return { name: '?', known: false }
  }
}

/** How long after its start a game with no result yet counts as on (for its stream link). */
const PLAYING_MS = 3 * 60 * 60 * 1000

/** The stream before and during a game, then the replay once it's over (if there is one). */
export function streamLink(
  fixture: Fixture,
  result: Result | undefined,
  time: number,
): { href: string; state: 'upcoming' | 'live' | 'replay' } | undefined {
  const start = Date.parse(fixture.start)
  const over = result ? result.status !== 'live' : time >= start + PLAYING_MS
  if (over) return fixture.replay ? { href: fixture.replay, state: 'replay' } : undefined
  if (!fixture.stream) return undefined
  const live = result?.status === 'live' || time >= start
  return { href: fixture.stream, state: live ? 'live' : 'upcoming' }
}

export function FixtureCard({
  fixture,
  showTime = true,
  showDay = false,
}: {
  fixture: Fixture
  showTime?: boolean
  /** Prefix the time with the day, for lists that span several days. */
  showDay?: boolean
}) {
  const { t, l, locale } = useI18n()
  const slotName = useSlotName()
  const results = useResults()
  const { isFavourite } = useFavourites()
  const competition = competitionById.get(fixture.competition)
  const venue = venueById.get(fixture.venue)
  const court = venue?.courts.find((c) => c.id === fixture.court)
  const result = results.get(fixture.id)
  const score = scoreSummary(result)
  const winner = outcome(result)?.winner
  const stream = streamLink(fixture, result, currentTime())
  const timeZone = content.tournament.timezone

  const sides = (['home', 'away'] as const).map((side) => ({ side, ...slotName(fixture[side], fixture) }))

  return (
    <article
      class={`fixture${competition ? ` sport-${competition.sport}` : ''}${result?.status === 'live' ? ' is-live' : ''}`}
    >
      <div class="fixture-meta">
        {showTime && (
          <time dateTime={fixture.start}>
            {showDay && `${formatDay(dayKey(fixture.start, timeZone), locale, 'short')} `}
            {formatTime(fixture.start, timeZone)}
          </time>
        )}
        {court && <span>{l(court.name)}</span>}
        {fixture.number !== undefined && <span>{t('fixture.game', { n: fixture.number })}</span>}
        {result && <span class={`badge badge-${result.status}`}>{t(`status.${result.status}`)}</span>}
        {stream && (
          <a
            class={`stream-link${stream.state === 'live' ? ' is-live' : ''}`}
            href={stream.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M8 5v14l11-7z" />
            </svg>
            {t(`fixture.stream.${stream.state}`)}
          </a>
        )}
      </div>
      <div class="fixture-comp">
        {competition && <SportIcon sport={competition.sport} />}
        {competition && t(`sport.${competition.sport}`)}
        {/* Skip the competition name when it just repeats the sport ("Volleyball · Volleyball"). */}
        {competition && l(competition.name) !== t(`sport.${competition.sport}`) && ` · ${l(competition.name)}`}
        {fixture.group && ` · ${t('fixture.group', { group: fixture.group })}`}
        {fixture.label && ` · ${l(fixture.label)}`}
      </div>
      <div class="fixture-teams">
        {sides.map(({ side, name, known, teamId }) => (
          <div key={side} class={`fixture-team${winner === side ? ' is-winner' : ''}${known ? '' : ' is-tbc'}`}>
            <span class="fixture-team-name">
              {teamId ? <a href={`/teams/${teamId}`}>{name}</a> : name}
              {teamId && isFavourite(teamId) && (
                <span class="star-mark" role="img" title={t('myTeams.followed')} aria-label={t('myTeams.followed')}>
                  {' ★'}
                </span>
              )}
            </span>
            {score && <span class="fixture-score">{score[side]}</span>}
          </div>
        ))}
      </div>
      {(score?.detail || fixture.format || fixture.officials) && (
        <div class="fixture-extra">
          {score?.detail && <span>{score.detail}</span>}
          {!score && fixture.format && <span>{t('fixture.bestOf', { n: fixture.format.bestOf })}</span>}
          {fixture.officials && (
            <span>{t('fixture.officials', { name: slotName(fixture.officials, fixture).name })}</span>
          )}
        </div>
      )}
    </article>
  )
}
