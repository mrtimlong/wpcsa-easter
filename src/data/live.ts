// Results and "now" for the app. Sample data sets tournament.demo, which generates random results
// as if the clock read demo.now; real data uses results.json from the results backend.
// TODO: poll results.json during the event instead of reading it once at startup.
import { content, publishedResults } from './content.ts'
import { generateDemoResults } from './demo.ts'
import type { Result } from './schema.ts'

const demo = content.tournament.demo

export const DEMO = demo !== undefined

export const now: number = demo ? Date.parse(demo.now) : Date.now()

export const results: Map<string, Result> = demo
  ? generateDemoResults(content, now, demo.seed)
  : new Map(publishedResults?.results.map((r) => [r.fixture, r]))
