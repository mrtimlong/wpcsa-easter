import { Picture } from '../components/picture.tsx'
import { useI18n } from '../i18n/index.tsx'

export function Home() {
  const { t } = useI18n()
  // TODO: take dates/host from content once content/2027 exists (content/ is still the 2025 seed).
  return (
    <>
      <section class="home-hero">
        {/* Portrait artwork on phones (title overlaid in its empty top area), landscape elsewhere. */}
        <Picture
          name="goat-hero"
          art={[{ media: '(max-width: 40rem)', name: 'goat-hero-portrait' }]}
          sizes="(max-width: 48rem) 100vw, 48rem"
          alt={t('home.heroAlt')}
          eager
        />
        <div class="home-hero-text">
          <h1>{t('app.title')}</h1>
          <p>{t('home.dates')}</p>
        </div>
      </section>
      <p>{t('home.comingSoon')}</p>
    </>
  )
}
