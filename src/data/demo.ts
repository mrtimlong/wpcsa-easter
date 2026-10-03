// Demo results so the schedule/results/standings screens can be built before the
// results backend exists. Deterministic: the same seed always gives the same results.
import type { Content, Result, Sport } from './schema.ts'

/** Games that started less than this long before "now" are shown as live. */
const LIVE_WINDOW_MS = 60 * 60 * 1000

/** Small seeded PRNG (mulberry32). */
function seeded(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generateDemoResults(content: Content, now: number, seed = 2025): Map<string, Result> {
  const random = seeded(seed)
  const int = (min: number, max: number) => min + Math.floor(random() * (max - min + 1))
  const sportOf = new Map<string, Sport>(content.competitions.map((c) => [c.id, c.sport]))
  const results = new Map<string, Result>()

  const played = content.fixtures
    .filter((f) => Date.parse(f.start) < now)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))

  for (const f of played) {
    const start = Date.parse(f.start)
    const live = now - start < LIVE_WINDOW_MS
    const sport = sportOf.get(f.competition)
    const score =
      sport === 'basketball'
        ? basketball(int, live)
        : sets(int, random, f.format?.bestOf ?? 3, sport === 'volleyball' ? 25 : 21, sport === 'volleyball', live)
    results.set(f.id, {
      fixture: f.id,
      status: live ? 'live' : 'final',
      score,
      updatedAt: new Date(live ? now : start + 75 * 60_000).toISOString(),
      updatedBy: 'demo',
    })
  }
  return results
}

function basketball(int: (min: number, max: number) => number, live: boolean) {
  let home: number
  let away: number
  do {
    home = int(35, 85)
    away = int(35, 85)
  } while (home === away) // no draws in knockout-style basketball
  return live ? { home: Math.round(home / 2), away: Math.round(away / 2) } : { home, away }
}

/** Volleyball sets (25, deciding set 15) or badminton games (21). */
function sets(
  int: (min: number, max: number) => number,
  random: () => number,
  bestOf: number,
  target: number,
  shortDecider: boolean,
  live: boolean,
) {
  const toWin = Math.ceil(bestOf / 2)
  const homeChance = random() < 0.5 ? 0.65 : 0.35 // one side is the stronger team
  const won = [0, 0]
  const out: [number, number][] = []
  while (won[0] < toWin && won[1] < toWin) {
    const decider = shortDecider && won[0] === toWin - 1 && won[1] === toWin - 1
    const points = decider ? 15 : target
    const winner = random() < homeChance ? 0 : 1
    const loser = int(Math.max(0, points - 14), points - 2)
    out.push(winner === 0 ? [points, loser] : [loser, points])
    won[winner]++
    if (live) {
      out.push([int(2, points - 4), int(2, points - 4)]) // live: one set done, next in progress
      break
    }
  }
  return { sets: out }
}
