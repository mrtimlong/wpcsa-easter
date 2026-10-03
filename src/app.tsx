import { LocationProvider, Route, Router, useLocation } from 'preact-iso'
import { I18nProvider, useI18n } from './i18n/index.tsx'
import { Home } from './pages/home.tsx'
import { NotFound } from './pages/not-found.tsx'
import { Visit } from './pages/visit.tsx'

function Logos() {
  const { t } = useI18n()
  // TODO: replace these PNGs (extracted from the 2025 brochure PDF) with SVG originals.
  return (
    <div class="logos">
      <img src="/images/sacsa-logo.png" width={416} height={108} alt={t('logo.sacsa')} />
      <img src="/images/wpcsa-logo.png" width={284} height={108} alt={t('logo.wpcsa')} />
    </div>
  )
}

function Header() {
  const { t, locale, setLocale } = useI18n()
  const { path } = useLocation()
  const links = [
    { href: '/', label: t('nav.home') },
    { href: '/visit', label: t('nav.visit') },
  ]
  return (
    <header class="header">
      <div class="header-row">
        <a class="header-title" href="/">
          {t('app.title')}
        </a>
        <button
          type="button"
          class="lang-toggle"
          onClick={() => setLocale(locale === 'en' ? 'zh-Hant' : 'en')}
        >
          {t('lang.toggle')}
        </button>
      </div>
      <nav class="nav">
        {links.map((link) => (
          <a key={link.href} href={link.href} aria-current={path === link.href ? 'page' : undefined}>
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  )
}

export function App() {
  return (
    <I18nProvider>
      <LocationProvider>
        <Logos />
        <Header />
        <main class="main">
          <Router>
            <Route path="/" component={Home} />
            <Route path="/visit" component={Visit} />
            <Route default component={NotFound} />
          </Router>
        </main>
      </LocationProvider>
    </I18nProvider>
  )
}
