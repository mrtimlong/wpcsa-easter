// In-memory stand-in for the admin API's AWS side, for tests (api/app.test.ts, src/admin/admin.test.tsx).
import type { Competition, Fixture } from '../src/data/schema.ts'
import { type Change, Conflict, type Deps, type Item, type Kind } from './app.ts'

/** In-memory store with the same version rules as DynamoDB in aws.ts. */
export function fakeDeps(
  fixtures: Fixture[],
  competitions: Competition[],
  now = () => new Date('2027-03-26T09:45:00Z'),
) {
  const items = new Map<string, Item>()
  const changes: Change[] = []
  const published: Record<string, unknown> = {}
  const key = (year: number, kind: Kind, id: string) => `${year}|${kind}|${id}`
  const deps: Deps = {
    tournament: async () => ({ year: 2027, fixtures, competitions }),
    list: async (year, kind) =>
      [...items.entries()].filter(([k]) => k.startsWith(`${year}|${kind}|`)).map(([, item]) => item),
    get: async (year, kind, id) => items.get(key(year, kind, id)),
    write: async (year, kind, id, data, version, change) => {
      const current = items.get(key(year, kind, id))
      if ((current?.version ?? 0) !== version) throw new Conflict(current)
      changes.unshift(change)
      if (data === null) {
        items.delete(key(year, kind, id))
        return 0
      }
      items.set(key(year, kind, id), { id, data, version: version + 1, updatedAt: change.at, updatedBy: change.by })
      return version + 1
    },
    changes: async (_, limit) => changes.slice(0, limit),
    publish: async (name, body) => {
      published[name] = body
    },
    now,
  }
  return { deps, published, changes }
}
