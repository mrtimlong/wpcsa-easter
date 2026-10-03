import type { Result } from './schema.ts'

export type Side = 'home' | 'away'

export type Outcome = {
  winner: Side | 'draw'
  /** Scoring units for/against: points (basketball) or sets/games won (volleyball, badminton). */
  home: number
  away: number
  forfeit: boolean
}

/** The decided outcome of a result, or null if the game isn't finished (or was cancelled). */
export function outcome(result: Result | undefined): Outcome | null {
  if (!result) return null
  if (result.status === 'forfeit') {
    if (!result.forfeitBy) return null
    return { winner: other(result.forfeitBy), home: 0, away: 0, forfeit: true }
  }
  if (result.status !== 'final' || !result.score) return null

  let home: number
  let away: number
  if ('sets' in result.score) {
    home = result.score.sets.filter(([h, a]) => h > a).length
    away = result.score.sets.filter(([h, a]) => a > h).length
  } else {
    home = result.score.home
    away = result.score.away
  }
  const winner = home > away ? 'home' : away > home ? 'away' : 'draw'
  return { winner, home, away, forfeit: false }
}

export function other(side: Side): Side {
  return side === 'home' ? 'away' : 'home'
}
