import { outcome } from './outcome.ts'
import type { Competition, Fixture, Result, StandingsRules, Team } from './schema.ts'

export const DEFAULT_RULES: Required<StandingsRules> = {
  win: 2,
  loss: 1,
  draw: 1,
  forfeitLoss: 0,
  tiebreak: ['headToHead', 'diff', 'for'],
}

export type StandingRow = {
  team: string
  played: number
  won: number
  drawn: number
  lost: number
  for: number
  against: number
  diff: number
  points: number
}

export type Standings = {
  rows: StandingRow[]
  /** True once every group game has a decided (or cancelled) result. */
  complete: boolean
}

type Game = { home: string; away: string; fixture: Fixture }

/** Standings for a competition, or one group within it. Only group-stage games between known teams count. */
export function standings(
  competition: Competition,
  teams: Team[],
  fixtures: Fixture[],
  results: Map<string, Result>,
  group?: string,
): Standings {
  const rules = { ...DEFAULT_RULES, ...competition.rules }
  const groupTeams = teams.filter((t) => t.competition === competition.id && (group === undefined || t.group === group))
  const games: Game[] = fixtures.flatMap((f) =>
    f.competition === competition.id &&
    f.stage === 'group' &&
    (group === undefined || f.group === group) &&
    'team' in f.home &&
    'team' in f.away
      ? [{ home: f.home.team, away: f.away.team, fixture: f }]
      : [],
  )

  const table = tally(
    groupTeams.map((t) => t.id),
    games,
    results,
    rules,
  )
  const names = new Map(teams.map((t) => [t.id, t.name]))
  const rows = rank(table, games, results, rules, rules.tiebreak, names)

  const complete = games.every((g) => {
    const r = results.get(g.fixture.id)
    return r?.status === 'cancelled' || outcome(r) !== null
  })
  return { rows, complete }
}

function tally(
  teamIds: string[],
  games: Game[],
  results: Map<string, Result>,
  rules: Required<StandingsRules>,
): StandingRow[] {
  const rows = new Map(
    teamIds.map((team) => [
      team,
      { team, played: 0, won: 0, drawn: 0, lost: 0, for: 0, against: 0, diff: 0, points: 0 },
    ]),
  )
  for (const g of games) {
    const o = outcome(results.get(g.fixture.id))
    const home = rows.get(g.home)
    const away = rows.get(g.away)
    if (!o || !home || !away) continue
    home.played++
    away.played++
    home.for += o.home
    home.against += o.away
    away.for += o.away
    away.against += o.home
    if (o.winner === 'draw') {
      home.drawn++
      away.drawn++
      home.points += rules.draw
      away.points += rules.draw
    } else {
      const [w, l] = o.winner === 'home' ? [home, away] : [away, home]
      w.won++
      l.lost++
      w.points += rules.win
      l.points += o.forfeit ? rules.forfeitLoss : rules.loss
    }
  }
  for (const row of rows.values()) row.diff = row.for - row.against
  return [...rows.values()]
}

/** Sort by points, then apply tiebreakers in order to each set of tied teams. */
function rank(
  rows: StandingRow[],
  games: Game[],
  results: Map<string, Result>,
  rules: Required<StandingsRules>,
  tiebreaks: Required<StandingsRules>['tiebreak'],
  names: Map<string, string>,
): StandingRow[] {
  return breakTies(
    rows,
    (r) => r.points,
    (tied) => {
      const [tiebreak, ...rest] = tiebreaks
      if (!tiebreak) {
        return [...tied].sort((a, b) => (names.get(a.team) ?? a.team).localeCompare(names.get(b.team) ?? b.team))
      }
      const next = (group: StandingRow[]) => rank(group, games, results, rules, rest, names)
      if (tiebreak === 'headToHead') {
        const ids = new Set(tied.map((r) => r.team))
        const mini = tally(
          [...ids],
          games.filter((g) => ids.has(g.home) && ids.has(g.away)),
          results,
          rules,
        )
        const miniPoints = new Map(mini.map((r) => [r.team, r.points]))
        return breakTies(tied, (r) => miniPoints.get(r.team) ?? 0, next)
      }
      return breakTies(tied, (r) => r[tiebreak], next)
    },
  )
}

/** Sorts rows by key (descending) and hands each run of equal keys to resolve. */
function breakTies(
  rows: StandingRow[],
  key: (row: StandingRow) => number,
  resolve: (tied: StandingRow[]) => StandingRow[],
): StandingRow[] {
  const sorted = [...rows].sort((a, b) => key(b) - key(a))
  const out: StandingRow[] = []
  for (let i = 0; i < sorted.length; ) {
    let j = i + 1
    while (j < sorted.length && key(sorted[j]) === key(sorted[i])) j++
    const run = sorted.slice(i, j)
    out.push(...(run.length > 1 ? resolve(run) : run))
    i = j
  }
  return out
}
