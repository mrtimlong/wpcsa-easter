// Client for the admin API (api/app.ts). Every call sends the signed-in user's ID token.
import type { Change, Item } from '../../api/app.ts'
import type { ResultProblem } from '../data/check-result.ts'
import type { Announcement, Result } from '../data/schema.ts'
import backend from '../generated/backend.json'
import { idToken, type Session } from './auth.ts'

export type { Change, Item }

export type State = { year: number; results: Item<Result>[]; announcements: Item<Announcement>[] }

/** A refused or failed call. `code` is the API's error code, or "network" when there was no answer. */
export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly problems: ResultProblem[]
  /** On a conflict: what's saved now (undefined if it was deleted). */
  readonly current?: Item
  constructor(code: string, status: number, message: string, extra: { problems?: ResultProblem[]; current?: Item }) {
    super(message)
    this.code = code
    this.status = status
    this.problems = extra.problems ?? []
    this.current = extra.current
  }
}

export function createClient(getSession: () => Session, onSession: (session: Session) => void) {
  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const session = await idToken(getSession())
    if (session !== getSession()) onSession(session)
    let response: Response
    try {
      response = await fetch(`${backend.api}${path}`, {
        method,
        headers: {
          authorization: `Bearer ${session.idToken}`,
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch {
      throw new ApiError('network', 0, 'no connection', {})
    }
    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>
    if (!response.ok) {
      const code = typeof json.error === 'string' ? json.error : response.status === 401 ? 'signedOut' : 'serverError'
      throw new ApiError(code, response.status, String(json.message ?? response.statusText), json)
    }
    return json as T
  }

  const path = (collection: string, id: string) => `/${collection}/${encodeURIComponent(id)}`

  return {
    state: () => call<State>('GET', '/state'),
    changes: () => call<{ changes: Change[] }>('GET', '/changes?limit=200').then((r) => r.changes),
    saveResult: (result: Result, version: number) =>
      call<{ version: number }>('PUT', path('results', result.fixture), { data: result, version }),
    deleteResult: (fixture: string, version: number) =>
      call('DELETE', `${path('results', fixture)}?version=${version}`),
    saveAnnouncement: (announcement: Announcement, version: number) =>
      call<{ version: number }>('PUT', path('announcements', announcement.id), { data: announcement, version }),
    deleteAnnouncement: (id: string, version: number) =>
      call('DELETE', `${path('announcements', id)}?version=${version}`),
  }
}

export type Client = ReturnType<typeof createClient>
