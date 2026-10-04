// Results and "now" for the app. Real results come from results.json, written by the admin API
// whenever someone saves in /admin, and are refetched while the app is open (results.tsx).
// Sample data sets tournament.demo: the clock reads demo.now and random results fill in the games
// before it, with real results from /admin on top, so the demo can be used to try out results entry.
// Either way, ?at= sets the clock for testing (see readClockOverride).
import { content, publishedResults } from './content.ts'
import { generateDemoResults } from './demo.ts'
import { fromLocalInput } from './format.ts'
import type { Result, Results } from './schema.ts'

const demo = content.tournament.demo

export const DEMO = demo !== undefined

const CLOCK_KEY = 'clockAt'

/**
 * For testing: ?at=2027-03-27T14:00 (tournament time, or any ISO date-time with an offset) shows the
 * app as if it were then, frozen, until ?at= or "Back to now". Kept for the browser tab's session.
 */
function readClockOverride(): number | undefined {
  try {
    const param = new URLSearchParams(location.search).get('at')
    if (param === '') sessionStorage.removeItem(CLOCK_KEY)
    else if (param) sessionStorage.setItem(CLOCK_KEY, param)
    const value = sessionStorage.getItem(CLOCK_KEY)
    if (!value) return undefined
    const iso = /(Z|[+-]\d\d:\d\d)$/i.test(value) ? value : fromLocalInput(value, content.tournament.timezone)
    const time = Date.parse(iso)
    return Number.isNaN(time) ? undefined : time
  } catch {
    return undefined // no storage: just the real time
  }
}

/** The "as if" time set with ?at=, if any. */
export const clockOverride: number | undefined = readClockOverride()

/** Ends the "as if" time and reloads at the real time. */
export function resetClock() {
  try {
    sessionStorage.removeItem(CLOCK_KEY)
  } catch {
    // Nothing stored.
  }
  location.replace(location.pathname)
}

export const now: number = clockOverride ?? (demo ? Date.parse(demo.now) : Date.now())

/** The time now (frozen with ?at= or in demo mode), for things that change while the app is open. */
export function currentTime(): number {
  return clockOverride ?? (demo ? Date.parse(demo.now) : Date.now())
}

const demoResults: Map<string, Result> = demo ? generateDemoResults(content, now, demo.seed) : new Map()

/** Results by fixture id: the published ones, over the demo's random ones in demo mode. */
export function combineResults(published: Results | undefined): Map<string, Result> {
  const results = new Map(demoResults)
  for (const result of published?.results ?? []) results.set(result.fixture, result)
  return results
}

/** Results as loaded at startup. Components use useResults() (results.tsx), which stays up to date. */
export const initialResults: Map<string, Result> = combineResults(publishedResults)
