import { LatestNews } from '../components/latest-news.tsx'
import { MyNextGames } from '../components/my-next-games.tsx'
import { Picture, siteImage } from '../components/picture.tsx'
import { ProgrammeOverview } from '../components/programme-overview.tsx'
import { content } from '../data/content.ts'
import { formatDateRange } from '../data/format.ts'
import { useI18n } from '../i18n/index.tsx'

export function Home() {
  const { t, locale } = useI18n()
  const { startDate, endDate } = content.tournament
  return (
    <>
      <section class="home-hero">
        {/* Portrait artwork on phones (title overlaid in its empty top area), landscape elsewhere. */}
        <Picture
          image={siteImage('goat-hero')}
          art={[{ media: '(max-width: 40rem)', image: siteImage('goat-hero-portrait') }]}
          sizes="(max-width: 48rem) 100vw, 48rem"
          alt={t('home.heroAlt')}
          eager
        />
        <div class="home-hero-text">
          <h1>{t('app.title')}</h1>
          <p>{t('home.dates', { dates: formatDateRange(startDate, endDate, locale) })}</p>
          <p class="motto">{t('home.motto')}</p>
        </div>
      </section>
      <LatestNews />
      <ProgrammeOverview />
      <MyNextGames />
    </>
  )
}
