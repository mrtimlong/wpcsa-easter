import { describe, expect, it } from 'vitest'
import type { Fixture, Result } from '../data/schema.ts'
import { streamLink } from './fixture-card.tsx'

const fixture: Fixture = {
  id: 'bb-045',
  competition: 'bb-mens',
  stage: 'group',
  start: '2027-03-26T10:00+02:00',
  venue: 'uct',
  home: { team: 'a' },
  away: { team: 'b' },
  stream: 'https://example.com/live',
  replay: 'https://example.com/replay',
}
const at = (time: string) => Date.parse(`2027-03-26T${time}+02:00`)
const result = (status: Result['status']): Result => ({ fixture: 'bb-045', status })

describe('streamLink', () => {
  it('links the stream before and during the game, then the replay', () => {
    expect(streamLink(fixture, undefined, at('09:00'))).toEqual({ href: 'https://example.com/live', state: 'upcoming' })
    expect(streamLink(fixture, undefined, at('10:05'))?.state).toBe('live')
    expect(streamLink(fixture, result('live'), at('09:58'))?.state).toBe('live')
    expect(streamLink(fixture, result('final'), at('11:30'))).toEqual({
      href: 'https://example.com/replay',
      state: 'replay',
    })
    // No result entered: over three hours after the start.
    expect(streamLink(fixture, undefined, at('13:00'))?.state).toBe('replay')
  })

  it('shows nothing once it’s over without a replay, or with no links at all', () => {
    const { replay: _, ...noReplay } = fixture
    expect(streamLink(noReplay, result('final'), at('11:30'))).toBeUndefined()
    expect(streamLink(noReplay, result('live'), at('10:30'))?.state).toBe('live')
    const { stream: __, ...replayOnly } = fixture
    expect(streamLink(replayOnly, undefined, at('10:30'))).toBeUndefined()
    expect(streamLink(replayOnly, result('final'), at('11:30'))?.state).toBe('replay')
  })
})
