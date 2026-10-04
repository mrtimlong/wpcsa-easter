import { describe, expect, it } from 'vitest'
import { checkResult } from './check-result.ts'
import type { Fixture, Result } from './schema.ts'

const fixture = (bestOf?: number): Fixture => ({
  id: 'f',
  competition: 'c',
  stage: 'group',
  start: '2027-03-26T09:00+02:00',
  venue: 'v',
  home: { team: 'a' },
  away: { team: 'b' },
  ...(bestOf ? { format: { bestOf } } : {}),
})
const sets = (status: Result['status'], ...s: [number, number][]): Result => ({
  fixture: 'f',
  status,
  score: { sets: s },
})

describe('checkResult', () => {
  it('accepts a decided basketball game and refuses a draw', () => {
    const result: Result = { fixture: 'f', status: 'final', score: { home: 70, away: 64 } }
    expect(checkResult(result, fixture(), 'basketball')).toEqual([])
    expect(checkResult({ ...result, score: { home: 64, away: 64 } }, fixture(), 'basketball')).toEqual(['noDraws'])
    // Level during the game is fine.
    expect(checkResult({ ...result, status: 'live', score: { home: 4, away: 4 } }, fixture(), 'basketball')).toEqual([])
  })

  it('needs sets for volleyball and points for basketball', () => {
    expect(checkResult(sets('final', [25, 20], [25, 18]), fixture(), 'basketball')).toEqual(['wrongScoreKind'])
  })

  it('checks sets against best-of', () => {
    expect(checkResult(sets('final', [25, 20], [25, 18]), fixture(3), 'volleyball')).toEqual([])
    expect(checkResult(sets('final', [25, 20], [18, 25]), fixture(3), 'volleyball')).toEqual(['notDecided'])
    expect(checkResult(sets('final', [25, 20], [25, 18], [25, 10]), fixture(3), 'volleyball')).toEqual(['setsAfterWin'])
    expect(checkResult(sets('final', [25, 20], [25, 25], [25, 10]), fixture(5), 'volleyball')).toContain('setTied')
    expect(checkResult(sets('final', [21, 10], [21, 12]), fixture(), 'badminton')).toEqual([])
  })

  it('allows a live set to be level', () => {
    expect(checkResult(sets('live', [25, 20], [12, 12]), fixture(3), 'volleyball')).toEqual([])
    expect(checkResult(sets('live', [25, 25], [12, 12]), fixture(3), 'volleyball')).toEqual(['setTied'])
  })

  it('needs a side for a forfeit and nothing for a cancellation', () => {
    expect(checkResult({ fixture: 'f', status: 'forfeit' }, fixture(), 'basketball')).toEqual(['forfeitSide'])
    expect(checkResult({ fixture: 'f', status: 'forfeit', forfeitBy: 'away' }, fixture(), 'basketball')).toEqual([])
    expect(checkResult({ fixture: 'f', status: 'cancelled' }, fixture(), 'basketball')).toEqual([])
    expect(checkResult({ fixture: 'f', status: 'final' }, fixture(), 'basketball')).toEqual(['scoreNeeded'])
  })
})
