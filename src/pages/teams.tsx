import { sports } from '../components/sport-filter.tsx'
import { SportIcon } from '../components/sport-icon.tsx'
import { content } from '../data/content.ts'
import { useFavourites } from '../favourites.tsx'
import { useI18n } from '../i18n/index.tsx'

const associationById = new Map(content.associations.map((a) => [a.id, a]))

/** Every team, by sport and competition, linking to its team page. */
export function Teams() {
  const { t, l } = useI18n()
  const { isFavourite } = useFavourites()

  return (
    <section>
      <h1>{t('teams.title')}</h1>
      {sports.map((sport) => (
        <div key={sport} class={`teams-sport sport-${sport}`}>
          <h2>
            <SportIcon sport={sport} /> {t(`sport.${sport}`)}
          </h2>
          {content.competitions
            .filter((c) => c.sport === sport)
            .map((competition) => (
              <div key={competition.id}>
                {l(competition.name) !== t(`sport.${sport}`) && <h3>{l(competition.name)}</h3>}
                <ul class="link-list">
                  {content.teams
                    .filter((team) => team.competition === competition.id)
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
