import { other, outcome } from './outcome.ts'
import type { Content, Fixture, Result, Slot } from './schema.ts'
import { standings } from './standings.ts'

/**
 * The team id that fills a slot, or null if it can't be known yet
 * (the referenced game isn't finished, or the group isn't complete).
 */
export function resolveSlot(
  slot: Slot,
  fixture: Fixture,
  content: Content,
  results: Map<string, Result>,
  seen: Set<string> = new Set(),
): string | null {
  if ('team' in slot) return slot.team
  if ('tbc' in slot) return null

  if ('winnerOf' in slot || 'loserOf' in slot) {
    const refId = 'winnerOf' in slot ? slot.winnerOf : slot.loserOf
    if (seen.has(refId)) return null // guard against circular references in content
    const ref = content.fixtures.find((f) => f.id === refId)
    const o = outcome(results.get(refId))
    if (!ref || !o || o.winner === 'draw') return null
    const side = 'winnerOf' in slot ? o.winner : other(o.winner)
    return resolveSlot(ref[side], ref, content, results, new Set(seen).add(refId))
  }

  const competition = content.competitions.find((c) => c.id === fixture.competition)
  if (!competition) return null
  const table = standings(competition, content.teams, content.fixtures, results, slot.group)
  if (!table.complete) return null
  return table.rows[slot.position - 1]?.team ?? null
}
