import { useI18n } from '../i18n/index.tsx'

export function Home() {
  const { t } = useI18n()
  // TODO: take dates/host from content once content/2027 exists (content/ is still the 2025 seed).
  return (
    <>
      <section class="home-hero">
        {/* Portrait artwork on phones (title overlaid in its empty top area), landscape elsewhere. */}
        <picture>
          <source
            media="(max-width: 40rem)"
            srcset="/images/goat-hero-portrait.jpg"
            width={768}
            height={1376}
          />
          <img
            src="/images/goat-hero.jpg"
            width={1376}
            height={768}
            alt={t('home.heroAlt')}
            fetchpriority="high"
          />
        </picture>
        <div class="home-hero-text">
          <h1>{t('app.title')}</h1>
          <p>{t('home.dates')}</p>
        </div>
      </section>
      <p>{t('home.comingSoon')}</p>
    </>
  )
}
