import { sports } from '../components/sport-filter.tsx'
import { content } from '../data/content.ts'
import { useFavourites } from '../favourites.tsx'
import { useI18n } from '../i18n/index.tsx'

export function MyTeams() {
  const { t, l } = useI18n()
  const { favourites, isFavourite, toggle, clear } = useFavourites()
  const followed = content.teams.filter((team) => favourites.has(team.id)).length

  return (
    <section>
      <h1>{t('myTeams.title')}</h1>
      <p>{t('myTeams.intro')}</p>
      <p class="my-teams-summary">
        <span class="muted">{t('myTeams.count', { n: followed })}</span>
        {followed > 0 && (
          <button type="button" class="link-button" onClick={clear}>
            {t('myTeams.clear')}
          </button>
        )}
      </p>

      {sports.map((sport) => (
        <div key={sport} class="my-teams-sport">
          <h2>{t(`sport.${sport}`)}</h2>
          {content.competitions
            .filter((c) => c.sport === sport)
            .map((competition) => (
              <div key={competition.id}>
                <h3>{l(competition.name)}</h3>
                <div class="chips chips-wrap">
                  {content.teams
                    .filter((team) => team.competition === competition.id)
                    .map((team) => (
                      <button
                        key={team.id}
                        type="button"
                        class="chip team-chip"
                        aria-pressed={isFavourite(team.id)}
                        onClick={() => toggle(team.id)}
                      >
                        <span aria-hidden="true">{isFavourite(team.id) ? '★' : '☆'}</span> {team.name}
                      </button>
                    ))}
                </div>
              </div>
            ))}
        </div>
      ))}
    </section>
  )
}
