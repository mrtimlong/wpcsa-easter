// The admin screens end to end: the real API code (api/app.ts) with in-memory storage, and a
// stand-in for Cognito's sign-in.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApi } from '../../api/app.ts'
import { fakeDeps } from '../../api/fake.ts'
import { App } from '../app.tsx'
import { content } from '../data/content.ts'

vi.mock('../generated/backend.json', () => ({
  default: { region: 'af-south-1', clientId: 'test-client', api: 'https://api.test' },
}))

const COGNITO = 'https://cognito-idp.af-south-1.amazonaws.com/'
const token = `x.${btoa(JSON.stringify({ email: 'scorer@example.com' })).replace(/=+$/, '')}.x`

let fake: ReturnType<typeof fakeDeps>
/** The signed-in user's Cognito groups, as the API's authorizer passes them on. */
let groups = '[admin]'
const dataFetch = globalThis.fetch

beforeEach(() => {
  fake = fakeDeps(content.fixtures, content.competitions)
  const api = createApi(fake.deps)
  vi.stubGlobal('fetch', async (input: string, init: RequestInit = {}) => {
    if (input === COGNITO) {
      const { AuthParameters } = JSON.parse(String(init.body))
      if (AuthParameters?.PASSWORD === 'wrong') {
        return Response.json({ __type: 'NotAuthorizedException', message: 'Incorrect' }, { status: 400 })
      }
      return Response.json({ AuthenticationResult: { IdToken: token, RefreshToken: 'refresh', ExpiresIn: 3600 } })
    }
    if (input.startsWith('https://api.test/')) {
      const url = new URL(input)
      const response = (await api({
        rawPath: url.pathname,
        queryStringParameters: Object.fromEntries(url.searchParams),
        body: init.body as string | undefined,
        isBase64Encoded: false,
        requestContext: {
          http: { method: init.method ?? 'GET' },
          authorizer: { jwt: { claims: { email: 'scorer@example.com', 'cognito:groups': groups }, scopes: [] } },
        },
      } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer)) as { statusCode: number; body: string }
      return new Response(response.body, { status: response.statusCode })
    }
    return dataFetch(input, init)
  })
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  groups = '[admin]'
  vi.stubGlobal('fetch', dataFetch)
  history.replaceState(null, '', '/')
})

async function signIn(password = 'correct horse') {
  history.replaceState(null, '', '/admin')
  render(<App />)
  fireEvent.input(await screen.findByLabelText('Email'), { target: { value: 'scorer@example.com' } })
  fireEvent.input(screen.getByLabelText('Password'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('admin', () => {
  it('refuses a wrong password', async () => {
    await signIn('wrong')
    expect(await screen.findByText('Wrong email or password.')).toBeTruthy()
  })

  it('enters a basketball result, checking it first', async () => {
    await signIn()
    expect(await screen.findByRole('heading', { name: 'Enter results' })).toBeTruthy()
    // No tab bar or sponsors in admin.
    expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull()

    fireEvent.input(screen.getByPlaceholderText('Game number or team'), { target: { value: '1' } })
    fireEvent.click(document.querySelector('a[href="/admin/game/bb-001"]')!)
    expect(await screen.findByRole('heading', { name: /^Game 1: / })).toBeTruthy()

    const [home, away] = screen.getAllByRole('textbox')
    fireEvent.input(home, { target: { value: '40' } })
    fireEvent.input(away, { target: { value: '40' } })
    fireEvent.click(screen.getByRole('button', { name: 'Check and save' }))
    expect(screen.getByText('A final score can’t be a draw.')).toBeTruthy()

    fireEvent.input(away, { target: { value: '35' } })
    fireEvent.click(screen.getByRole('button', { name: 'Check and save' }))
    expect(screen.getByRole('heading', { name: 'Is this right?' })).toBeTruthy()
    expect(screen.getByText(/ wins$/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText(/^Saved\./)).toBeTruthy()
    expect(fake.published.results).toMatchObject({
      results: [{ fixture: 'bb-001', status: 'final', score: { home: 40, away: 35 } }],
    })
    expect(fake.changes[0]).toMatchObject({ by: 'scorer@example.com', id: 'bb-001' })
  })

  it('enters volleyball sets and says when someone else saved first', async () => {
    await signIn()
    await screen.findByRole('heading', { name: 'Enter results' })
    history.pushState(null, '', '/admin/game/vb-fri-1')
    dispatchEvent(new PopStateEvent('popstate'))
    expect(await screen.findByRole('heading', { name: /^Game 1: / })).toBeTruthy()

    // Meanwhile another scorer saves this game.
    await fake.deps.write(2027, 'result', 'vb-fri-1', { fixture: 'vb-fri-1', status: 'live' }, 0, {
      at: '2027-03-26T09:40:00Z',
      by: 'other@example.com',
      kind: 'result',
      id: 'vb-fri-1',
      action: 'save',
    })

    const sets = () => screen.getAllByRole('textbox')
    fireEvent.input(sets()[0], { target: { value: '25' } })
    fireEvent.input(sets()[1], { target: { value: '20' } })
    fireEvent.click(screen.getByRole('button', { name: '+ Set' }))
    fireEvent.input(sets()[2], { target: { value: '25' } })
    fireEvent.input(sets()[3], { target: { value: '18' } })
    fireEvent.click(screen.getByRole('button', { name: 'Check and save' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText(/^other@example\.com saved this game/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Save mine instead' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText(/^Saved\./)).toBeTruthy()
    expect(fake.published.results).toMatchObject({
      results: [
        {
          fixture: 'vb-fri-1',
          score: {
            sets: [
              [25, 20],
              [25, 18],
            ],
          },
        },
      ],
    })
  })

  it('posts an announcement', async () => {
    await signIn()
    await screen.findByRole('heading', { name: 'Enter results' })
    fireEvent.click(screen.getByRole('link', { name: 'Announcements' }))
    fireEvent.click(await screen.findByRole('link', { name: 'New announcement' }))
    fireEvent.input(await screen.findByLabelText('Title'), { target: { value: 'Game 12 moved to Court B' } })
    fireEvent.click(screen.getByLabelText(/^Urgent/))
    expect(screen.getByRole('heading', { name: 'Preview' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Post it' }))
    expect(await screen.findByText(/^Saved\. It shows/)).toBeTruthy()
    await waitFor(() =>
      expect(fake.published.announcements).toMatchObject([{ title: { en: 'Game 12 moved to Court B' }, urgent: true }]),
    )

    fireEvent.click(screen.getByRole('link', { name: 'Changes' }))
    expect(await screen.findByText('Announcement “Game 12 moved to Court B”')).toBeTruthy()
  })

  it('shows a volleyball scorer only volleyball games, and no announcements', async () => {
    groups = '[scorer-volleyball]'
    await signIn()
    await screen.findByRole('heading', { name: 'Enter results' })
    expect(screen.queryByRole('link', { name: 'Announcements' })).toBeNull()
    // Game 1 of each sport.
    fireEvent.input(screen.getByPlaceholderText('Game number or team'), { target: { value: '1' } })
    expect(document.querySelector('a[href="/admin/game/vb-fri-1"]')).toBeTruthy()
    expect(document.querySelector('a[href^="/admin/game/bb-"]')).toBeNull()

    history.pushState(null, '', '/admin/game/bb-001')
    dispatchEvent(new PopStateEvent('popstate'))
    expect(await screen.findByText('You can’t enter Basketball results. Ask Tim if you need to.')).toBeTruthy()
  })
})
