import { I18nProvider, useI18n } from './i18n/index.tsx'

/** Shown instead of the app when the tournament data couldn't be loaded. */
export function LoadError() {
  return (
    <I18nProvider>
      <Message />
    </I18nProvider>
  )
}

function Message() {
  const { t } = useI18n()
  return (
    <main class="main load-error">
      <h1>{t('app.title')}</h1>
      <p>{t('load.error')}</p>
      <button type="button" class="button" onClick={() => location.reload()}>
        {t('load.retry')}
      </button>
    </main>
  )
}
