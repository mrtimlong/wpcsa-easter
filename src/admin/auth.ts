// Sign-in for /admin: email + password straight to the Cognito user pool's API (no SDK, no hosted
// login page). The session is kept on this phone so scorers stay signed in all weekend: the ID
// token (sent to the admin API) lasts an hour and is renewed with the 30-day refresh token.
import backend from '../generated/backend.json'

const STORAGE_KEY = 'adminSession'

/** Renew the ID token when it has less than this left. */
const RENEW_MARGIN_MS = 5 * 60_000

export type Session = { email: string; idToken: string; refreshToken: string; expiresAt: number }

/** Cognito says why it refused; the code (e.g. NotAuthorizedException) picks the message shown. */
export class AuthError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

export const backendReady = Boolean(backend.clientId && backend.api)

async function cognito<T>(action: string, body: object): Promise<T> {
  let response: Response
  try {
    response = await fetch(`https://cognito-idp.${backend.region}.amazonaws.com/`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-amz-json-1.1',
        'x-amz-target': `AWSCognitoIdentityProviderService.${action}`,
      },
      body: JSON.stringify({ ClientId: backend.clientId, ...body }),
    })
  } catch {
    throw new AuthError('network', 'can’t reach the sign-in service')
  }
  const json = (await response.json().catch(() => ({}))) as { __type?: string; message?: string }
  if (!response.ok) throw new AuthError(json.__type?.split('#').pop() ?? 'unknown', json.message ?? '')
  return json as T
}

type AuthResult = { IdToken: string; RefreshToken?: string; ExpiresIn: number }
type InitiateResponse = { AuthenticationResult?: AuthResult; ChallengeName?: string; Session?: string }

function email(idToken: string): string {
  const payload = idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  return (JSON.parse(atob(payload)) as { email?: string }).email ?? ''
}

function store(result: AuthResult, refreshToken: string): Session {
  const session = {
    email: email(result.IdToken),
    idToken: result.IdToken,
    refreshToken: result.RefreshToken ?? refreshToken,
    expiresAt: Date.now() + result.ExpiresIn * 1000,
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Storage unavailable: signed in until the page is closed.
  }
  return session
}

export function savedSession(): Session | null {
  try {
    const session = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Session | null
    return session?.idToken && session.refreshToken ? session : null
  } catch {
    return null
  }
}

/** First sign-in with a temporary password: Cognito asks for a new one before letting them in. */
export type NewPasswordNeeded = { newPassword: true; email: string; session: string }

export async function signIn(address: string, password: string): Promise<Session | NewPasswordNeeded> {
  const response = await cognito<InitiateResponse>('InitiateAuth', {
    AuthFlow: 'USER_PASSWORD_AUTH',
    AuthParameters: { USERNAME: address.trim(), PASSWORD: password },
  })
  if (response.ChallengeName === 'NEW_PASSWORD_REQUIRED' && response.Session) {
    return { newPassword: true, email: address.trim(), session: response.Session }
  }
  if (!response.AuthenticationResult) throw new AuthError(response.ChallengeName ?? 'unknown', 'unexpected step')
  return store(response.AuthenticationResult, '')
}

export async function setNewPassword(challenge: NewPasswordNeeded, password: string): Promise<Session> {
  const response = await cognito<InitiateResponse>('RespondToAuthChallenge', {
    ChallengeName: 'NEW_PASSWORD_REQUIRED',
    Session: challenge.session,
    ChallengeResponses: { USERNAME: challenge.email, NEW_PASSWORD: password },
  })
  if (!response.AuthenticationResult) throw new AuthError('unknown', 'unexpected step')
  return store(response.AuthenticationResult, '')
}

/** Emails a code for resetting the password. */
export async function forgotPassword(address: string): Promise<void> {
  await cognito('ForgotPassword', { Username: address.trim() })
}

export async function resetPassword(address: string, code: string, password: string): Promise<void> {
  await cognito('ConfirmForgotPassword', {
    Username: address.trim(),
    ConfirmationCode: code.trim(),
    Password: password,
  })
}

/** A current ID token, renewed if it's about to expire. Throws AuthError if they must sign in again. */
export async function idToken(session: Session): Promise<Session> {
  if (session.expiresAt - Date.now() > RENEW_MARGIN_MS) return session
  const response = await cognito<InitiateResponse>('InitiateAuth', {
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    AuthParameters: { REFRESH_TOKEN: session.refreshToken },
  })
  if (!response.AuthenticationResult) throw new AuthError('NotAuthorizedException', 'sign in again')
  return store(response.AuthenticationResult, session.refreshToken)
}

export async function signOut(session: Session): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing stored.
  }
  // Also end the session on the server, so the refresh token can't be reused. Best effort.
  await cognito('RevokeToken', { Token: session.refreshToken }).catch(() => {})
}
