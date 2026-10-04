// /admin: committee members sign in to enter results and post announcements. Loaded on demand, so
// none of this is in the public app's download. Talks to the admin API (api/app.ts), never to S3.
import './admin.css'
import { type ComponentChildren, createContext } from 'preact'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { useLocation, useRoute } from 'preact-iso'
import type { Result } from '../data/schema.ts'
import { en, type MessageKey } from '../i18n/en.ts'
import { useI18n } from '../i18n/index.tsx'
import { ApiError, type Client, createClient, type State } from './api.ts'
import { AuthError, backendReady, type Session, savedSession, signOut } from './auth.ts'
import { Changes } from './changes.tsx'
import { GameEntry } from './game.tsx'
import { Games } from './games.tsx'
import { Login } from './login.tsx'
import { AnnouncementEditor, Announcements } from './news.tsx'

/** Refetch what's saved this often, to see other scorers' changes. */
const REFRESH_MS = 30_000

type AdminContextValue = {
  session: Session
  client: Client
  state: State | null
  /** Saved results by fixture id, for resolving "Winner of game 49". */
  results: Map<string, Result>
  refresh: () => Promise<void>
}

const AdminContext = createContext<AdminContextValue | null>(null)

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used inside /admin')
  return ctx
}

/** The message for a failed call: what Cognito or the API said, in the viewer's language. */
export function useErrorMessage() {
  const { t } = useI18n()
  return (error: unknown): string => {
    const code = error instanceof AuthError || error instanceof ApiError ? error.code : 'other'
    const key = `admin.error.${code}`
    return key in en ? t(key as MessageKey) : t('admin.error.other')
  }
}

function NoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.append(meta)
    return () => meta.remove()
  }, [])
  return null
}

export function Admin() {
  const { t } = useI18n()
  const [session, setSession] = useState<Session | null>(savedSession)

  if (!backendReady) {
    return (
      <section>
        <NoIndex />
        <h1>{t('admin.title')}</h1>
        <p class="notice">{t('admin.notSetUp')}</p>
      </section>
    )
  }
  if (!session) {
    return (
      <>
        <NoIndex />
        <Login onSignedIn={setSession} />
      </>
    )
  }
  return (
    <SignedIn session={session} setSession={setSession}>
      <NoIndex />
      <Page />
    </SignedIn>
  )
}

function SignedIn({
  session,
  setSession,
  children,
}: {
  session: Session
  setSession: (session: Session | null) => void
  children: ComponentChildren
}) {
  const { t } = useI18n()
  const errorMessage = useErrorMessage()
  const [state, setState] = useState<State | null>(null)
  const [error, setError] = useState<unknown>(null)

  // One client for the whole visit: it reads the latest session (renewed every hour) through a ref.
  const current = useRef(session)
  current.current = session
  const client = useMemo(() => createClient(() => current.current, setSession), [setSession])

  const refresh = useCallback(async () => {
    try {
      setState(await client.state())
      setError(null)
    } catch (e) {
      // Signed out elsewhere, or the refresh token expired: back to the login form.
      if (e instanceof AuthError || (e instanceof ApiError && e.code === 'signedOut')) setSession(null)
      setError(e)
    }
  }, [client, setSession])

  useEffect(() => {
    refresh()
    const tick = () => document.visibilityState === 'visible' && refresh()
    const timer = setInterval(tick, REFRESH_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [refresh])

  const results = useMemo(() => new Map(state?.results.map((i) => [i.id, i.data])), [state])
  const value = useMemo(
    () => ({ session, client, state, results, refresh }),
    [session, client, state, results, refresh],
  )

  return (
    <AdminContext.Provider value={value}>
      <section class="admin">
        <AdminNav />
        {error !== null && <p class="notice">{errorMessage(error)}</p>}
        {state ? children : error === null && <p class="muted">{t('admin.loading')}</p>}
        <p class="admin-account muted">
          {t('admin.signedInAs', { email: session.email })} ·{' '}
          <button
            type="button"
            class="link-button"
            onClick={() => {
              signOut(session)
              setSession(null)
            }}
          >
            {t('admin.signOut')}
          </button>
        </p>
      </section>
    </AdminContext.Provider>
  )
}

function AdminNav() {
  const { t } = useI18n()
  const { path } = useLocation()
  const links = [
    { href: '/admin', label: t('admin.nav.games'), active: path === '/admin' || path.startsWith('/admin/game') },
    { href: '/admin/news', label: t('admin.nav.news'), active: path.startsWith('/admin/news') },
    { href: '/admin/changes', label: t('admin.nav.changes'), active: path === '/admin/changes' },
  ]
  return (
    <nav class="tabs admin-nav" aria-label={t('admin.title')}>
      {links.map((link) => (
        <a key={link.href} class="tab" href={link.href} aria-current={link.active ? 'page' : undefined}>
          {link.label}
        </a>
      ))}
    </nav>
  )
}

/** Sub-pages, from the part of the path after /admin/. */
function Page() {
  const { params } = useRoute()
  const [section, id] = (params.page ?? '').split('/')
  if (section === 'game' && id) return <GameEntry key={id} id={id} />
  if (section === 'news' && id) return <AnnouncementEditor key={id} id={id} />
  if (section === 'news') return <Announcements />
  if (section === 'changes') return <Changes />
  return <Games />
}
