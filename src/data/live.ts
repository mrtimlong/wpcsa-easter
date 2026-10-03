// Results and "now" for the app. Until the results backend exists this runs in demo mode:
// 2025 fixtures with random results, as if it were Sunday afternoon of the tournament.
// TODO: replace with a hook that fetches /data/results.json (and uses the real clock).
import { content } from './content.ts'
import { generateDemoResults } from './demo.ts'
import type { Result } from './schema.ts'

export const DEMO = true

export const now: number = DEMO ? Date.parse('2025-04-20T15:00+02:00') : Date.now()

export const results: Map<string, Result> = DEMO
  ? generateDemoResults(content, now)
  : new Map<string, Result>()
