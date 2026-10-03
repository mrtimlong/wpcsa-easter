import { useI18n } from '../i18n/index.tsx'

export function NotFound() {
  const { t } = useI18n()
  return (
    <section>
      <h1>{t('notFound.title')}</h1>
      <a href="/">{t('notFound.back')}</a>
    </section>
  )
}
