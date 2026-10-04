// The admin API: results and announcements entered in /admin. Runs as one Lambda behind an HTTP API
// whose JWT authorizer has already checked the Cognito sign-in; this checks the admin group, validates
// each change against the published fixtures, saves it (refusing it if someone else changed the same
// thing meanwhile), records who did what, and republishes results.json or announcements.json.
//
//   GET    /state                       everything saved, with versions
//   PUT    /results/{fixture}           body { data: Result, version }  (version 0 = new)
//   DELETE /results/{fixture}?version=n
//   PUT    /announcements/{id}          body { data: Announcement, version }
//   DELETE /announcements/{id}?version=n
//   GET    /changes                     the latest audit entries
//
// AWS access is in deps (aws.ts), so this file is tested with in-memory fakes (app.test.ts).
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { checkResult } from '../src/data/check-result.ts'
import { Announcement, type Competition, type Fixture, Result } from '../src/data/schema.ts'

export type Kind = 'result' | 'announcement'

export type Item<T = unknown> = { id: string; data: T; version: number; updatedAt: string; updatedBy: string }

export type Change = {
  at: string
  by: string
  kind: Kind
  id: string
  action: 'save' | 'delete'
  before?: unknown
  after?: unknown
}

/** Thrown by the store when the item's version isn't the one the change was based on. */
export class Conflict extends Error {
  readonly current: Item | undefined
  constructor(current: Item | undefined) {
    super('conflict')
    this.current = current
  }
}

export type Deps = {
  /** The published tournament data the API checks against. */
  tournament(): Promise<{ year: number; fixtures: Fixture[]; competitions: Competition[] }>
  list(year: number, kind: Kind): Promise<Item[]>
  get(year: number, kind: Kind, id: string): Promise<Item | undefined>
  /** Saves (data) or deletes (null) an item if it's still at `version` (0: doesn't exist), and records the change. */
  write(year: number, kind: Kind, id: string, data: unknown, version: number, change: Change): Promise<number>
  changes(year: number, limit: number): Promise<Change[]>
  /** Writes data/<name>.json for the public site. */
  publish(name: 'results' | 'announcements', body: unknown): Promise<void>
  now(): Date
}

/** Invoked directly (aws lambda invoke) by Tim, never through the API. */
export type AdminEvent =
  | { action: 'publish' }
  /** Loads announcements.json from a data folder, replacing what's saved. */
  | { action: 'import-announcements'; announcements: unknown[] }

type Response = APIGatewayProxyStructuredResultV2

const json = (statusCode: number, body: unknown): Response => ({
  statusCode,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  body: JSON.stringify(body),
})

/** Error responses carry a code the admin screens translate, plus English for logs and curl. */
const fail = (statusCode: number, code: string, message: string, extra?: object) =>
  json(statusCode, { error: code, message, ...extra })

const ADMIN_GROUP = 'admin'

/** Claims arrive as strings; a list looks like "[admin scorer]" or "[admin, scorer]". */
function groups(claims: Record<string, unknown>): string[] {
  return String(claims['cognito:groups'] ?? '')
    .replace(/[[\]]/g, '')
    .split(/[\s,]+/)
    .filter(Boolean)
}

export function createApi(deps: Deps) {
  async function republish(year: number, kind: Kind) {
    const items = await deps.list(year, kind)
    if (kind === 'result') {
      // updatedBy stays out of the public file: it's an email address.
      const results = items.map((i) => ({ ...(i.data as Result), updatedAt: i.updatedAt }))
      await deps.publish('results', { updatedAt: deps.now().toISOString(), results })
    } else {
      await deps.publish(
        'announcements',
        items.map((i) => i.data as Announcement),
      )
    }
  }

  async function save(kind: Kind, id: string, body: unknown, by: string): Promise<Response> {
    const { year, fixtures, competitions } = await deps.tournament()
    const request = (body ?? {}) as { data?: unknown; version?: unknown }
    const version = request.version
    if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) {
      return fail(400, 'badRequest', 'version must be a whole number (0 for a new item)')
    }
    const schema = kind === 'result' ? Result : Announcement
    const parsed = schema.safeParse(request.data)
    if (!parsed.success) return fail(400, 'badRequest', parsed.error.message)

    const now = deps.now().toISOString()
    let data: Result | Announcement
    if (kind === 'result') {
      const result = parsed.data as Result
      if (result.fixture !== id) return fail(400, 'badRequest', 'fixture doesn’t match the URL')
      const fixture = fixtures.find((f) => f.id === id)
      if (!fixture) return fail(404, 'unknownFixture', `no fixture ${id} in the published fixtures`)
      const sport = competitions.find((c) => c.id === fixture.competition)?.sport
      if (!sport) return fail(404, 'unknownFixture', `fixture ${id} has no known competition`)
      const problems = checkResult(result, fixture, sport)
      if (problems.length) return fail(400, 'invalidResult', problems.join(', '), { problems })
      const { updatedBy: _, ...rest } = result
      data = { ...rest, updatedAt: now }
    } else {
      const announcement = parsed.data as Announcement
      if (announcement.id !== id) return fail(400, 'badRequest', 'id doesn’t match the URL')
      data = announcement
    }

    const before = version ? (await deps.get(year, kind, id))?.data : undefined
    try {
      const saved = await deps.write(year, kind, id, data, version, {
        at: now,
        by,
        kind,
        id,
        action: 'save',
        before,
        after: data,
      })
      await republish(year, kind)
      return json(200, { data, version: saved, updatedAt: now })
    } catch (error) {
      if (error instanceof Conflict)
        return fail(409, 'conflict', 'someone else changed this', { current: error.current })
      throw error
    }
  }

  async function remove(kind: Kind, id: string, version: number, by: string): Promise<Response> {
    if (!Number.isInteger(version) || version < 1) return fail(400, 'badRequest', 'version must be given')
    const { year } = await deps.tournament()
    const before = (await deps.get(year, kind, id))?.data
    const now = deps.now().toISOString()
    try {
      await deps.write(year, kind, id, null, version, { at: now, by, kind, id, action: 'delete', before })
      await republish(year, kind)
      return json(200, { deleted: id })
    } catch (error) {
      if (error instanceof Conflict)
        return fail(409, 'conflict', 'someone else changed this', { current: error.current })
      throw error
    }
  }

  async function route(event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<Response> {
    // CORS preflight (no token, no authorizer): API Gateway adds the allowed origins and headers.
    if (event.requestContext.http.method === 'OPTIONS') return { statusCode: 204 }
    const claims = event.requestContext.authorizer?.jwt?.claims ?? {}
    if (!groups(claims).includes(ADMIN_GROUP)) return fail(403, 'forbidden', 'not in the admin group')
    const by = String(claims.email ?? claims['cognito:username'] ?? claims.sub ?? 'unknown')

    const method = event.requestContext.http.method
    const [collection, id, ...rest] = event.rawPath.split('/').filter(Boolean).map(decodeURIComponent)
    const kind = ({ results: 'result', announcements: 'announcement' } as const)[collection as string]

    if (method === 'GET' && collection === 'state' && !id) {
      const { year } = await deps.tournament()
      const [results, announcements] = await Promise.all([deps.list(year, 'result'), deps.list(year, 'announcement')])
      return json(200, { year, results, announcements })
    }
    if (method === 'GET' && collection === 'changes' && !id) {
      const { year } = await deps.tournament()
      const limit = Math.min(Number(event.queryStringParameters?.limit) || 100, 500)
      return json(200, { changes: await deps.changes(year, limit) })
    }
    if (kind && id && !rest.length) {
      if (method === 'PUT') {
        let body: unknown
        try {
          body = JSON.parse(event.isBase64Encoded ? atob(event.body ?? '') : (event.body ?? ''))
        } catch {
          return fail(400, 'badRequest', 'body must be JSON')
        }
        return save(kind, id, body, by)
      }
      if (method === 'DELETE') return remove(kind, id, Number(event.queryStringParameters?.version), by)
    }
    return fail(404, 'notFound', `${method} ${event.rawPath} isn’t an API route`)
  }

  async function admin(event: AdminEvent): Promise<unknown> {
    const { year } = await deps.tournament()
    if (event.action === 'import-announcements') {
      const announcements = event.announcements.map((a) => Announcement.parse(a))
      const now = deps.now().toISOString()
      for (const old of await deps.list(year, 'announcement')) {
        await deps.write(year, 'announcement', old.id, null, old.version, {
          at: now,
          by: 'import',
          kind: 'announcement',
          id: old.id,
          action: 'delete',
          before: old.data,
        })
      }
      for (const a of announcements) {
        await deps.write(year, 'announcement', a.id, a, 0, {
          at: now,
          by: 'import',
          kind: 'announcement',
          id: a.id,
          action: 'save',
          after: a,
        })
      }
    }
    await republish(year, 'result')
    await republish(year, 'announcement')
    return { ok: true, year }
  }

  return async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer | AdminEvent) {
    if ('action' in event) return admin(event)
    try {
      return await route(event)
    } catch (error) {
      console.error(error)
      return fail(500, 'serverError', 'something went wrong; try again')
    }
  }
}
