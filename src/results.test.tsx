import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ResultsUpdated } from './components/results-updated.tsx'
import { combineResults, initialResults } from './data/live.ts'
import { I18nProvider } from './i18n/index.tsx'
import { ResultsProvider, useResults } from './results.tsx'

const dataFetch = globalThis.fetch

afterEach(() => {
  cleanup()
  vi.stubGlobal('fetch', dataFetch)
  sessionStorage.clear()
  history.replaceState(null, '', '/')
})

describe('results', () => {
  it('puts published results over the demo’s random ones', () => {
    // Sample data is a demo: game bb-001 (Friday) has a random result.
    expect(initialResults.get('bb-001')?.updatedBy).toBe('demo')
    const published = { fixture: 'bb-001', status: 'final' as const, score: { home: 1, away: 0 } }
    const results = combineResults({ results: [published] })
    expect(results.get('bb-001')).toEqual(published)
    expect(results.size).toBe(initialResults.size)
  })

  it('refetches results.json while the app is open', async () => {
    function Status() {
      return <p>{useResults().get('bb-068')?.status ?? 'none'}</p>
    }
    render(
      <ResultsProvider>
        <Status />
      </ResultsProvider>,
    )
    expect(screen.getByText('none')).toBeTruthy() // the final is on Monday, after the demo's "now"

    vi.stubGlobal('fetch', async (input: string) =>
      input === '/data/results.json'
        ? Response.json({
            updatedAt: '2027-03-29T12:00:00Z',
            results: [{ fixture: 'bb-068', status: 'live', score: { home: 10, away: 8 } }],
          })
        : dataFetch(input),
    )
    document.dispatchEvent(new Event('visibilitychange')) // as when the app comes back to the foreground
    expect(await screen.findByText('live')).toBeTruthy()
  })

  it('says when the results are fresh, and warns when they are out of date', async () => {
    let served = new Date()
    vi.stubGlobal('fetch', async (input: string) =>
      input === '/data/results.json'
        ? new Response(JSON.stringify({ results: [] }), { headers: { date: served.toUTCString() } })
        : dataFetch(input),
    )
    const view = () =>
      render(
        <I18nProvider>
          <ResultsProvider>
            <ResultsUpdated />
          </ResultsProvider>
        </I18nProvider>,
      )
    view()
    expect(await screen.findByText('Updated just now')).toBeTruthy()
    cleanup()

    // Offline: the service worker answers with a copy from 10 minutes ago.
    served = new Date(Date.now() - 10 * 60_000)
    view()
    expect(await screen.findByText(/^Can’t reach the server/)).toBeTruthy()
  })

  it('shows the app as if it were another time with ?at=, until Back to now', async () => {
    history.replaceState(null, '', '/schedule?at=2025-04-17T12:00')
    vi.resetModules()
    const { App } = await import('./app.tsx')
    render(<App />)
    // The day before the sample tournament: no demo results yet, so no scores and no Now.
    expect(await screen.findByRole('heading', { name: 'Friday, 18 April' })).toBeTruthy()
    expect(document.querySelector('.fixture-score')).toBeNull()
    expect(document.querySelector('.now-marker')).toBeNull()
    expect(screen.getByText(/^Showing the app as if it were Thursday, 17 April/)).toBeTruthy()
    expect(sessionStorage.getItem('clockAt')).toBe('2025-04-17T12:00')
  })
})
