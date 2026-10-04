// Checks that a result makes sense for its game, before it's saved. Shared by the admin screens
// (to explain what's wrong) and the results API (which refuses anything that fails).
import type { Fixture, Result, Sport } from './schema.ts'

/** What's wrong with a result. Each has an `admin.problem.<code>` message. */
export type ResultProblem =
  | 'wrongScoreKind'
  | 'scoreNeeded'
  | 'noDraws'
  | 'forfeitSide'
  | 'setTied'
  | 'tooManySets'
  | 'notDecided'
  | 'setsAfterWin'

/** Sports scored in sets (volleyball) or games (badminton, padel); the rest in points. */
export function scoredInSets(sport: Sport): boolean {
  return sport === 'volleyball' || sport === 'badminton' || sport === 'padel'
}

/** Best-of for a set-scored game (3 unless the fixture says otherwise). */
export function bestOf(fixture: Fixture): number {
  return fixture.format?.bestOf ?? 3
}

export function checkResult(result: Result, fixture: Fixture, sport: Sport): ResultProblem[] {
  const { status, score } = result
  if (status === 'forfeit') return result.forfeitBy ? [] : ['forfeitSide']
  if (status === 'cancelled') return []
  if (!score) return status === 'final' ? ['scoreNeeded'] : []
  if ('sets' in score !== scoredInSets(sport)) return ['wrongScoreKind']

  if (!('sets' in score)) return status === 'final' && score.home === score.away ? ['noDraws'] : []

  const problems: ResultProblem[] = []
  const toWin = Math.ceil(bestOf(fixture) / 2)
  // A live game's last set may still be level (it's in progress); every other set needs a winner.
  const finished = status === 'live' ? score.sets.slice(0, -1) : score.sets
  if (finished.some(([h, a]) => h === a)) problems.push('setTied')
  if (score.sets.length > bestOf(fixture)) problems.push('tooManySets')

  const won = [0, 0]
  for (const [i, [h, a]] of finished.entries()) {
    if (Math.max(...won) >= toWin) {
      problems.push('setsAfterWin')
      break
    }
    if (h !== a) won[h > a ? 0 : 1]++
    const last = i === finished.length - 1
    if (last && status === 'final' && Math.max(...won) < toWin && !problems.includes('setTied')) {
      problems.push('notDecided')
    }
  }
  if (status === 'final' && !score.sets.length) problems.push('scoreNeeded')
  return problems
}
