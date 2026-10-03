import { describe, expect, it } from 'vitest'
import { content } from './content.ts'
import { generateDemoResults } from './demo.ts'
import { dayKey, formatTime, scoreSummary } from './format.ts'
import { outcome } from './outcome.ts'
import { resolveSlot } from './resolve.ts'
import { Result } from './schema.ts'

const now = Date.parse('2025-04-20T15:00+02:00')
const results = generateDemoResults(content, now)

describe('demo results', () => {
  it('are deterministic and match the results schema', () => {
    expect(generateDemoResults(content, now)).toEqual(results)
    for (const r of results.values()) expect(Result.safeParse(r).success).toBe(true)
  })

  it('cover games before "now" only, with the last hour live', () => {
    for (const f of content.fixtures) {
      const start = Date.parse(f.start)
      const r = results.get(f.id)
      if (start >= now) expect(r).toBeUndefined()
      else expect(r?.status).toBe(now - start < 3600_000 ? 'live' : 'final')
    }
  })

  it('always produce a winner for finished games, respecting best-of', () => {
    for (const r of results.values()) {
      if (r.status !== 'final') continue
      const o = outcome(r)
      expect(o?.winner).not.toBe('draw')
      const bestOf = content.fixtures.find((f) => f.id === r.fixture)?.format?.bestOf
      if (bestOf) expect(Math.max(o!.home, o!.away)).toBe(Math.ceil(bestOf / 2))
    }
  })

  it('let finished groups fill knockout slots', () => {
    // Jr Mens semi-final (Sunday 11:10) after the group finished on Saturday.
    const semi = content.fixtures.find((f) => f.id === 'bb-039')!
    expect(resolveSlot(semi.home, semi, content, results)).toMatch(/^bb-jr-mens-/)
  })
})

describe('format', () => {
  it('uses the tournament timezone', () => {
    expect(formatTime('2025-04-20T12:30+00:00', 'Africa/Johannesburg')).toBe('14:30')
    expect(dayKey('2025-04-20T23:30+00:00', 'Africa/Johannesburg')).toBe('2025-04-21')
  })

  it('summarises set scores, ignoring a set in progress', () => {
    expect(
      scoreSummary({ fixture: 'x', status: 'live', score: { sets: [[25, 20], [10, 8]] } }),
    ).toEqual({ home: 1, away: 0, detail: '25–20, 10–8' })
  })
})
