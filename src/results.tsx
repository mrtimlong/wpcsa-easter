// Results while the app is open: loaded with the rest of the data, then refetched every 30 seconds
// (and when the app comes back to the foreground), so scores entered in /admin show up without a
// reload. results.json is cached for 30 s, so a new score takes up to about a minute to appear.
import { type ComponentChildren, createContext } from 'preact'
import { useContext, useEffect, useRef, useState } from 'preact/hooks'
import { loadResults, publishedResults } from './data/content.ts'
import { combineResults, initialResults } from './data/live.ts'
import type { Result } from './data/schema.ts'

const REFRESH_MS = 30_000

// Without a provider (some tests), the results loaded at startup.
const ResultsContext = createContext<Map<string, Result>>(initialResults)

export function ResultsProvider({ children }: { children: ComponentChildren }) {
  const [results, setResults] = useState(initialResults)
  const updatedAt = useRef(publishedResults?.updatedAt)

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      loadResults().then(
        (published) => {
          // Only re-render when something was saved since.
          if (published?.updatedAt === updatedAt.current) return
          updatedAt.current = published?.updatedAt
          setResults(combineResults(published))
        },
        () => {}, // offline: keep what we have
      )
    }
    const timer = setInterval(refresh, REFRESH_MS)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  return <ResultsContext.Provider value={results}>{children}</ResultsContext.Provider>
}

/** Results by fixture id, kept up to date while the app is open. */
export function useResults(): Map<string, Result> {
  return useContext(ResultsContext)
}
