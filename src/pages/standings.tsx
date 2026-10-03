import { useState } from 'preact/hooks'
import { FixtureCard } from '../components/fixture-card.tsx'
import { DemoNotice, SportFilter, sports, type SportChoice } from '../components/sport-filter.tsx'
import { content } from '../data/content.ts'
import { DEMO, results } from '../data/live.ts'
import type { Competition } from '../data/schema.ts'
import { standings } from '../data/standings.ts'
import { useFavourites } from '../favourites.tsx'
import { useI18n } from '../i18n/index.tsx'

const teamName = new Map(content.teams.map((t) => [t.id, t.name]))

export function Standings() {
  const { t } = useI18n()
  const [sport, setSport] = useState<SportChoice>(sports[0])
  const competitions = content.competitions.filter((c) => c.sport === sport)

  return (
    <section>
      <h1>{t('standings.title')}</h1>
      {DEMO && <DemoNotice />}
      <SportFilter value={sport} onChange={setSport} includeAll={false} />
      {competitions.map((c) => (
        <CompetitionStandings key={c.id} competition={c} />
      ))}
    </section>
  )
}

function CompetitionStandings({ competition }: { competition: Competition }) {
  const { t, l } = useI18n()
  const { isFavourite, toggle } = useFavourites()
  const groups: (string | undefined)[] = competition.groups ?? [undefined]
  const knockouts = content.fixtures
    .filter((f) => f.competition === competition.id && f.stage === 'knockout')
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))

  return (
    <div class="competition">
      <h2>{l(competition.name)}</h2>
      {groups.map((group) => {
        const table = standings(competition, content.teams, content.fixtures, results, group)
        return (
          <div key={group ?? 'all'} class="table-wrap">
            {group && <h3>{t('fixture.group', { group })}</h3>}
            <table class="standings">
              <thead>
                <tr>
                  <th class="num">#</th>
                  <th class="team">{t('standings.team')}</th>
                  <th class="num" title={t('standings.playedLong')}>{t('standings.played')}</th>
                  <th class="num" title={t('standings.wonLong')}>{t('standings.won')}</th>
                  <th class="num" title={t('standings.lostLong')}>{t('standings.lost')}</th>
                  <th class="num" title={t('standings.diffLong')}>{t('standings.diff')}</th>
                  <th class="num" title={t('standings.pointsLong')}>{t('standings.points')}</th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, i) => (
                  <tr key={row.team} class={isFavourite(row.team) ? 'is-mine' : undefined}>
                    <td class="num">{i + 1}</td>
                    <td class="team">
                      <button
                        type="button"
                        class="star-button"
                        aria-pressed={isFavourite(row.team)}
                        aria-label={t('myTeams.follow', { team: teamName.get(row.team) ?? row.team })}
                        onClick={() => toggle(row.team)}
                      >
                        {isFavourite(row.team) ? '★' : '☆'}
                      </button>
                      {teamName.get(row.team) ?? row.team}
                    </td>
                    <td class="num">{row.played}</td>
                    <td class="num">{row.won}</td>
                    <td class="num">{row.lost}</td>
                    <td class="num">{row.diff > 0 ? `+${row.diff}` : row.diff}</td>
                    <td class="num strong">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p class="table-note muted">
              {table.complete ? t('standings.complete') : t('standings.inProgress')}
            </p>
          </div>
        )
      })}
      {knockouts.length > 0 && (
        <>
          <h3>{t('standings.knockouts')}</h3>
          {knockouts.map((f) => (
            <FixtureCard key={f.id} fixture={f} showDay />
          ))}
        </>
      )}
    </div>
  )
}
