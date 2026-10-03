import { describe, expect, it } from 'vitest'
import { outcome } from './outcome.ts'
import { resolveSlot } from './resolve.ts'
import type { Competition, Content, Fixture, Result, Team } from './schema.ts'
import { standings } from './standings.ts'
import { validateContent } from './validate.ts'

const comp: Competition = { id: 'bb', sport: 'basketball', name: { en: 'Test' } }
const teams: Team[] = ['a', 'b', 'c', 'd'].map((id) => ({ id, competition: 'bb', name: id.toUpperCase() }))

let n = 0
function game(home: string, away: string, extra: Partial<Fixture> = {}): Fixture {
  n++
  return {
    id: `g${n}`,
    competition: 'bb',
    stage: 'group',
    start: `2027-03-26T${String(8 + n).padStart(2, '0')}:00+02:00`,
    venue: 'v',
    court: 'c',
    home: { team: home },
    away: { team: away },
    ...extra,
  }
}
const final = (fixture: string, home: number, away: number): Result => ({
  fixture,
  status: 'final',
  score: { home, away },
})
const toMap = (results: Result[]) => new Map(results.map((r) => [r.fixture, r]))

describe('outcome', () => {
  it('ignores unfinished games', () => {
    expect(outcome({ fixture: 'x', status: 'live', score: { home: 10, away: 2 } })).toBeNull()
    expect(outcome(undefined)).toBeNull()
  })

  it('counts sets for volleyball/badminton', () => {
    const o = outcome({ fixture: 'x', status: 'final', score: { sets: [[25, 20], [18, 25], [15, 11]] } })
    expect(o).toEqual({ winner: 'home', home: 2, away: 1, forfeit: false })
  })

  it('awards forfeits to the other side', () => {
    expect(outcome({ fixture: 'x', status: 'forfeit', forfeitBy: 'home' })?.winner).toBe('away')
  })
})

describe('standings', () => {
  it('ranks by points with 2/1 for win/loss and 0 for a forfeit loss', () => {
    n = 0
    const fixtures = [game('a', 'b'), game('c', 'd'), game('a', 'c')]
    const results = toMap([
      final('g1', 60, 50),
      { fixture: 'g2', status: 'forfeit', forfeitBy: 'away' }, // d forfeits
      final('g3', 40, 45),
    ])
    const { rows, complete } = standings(comp, teams, fixtures, results)
    expect(rows.map((r) => [r.team, r.points])).toEqual([
      ['c', 4],
      ['a', 3],
      ['b', 1],
      ['d', 0],
    ])
    expect(complete).toBe(true)
  })

  it('breaks a two-way tie on head-to-head before points difference', () => {
    n = 0
    // a and b both finish 1W 1L; b has the far better diff, but a beat b.
    const fixtures = [game('a', 'b'), game('c', 'a'), game('b', 'd'), game('c', 'd')]
    const results = toMap([
      final('g1', 51, 50),
      final('g2', 60, 10),
      final('g3', 100, 0),
      final('g4', 30, 20),
    ])
    const rows = standings(comp, teams, fixtures, results).rows
    expect(rows.map((r) => r.team)).toEqual(['c', 'a', 'b', 'd'])
  })

  it('falls through to points difference when head-to-head is level', () => {
    n = 0
    // Three-way tie, each 1W 1L, so head-to-head is level too.
    const fixtures = [game('a', 'b'), game('a', 'c'), game('b', 'c')]
    const results = toMap([final('g1', 50, 49), final('g2', 10, 60), final('g3', 80, 20)])
    const rows = standings(comp, teams.slice(0, 3), fixtures, results).rows
    expect(rows.map((r) => [r.team, r.diff])).toEqual([
      ['b', 59],
      ['c', -10],
      ['a', -49],
    ])
  })

  it('reports incomplete groups', () => {
    n = 0
    const fixtures = [game('a', 'b'), game('c', 'd')]
    expect(standings(comp, teams, fixtures, toMap([final('g1', 1, 0)])).complete).toBe(false)
  })
})

describe('resolveSlot', () => {
  n = 0
  const groupGames = [game('a', 'b'), game('c', 'd'), game('a', 'c'), game('b', 'd')]
  const semi = game('a', 'a', { id: 'semi', stage: 'knockout', home: { position: 1 }, away: { position: 2 } })
  const fin = game('a', 'a', { id: 'final', stage: 'knockout', home: { winnerOf: 'semi' }, away: { tbc: { en: 'TBC' } } })
  const content = {
    competitions: [comp],
    teams,
    fixtures: [...groupGames, semi, fin],
  } as unknown as Content

  it('waits for the group to finish', () => {
    expect(resolveSlot(semi.home, semi, content, toMap([final('g1', 2, 1)]))).toBeNull()
  })

  it('fills positions, then winners, from results', () => {
    const results = toMap([
      final('g1', 2, 1), // a beats b
      final('g2', 2, 1), // c beats d
      final('g3', 2, 1), // a beats c
      final('g4', 2, 1), // b beats d
    ])
    // a: 4 pts. b and c: 3 pts, never met, equal diff and points-for, so name order puts b 2nd.
    expect(resolveSlot(semi.home, semi, content, results)).toBe('a')
    expect(resolveSlot(semi.away, semi, content, results)).toBe('b')
    expect(resolveSlot(fin.home, fin, content, results)).toBeNull()
    results.set('semi', final('semi', 1, 3))
    expect(resolveSlot(fin.home, fin, content, results)).toBe('b')
  })
})

describe('validateContent', () => {
  it('reports unknown references and court clashes', () => {
    const content: Content = {
      tournament: {
        year: 2027,
        name: { en: 'T' },
        host: { en: 'H' },
        startDate: '2027-03-26',
        endDate: '2027-03-29',
        timezone: 'Africa/Johannesburg',
      },
      venues: [{ id: 'v', name: { en: 'V' }, courts: [{ id: 'c', name: { en: 'C' } }] }],
      associations: [],
      competitions: [comp],
      teams,
      fixtures: [
        { ...game('a', 'b'), id: 'x1', start: '2027-03-26T09:00+02:00' },
        { ...game('c', 'zz'), id: 'x2', start: '2027-03-26T09:00+02:00' },
        { ...game('a', 'b'), id: 'x3', start: '2027-03-26T12:00+02:00', home: { winnerOf: 'nope' } },
      ],
      programme: [],
      sponsors: [],
    }
    expect(validateContent(content)).toEqual([
      'fixture x2 away: unknown team "zz"',
      'fixture x2: same venue, court and time as x1',
      'fixture x3 home: unknown fixture "nope"',
    ])
  })
})
