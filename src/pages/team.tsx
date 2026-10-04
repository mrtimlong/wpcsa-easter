import { useRoute } from 'preact-iso'
import { FixtureCard } from '../components/fixture-card.tsx'
import { dataImage } from '../components/photo.tsx'
import { Picture } from '../components/picture.tsx'
import { DemoNotice } from '../components/sport-filter.tsx'
import { SportIcon } from '../components/sport-icon.tsx'
import { content } from '../data/content.ts'
import { DEMO, results } from '../data/live.ts'
import { fixtureTeams } from '../data/resolve.ts'
import type { Team } from '../data/schema.ts'
import { standings } from '../data/standings.ts'
import { useFavourites } from '../favourites.tsx'
import { useI18n } from '../i18n/index.tsx'
import { NotFound } from './not-found.tsx'

const teamById = new Map(content.teams.map((t) => [t.id, t]))
const competitionById = new Map(content.competitions.map((c) => [c.id, c]))
const associationById = new Map(content.associations.map((a) => [a.id, a]))
const squadByTeam = new Map(content.squads.map((s) => [s.team, s]))

export function TeamPage() {
  const { params } = useRoute()
  const team = teamById.get(params.id)
  return team ? <TeamDetails team={team} /> : <NotFound />
}

function TeamDetails({ team }: { team: Team }) {
  const { t, l } = useI18n()
  const { isFavourite, toggle } = useFavourites()
  const competition = competitionById.get(team.competition)
  const association = team.association ? associationById.get(team.association) : undefined
  const squad = squadByTeam.get(team.id)
  const photo = squad?.photo ? dataImage(squad.photo) : undefined

  const games = content.fixtures
    .filter((f) => fixtureTeams(f, content, results).includes(team.id))
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
  const isDone = (id: string) => {
    const status = results.get(id)?.status
    return status !== undefined && status !== 'live'
  }
  const upcoming = games.filter((f) => !isDone(f.id))
  const played = games.filter((f) => isDone(f.id)).reverse()

  const table = competition && standings(competition, content.teams, content.fixtures, results, team.group)
  const position = table ? table.rows.findIndex((row) => row.team === team.id) : -1
  const row = table?.rows[position]
  const following = isFavourite(team.id)

  return (
    <article class="team-page">
      <header class="team-header">
        <h1>{team.name}</h1>
        {competition && (
          <p class={`team-comp sport-${competition.sport}`}>
            <SportIcon sport={competition.sport} />
            {t(`sport.${competition.sport}`)}
            {l(competition.name) !== t(`sport.${competition.sport}`) && ` · ${l(competition.name)}`}
            {team.group && ` · ${t('fixture.group', { group: team.group })}`}
          </p>
        )}
        {association && <p class="muted">{l(association.name)}</p>}
        <button type="button" class="button follow-button" aria-pressed={following} onClick={() => toggle(team.id)}>
          {following ? `★ ${t('team.following')}` : `☆ ${t('team.follow')}`}
        </button>
      </header>

      {photo && (
        <Picture
          image={photo}
          alt={t('team.photoAlt', { team: team.name })}
          sizes="(max-width: 48rem) 100vw, 48rem"
          class="team-photo"
          eager
        />
      )}

      {row && table && (
        <p class="team-standing">
          <a href="/standings">
            {t('team.position', { position: position + 1, count: table.rows.length })}
            {' · '}
            {t('team.record', { won: row.won, lost: row.lost, points: row.points })}
          </a>
        </p>
      )}

      <section>
        <h2>{t('team.squad')}</h2>
        {squad ? (
          <>
            {(squad.coach || squad.manager) && (
              <p class="team-staff">
                {squad.coach && <span>{t('team.coach', { name: squad.coach })}</span>}
                {squad.manager && <span>{t('team.manager', { name: squad.manager })}</span>}
              </p>
            )}
            <ul class="squad">
              {squad.players.map((player) => (
                <li key={`${player.number}-${player.name}`}>
                  <span class="squad-number">{player.number ?? ''}</span>
                  <span>
                    {player.name}
                    {player.captain && <span class="muted"> ({t('team.captain')})</span>}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p class="muted">{t('team.noSquad')}</p>
        )}
      </section>

      {DEMO && games.length > 0 && <DemoNotice />}
      {upcoming.length > 0 && (
        <section>
          <h2>{t('team.upcoming')}</h2>
          {upcoming.map((f) => (
            <FixtureCard key={f.id} fixture={f} showDay />
          ))}
        </section>
      )}
      {played.length > 0 && (
        <section>
          <h2>{t('team.results')}</h2>
          {played.map((f) => (
            <FixtureCard key={f.id} fixture={f} showDay />
          ))}
        </section>
      )}
      {games.length === 0 && <p class="muted">{t('team.noGames')}</p>}
    </article>
  )
}
