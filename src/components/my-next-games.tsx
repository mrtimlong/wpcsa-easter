import { content } from '../data/content.ts'
import { now, results } from '../data/live.ts'
import { fixtureTeams } from '../data/resolve.ts'
import { useFavourites } from '../favourites.tsx'
import { useI18n } from '../i18n/index.tsx'
import { FixtureCard } from './fixture-card.tsx'

const SHOW = 3

/** Home page block: live and upcoming games for the teams this viewer follows. */
export function MyNextGames() {
  const { t } = useI18n()
  const { favourites } = useFavourites()

  if (favourites.size === 0) {
    return (
      <section class="my-next">
        <h2>{t('myTeams.title')}</h2>
        <p>{t('myTeams.prompt')}</p>
        <a class="button" href="/my-teams">
          {t('myTeams.choose')}
        </a>
      </section>
    )
  }

  const upcoming = content.fixtures
    .filter((f) => {
      const status = results.get(f.id)?.status
      return (status === undefined && Date.parse(f.start) >= now - 3600_000) || status === 'live'
    })
    .filter((f) => fixtureTeams(f, content, results).some((id) => favourites.has(id)))
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
    .slice(0, SHOW)

  return (
    <section class="my-next">
      <div class="section-heading">
        <h2>{t('myTeams.next')}</h2>
        <a href="/my-teams">{t('myTeams.edit')}</a>
      </div>
      {upcoming.length === 0 ? (
        <p class="muted">{t('myTeams.noUpcoming')}</p>
      ) : (
        upcoming.map((f) => <FixtureCard key={f.id} fixture={f} showDay />)
      )}
      <a href="/schedule">{t('myTeams.fullSchedule')}</a>
    </section>
  )
}
