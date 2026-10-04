// Results and "now" for the app. Real results come from results.json, written by the admin API
// whenever someone saves in /admin, and are refetched while the app is open (results.tsx).
// Sample data sets tournament.demo: the clock reads demo.now and random results fill in the games
// before it, with real results from /admin on top, so the demo can be used to try out results entry.
import { content, publishedResults } from './content.ts'
import { generateDemoResults } from './demo.ts'
import type { Result, Results } from './schema.ts'

const demo = content.tournament.demo

export const DEMO = demo !== undefined

export const now: number = demo ? Date.parse(demo.now) : Date.now()

/** The time now (frozen at demo.now in demo mode), for things that change while the app is open. */
export function currentTime(): number {
  return demo ? Date.parse(demo.now) : Date.now()
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
