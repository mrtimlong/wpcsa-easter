import { useState } from 'preact/hooks'
import { NoTeamsYet, type SportChoice, SportFilter, sports } from '../components/sport-filter.tsx'
import { SportIcon } from '../components/sport-icon.tsx'
import { content } from '../data/content.ts'
import { useFavourites } from '../favourites.tsx'
import { useI18n } from '../i18n/index.tsx'

const associationById = new Map(content.associations.map((a) => [a.id, a]))

/** Every team, by sport and competition, linking to its team page. */
export function Teams() {
  const { t, l } = useI18n()
  const { favourites, isFavourite } = useFavourites()
  const [choice, setChoice] = useState<SportChoice>('all')
  const showTeam = (id: string) => choice !== 'mine' || favourites.has(id)
  const hasTeams = (competition: string) =>
    content.teams.some((team) => team.competition === competition && showTeam(team.id))
  // One sport, or every sport that has teams to show ("My teams" skips sports you don't follow).
  const shown = sports.filter(
    (sport) =>
      (choice === 'all' || choice === 'mine' || choice === sport) &&
      content.competitions.some((c) => c.sport === sport && hasTeams(c.id)),
  )

  return (
    <section>
      <h1>{t('teams.title')}</h1>
      <SportFilter value={choice} onChange={setChoice} includeMine />
      {choice === 'mine' && favourites.size === 0 && <NoTeamsYet />}
      {shown.map((sport) => (
        <div key={sport} class={`teams-sport sport-${sport}`}>
          <h2>
            <SportIcon sport={sport} /> {t(`sport.${sport}`)}
          </h2>
          {content.competitions
            .filter((c) => c.sport === sport && hasTeams(c.id))
            .map((competition) => (
              <div key={competition.id}>
                {l(competition.name) !== t(`sport.${sport}`) && <h3>{l(competition.name)}</h3>}
                <ul class="link-list">
                  {content.teams
                    .filter((team) => team.competition === competition.id && showTeam(team.id))
                    .map((team) => {
                      const association = team.association ? associationById.get(team.association) : undefined
                      return (
                        <li key={team.id}>
                          <a href={`/teams/${team.id}`}>
                            <strong>
                              {team.name}
                              {isFavourite(team.id) && (
                                <span class="star-mark" role="img" aria-label={t('myTeams.followed')}>
                                  {' ★'}
                                </span>
                              )}
                            </strong>
                            {association && <span class="muted">{l(association.name)}</span>}
                          </a>
                        </li>
                      )
                    })}
                </ul>
              </div>
            ))}
        </div>
      ))}
    </section>
  )
}
