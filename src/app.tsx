import type { ComponentChildren } from 'preact'
import { LocationProvider, lazy, Route, Router, useLocation } from 'preact-iso'
import { AnnouncementsProvider } from './announcements.tsx'
import { ClockNotice } from './components/clock-notice.tsx'
import { SponsorStrip } from './components/sponsor-strip.tsx'
import { TabBar } from './components/tab-bar.tsx'
import { UrgentBanner } from './components/urgent-banner.tsx'
import { FavouritesProvider } from './favourites.tsx'
import { I18nProvider, useI18n } from './i18n/index.tsx'
import { Home } from './pages/home.tsx'
import { Info } from './pages/info.tsx'
import { More } from './pages/more.tsx'
import { MyTeams } from './pages/my-teams.tsx'
import { News } from './pages/news.tsx'
import { NotFound } from './pages/not-found.tsx'
import { Results } from './pages/results.tsx'
import { Rules } from './pages/rules.tsx'
import { Schedule } from './pages/schedule.tsx'
import { Sponsors } from './pages/sponsors.tsx'
import { Standings } from './pages/standings.tsx'
import { TeamPage } from './pages/team.tsx'
import { Teams } from './pages/teams.tsx'
import { Vendors } from './pages/vendors.tsx'
import { Venues } from './pages/venues.tsx'
import { Visit } from './pages/visit.tsx'
import { ResultsProvider } from './results.tsx'

// Only committee members open /admin, so it's a separate download.
const Admin = lazy(() => import('./admin/admin.tsx').then((m) => m.Admin))

/** The public app's extras (urgent banner, sponsors, tab bar), left out of /admin. */
function PublicOnly({ children }: { children: ComponentChildren }) {
  const { path } = useLocation()
  return path === '/admin' || path.startsWith('/admin/') ? null : children
}

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
  return (
    <header class="header">
      <div class="header-row">
        <a class="header-title" href="/">
          {t('app.title')}
        </a>
        <div class="header-actions">
          <a class="header-icon" href="/my-teams" title={t('myTeams.title')} aria-label={t('myTeams.title')}>
            ★
          </a>
          <button type="button" class="lang-toggle" onClick={() => setLocale(locale === 'en' ? 'zh-Hant' : 'en')}>
            {t('lang.toggle')}
          </button>
        </div>
      </div>
    </header>
  )
}

/** Rotating sponsor logos at the foot of every page except the sponsors page itself. */
function Sponsorship() {
  const { path } = useLocation()
  return path === '/sponsors' ? null : <SponsorStrip />
}

export function App() {
  return (
    <I18nProvider>
      <FavouritesProvider>
        <AnnouncementsProvider>
          <ResultsProvider>
            <LocationProvider>
              <Logos />
              <Header />
              <PublicOnly>
                <UrgentBanner />
              </PublicOnly>
              <main class="main">
                <ClockNotice />
                <Router>
                  <Route path="/" component={Home} />
                  <Route path="/schedule" component={Schedule} />
                  <Route path="/results" component={Results} />
                  <Route path="/standings" component={Standings} />
                  <Route path="/visit" component={Visit} />
                  <Route path="/my-teams" component={MyTeams} />
                  <Route path="/more" component={More} />
                  <Route path="/news" component={News} />
                  <Route path="/teams" component={Teams} />
                  <Route path="/teams/:id" component={TeamPage} />
                  <Route path="/venues" component={Venues} />
                  <Route path="/vendors" component={Vendors} />
                  <Route path="/info" component={Info} />
                  <Route path="/rules" component={Rules} />
                  <Route path="/sponsors" component={Sponsors} />
                  <Route path="/admin/:page*" component={Admin} />
                  <Route default component={NotFound} />
                </Router>
                <PublicOnly>
                  <Sponsorship />
                </PublicOnly>
              </main>
              <PublicOnly>
                <TabBar />
              </PublicOnly>
            </LocationProvider>
          </ResultsProvider>
        </AnnouncementsProvider>
      </FavouritesProvider>
    </I18nProvider>
  )
}
