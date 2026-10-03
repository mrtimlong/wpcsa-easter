import { useI18n } from '../i18n/index.tsx'

export function Home() {
  const { t } = useI18n()
  return (
    <section>
      <h1>{t('app.title')}</h1>
      <p class="muted">{t('app.edition', { year: 2027, city: 'TBC' })}</p>
      <p>{t('home.comingSoon')}</p>
    </section>
  )
}
