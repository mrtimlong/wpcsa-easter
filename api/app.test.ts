import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda'
import { describe, expect, it } from 'vitest'
import type { Competition, Fixture } from '../src/data/schema.ts'
import { createApi } from './app.ts'
import { fakeDeps } from './fake.ts'

const fixtures: Fixture[] = [
  {
    id: 'bb-001',
    competition: 'bb-mens',
    stage: 'group',
    start: '2027-03-26T09:00+02:00',
    venue: 'uct',
    home: { team: 'a' },
    away: { team: 'b' },
  },
  {
    id: 'vb-001',
    competition: 'vb',
    stage: 'knockout',
    start: '2027-03-26T10:00+02:00',
    venue: 'uct',
    home: { team: 'c' },
    away: { team: 'd' },
    format: { bestOf: 5 },
  },
]
const competitions: Competition[] = [
  { id: 'bb-mens', sport: 'basketball', name: { en: 'Mens' } },
  { id: 'vb', sport: 'volleyball', name: { en: 'Volleyball' } },
]

function request(
  method: string,
  path: string,
  { body, groups = '[admin]', query }: { body?: unknown; groups?: string; query?: Record<string, string> } = {},
) {
  return {
    rawPath: path,
    body: body === undefined ? undefined : JSON.stringify(body),
    isBase64Encoded: false,
    queryStringParameters: query,
    requestContext: {
      http: { method },
      authorizer: { jwt: { claims: { email: 'scorer@example.com', 'cognito:groups': groups }, scopes: [] } },
    },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer
}

async function call(handler: ReturnType<typeof createApi>, ...args: Parameters<typeof request>) {
  const response = (await handler(request(...args))) as { statusCode: number; body: string }
  return { status: response.statusCode, body: JSON.parse(response.body) }
}

const final = { fixture: 'bb-001', status: 'final', score: { home: 72, away: 65 } }

describe('admin API', () => {
  it('saves a result, records who did it, and publishes results.json without their email', async () => {
    const { deps, published, changes } = fakeDeps(fixtures, competitions)
    const api = createApi(deps)
    const saved = await call(api, 'PUT', '/results/bb-001', { body: { data: final, version: 0 } })
    expect(saved).toMatchObject({ status: 200, body: { version: 1 } })
    expect(published.results).toEqual({
      updatedAt: '2027-03-26T09:45:00.000Z',
      results: [{ ...final, updatedAt: '2027-03-26T09:45:00.000Z' }],
    })
    expect(changes[0]).toMatchObject({ by: 'scorer@example.com', action: 'save', id: 'bb-001', after: final })

    const state = await call(api, 'GET', '/state')
    expect(state.body.results).toMatchObject([{ id: 'bb-001', version: 1, updatedBy: 'scorer@example.com' }])
  })

  it('refuses a change based on an old version, returning what is saved now', async () => {
    const { deps } = fakeDeps(fixtures, competitions)
    const api = createApi(deps)
    await call(api, 'PUT', '/results/bb-001', { body: { data: final, version: 0 } })
    const second = { ...final, score: { home: 70, away: 65 } }
    const response = await call(api, 'PUT', '/results/bb-001', { body: { data: second, version: 0 } })
    expect(response).toMatchObject({ status: 409, body: { error: 'conflict', current: { version: 1 } } })
  })

  it('checks results against the fixture', async () => {
    const api = createApi(fakeDeps(fixtures, competitions).deps)
    const draw = { ...final, score: { home: 60, away: 60 } }
    expect(await call(api, 'PUT', '/results/bb-001', { body: { data: draw, version: 0 } })).toMatchObject({
      status: 400,
      body: { error: 'invalidResult', problems: ['noDraws'] },
    })
    const unknown = { ...final, fixture: 'bb-999' }
    expect((await call(api, 'PUT', '/results/bb-999', { body: { data: unknown, version: 0 } })).status).toBe(404)
    const sets = {
      fixture: 'vb-001',
      status: 'final',
      score: {
        sets: [
          [25, 20],
          [25, 18],
        ],
      },
    }
    expect((await call(api, 'PUT', '/results/vb-001', { body: { data: sets, version: 0 } })).body.problems).toEqual([
      'notDecided',
    ])
    expect(
      (await call(api, 'PUT', '/results/bb-001', { body: { data: { fixture: 'bb-001' }, version: 0 } })).status,
    ).toBe(400)
  })

  it('deletes a result and republishes', async () => {
    const { deps, published } = fakeDeps(fixtures, competitions)
    const api = createApi(deps)
    await call(api, 'PUT', '/results/bb-001', { body: { data: final, version: 0 } })
    expect((await call(api, 'DELETE', '/results/bb-001', { query: { version: '1' } })).status).toBe(200)
    expect(published.results).toMatchObject({ results: [] })
  })

  it('saves announcements and publishes them as a list', async () => {
    const { deps, published } = fakeDeps(fixtures, competitions)
    const api = createApi(deps)
    const post = { id: 'court-move', posted: '2027-03-26T11:00+02:00', title: { en: 'Game 12 moved to Court B' } }
    expect((await call(api, 'PUT', '/announcements/court-move', { body: { data: post, version: 0 } })).status).toBe(200)
    expect(published.announcements).toEqual([post])
  })

  it('only lets super users and scorers in', async () => {
    const api = createApi(fakeDeps(fixtures, competitions).deps)
    expect((await call(api, 'GET', '/state', { groups: '' })).status).toBe(403)
    expect((await call(api, 'GET', '/state', { groups: '[scorer-chess]' })).status).toBe(403)
    expect((await call(api, 'GET', '/state', { groups: '[scorer-padel admin]' })).body.access).toEqual({
      all: true,
      sports: ['padel'],
    })
    expect((await call(api, 'GET', '/nowhere')).status).toBe(404)
    // CORS preflight carries no token.
    expect(await api(request('OPTIONS', '/state', { groups: '' }))).toEqual({ statusCode: 204 })
  })

  it('lets scorers change results for their sports only, and not announcements', async () => {
    const { deps } = fakeDeps(fixtures, competitions)
    const api = createApi(deps)
    const groups = '[scorer-volleyball, scorer-badminton]'
    expect((await call(api, 'GET', '/state', { groups })).body.access).toEqual({
      all: false,
      sports: ['volleyball', 'badminton'],
    })
    expect(await call(api, 'PUT', '/results/bb-001', { groups, body: { data: final, version: 0 } })).toMatchObject({
      status: 403,
      body: { error: 'notYourSport' },
    })
    const sets = { fixture: 'vb-001', status: 'live', score: { sets: [[25, 20]] } }
    expect((await call(api, 'PUT', '/results/vb-001', { groups, body: { data: sets, version: 0 } })).status).toBe(200)
    expect((await call(api, 'DELETE', '/results/vb-001', { groups, query: { version: '1' } })).status).toBe(200)

    // A super user's basketball result can't be cleared by a volleyball scorer.
    await call(api, 'PUT', '/results/bb-001', { body: { data: final, version: 0 } })
    expect((await call(api, 'DELETE', '/results/bb-001', { groups, query: { version: '1' } })).status).toBe(403)
    expect((await call(api, 'DELETE', '/results/nowhere', { groups, query: { version: '1' } })).status).toBe(403)

    const post = { id: 'p', posted: '2027-03-26T11:00+02:00', title: { en: 'Hi' } }
    expect(await call(api, 'PUT', '/announcements/p', { groups, body: { data: post, version: 0 } })).toMatchObject({
      status: 403,
      body: { error: 'superOnly' },
    })
  })

  it('imports announcements when invoked directly', async () => {
    const { deps, published } = fakeDeps(fixtures, competitions)
    const api = createApi(deps)
    await call(api, 'PUT', '/announcements/old', {
      body: { data: { id: 'old', posted: '2027-03-26T11:00+02:00', title: { en: 'Old' } }, version: 0 },
    })
    const post = { id: 'welcome', posted: '2027-03-25T18:00+02:00', title: { en: 'Welcome' } }
    await api({ action: 'import-announcements', announcements: [post] })
    expect(published.announcements).toEqual([post])
  })
})
