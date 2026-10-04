import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { combineResults, initialResults } from './data/live.ts'
import { ResultsProvider, useResults } from './results.tsx'

const dataFetch = globalThis.fetch

afterEach(() => {
  cleanup()
  vi.stubGlobal('fetch', dataFetch)
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
})
