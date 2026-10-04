// Results while the app is open: loaded with the rest of the data, then refetched every 30 seconds
// (and when the app comes back to the foreground), so scores entered in /admin show up without a
// reload. results.json is cached for 30 s, so a new score takes up to about a minute to appear.
import { type ComponentChildren, createContext } from 'preact'
import { useContext, useEffect, useRef, useState } from 'preact/hooks'
import { loadResults, publishedResults } from './data/content.ts'
import { combineResults, initialResults } from './data/live.ts'
import type { Result } from './data/schema.ts'

const REFRESH_MS = 30_000

/** How fresh the results on screen are, in real time (not the demo or ?at= clock). */
export type Freshness = {
  /** When the server sent the results we have. */
  servedAt: number
  /** The last refresh couldn't reach the server (or got an old copy from the phone's cache). */
  stale: boolean
}

/** Results older than this (server unreachable for a few refreshes) get a warning. */
export const STALE_MS = 3 * 60_000

// Without a provider (some tests), the results loaded at startup.
const ResultsContext = createContext<Map<string, Result>>(initialResults)
const FreshnessContext = createContext<Freshness>({ servedAt: Date.now(), stale: false })

export function ResultsProvider({ children }: { children: ComponentChildren }) {
  const [results, setResults] = useState(initialResults)
  // Kept apart from the results, so the "updated" line can change without re-rendering every page.
  const [freshness, setFreshness] = useState<Freshness>(() => ({ servedAt: Date.now(), stale: false }))
  const updatedAt = useRef(publishedResults?.updatedAt)

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      loadResults().then(
        ({ results: published, servedAt }) => {
          setFreshness({ servedAt, stale: Date.now() - servedAt > STALE_MS })
          // Only re-render the pages when something was saved since.
          if (published?.updatedAt === updatedAt.current) return
          updatedAt.current = published?.updatedAt
          setResults(combineResults(published))
        },
        () => setFreshness((f) => ({ ...f, stale: Date.now() - f.servedAt > STALE_MS })),
      )
    }
    // Once straight away: the copy loaded at startup may have come from the phone's cache (offline).
    refresh()
    const timer = setInterval(refresh, REFRESH_MS)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  return (
    <ResultsContext.Provider value={results}>
      <FreshnessContext.Provider value={freshness}>{children}</FreshnessContext.Provider>
    </ResultsContext.Provider>
  )
}

/** Results by fixture id, kept up to date while the app is open. */
export function useResults(): Map<string, Result> {
  return useContext(ResultsContext)
}

export function useFreshness(): Freshness {
  return useContext(FreshnessContext)
}
