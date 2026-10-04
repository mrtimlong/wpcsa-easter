import { useState } from 'preact/hooks'
import { useI18n } from '../i18n/index.tsx'
import { useErrorMessage } from './admin.tsx'
import { forgotPassword, type NewPasswordNeeded, resetPassword, type Session, setNewPassword, signIn } from './auth.ts'

type Step =
  | { kind: 'signIn'; notice?: string }
  | { kind: 'newPassword'; challenge: NewPasswordNeeded }
  | { kind: 'forgot' }
  | { kind: 'reset'; email: string }

/** Sign in; first-time password change; forgotten password. */
export function Login({ onSignedIn }: { onSignedIn: (session: Session) => void }) {
  const { t } = useI18n()
  const errorMessage = useErrorMessage()
  const [step, setStep] = useState<Step>({ kind: 'signIn' })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Runs a form's action with a busy state and a translated error. */
  const submit = (action: () => Promise<void>) => async (event: Event) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const go = (next: Step) => {
    setStep(next)
    setError(null)
    setPassword('')
  }

  const emailField = (
    <label class="field">
      <span>{t('admin.email')}</span>
      <input
        type="email"
        autoComplete="username"
        required
        value={email}
        onInput={(e) => setEmail(e.currentTarget.value)}
      />
    </label>
  )
  const passwordField = (label: string, autoComplete: string) => (
    <label class="field">
      <span>{label}</span>
      <input
        type="password"
        autoComplete={autoComplete}
        required
        minLength={autoComplete === 'new-password' ? 10 : undefined}
        value={password}
        onInput={(e) => setPassword(e.currentTarget.value)}
      />
    </label>
  )
  const actions = (label: string, back?: () => void) => (
    <div class="form-actions">
      <button type="submit" class="button" disabled={busy}>
        {busy ? t('admin.working') : label}
      </button>
      {back && (
        <button type="button" class="link-button" onClick={back}>
          {t('admin.back')}
        </button>
      )}
    </div>
  )
  const errorNotice = error && (
    <p class="notice" role="alert">
      {error}
    </p>
  )

  if (step.kind === 'newPassword') {
    return (
      <form
        class="admin-form"
        onSubmit={submit(async () => onSignedIn(await setNewPassword(step.challenge, password)))}
      >
        <h1>{t('admin.newPassword.title')}</h1>
        <p>{t('admin.newPassword.intro')}</p>
        {passwordField(t('admin.newPassword'), 'new-password')}
        {errorNotice}
        {actions(t('admin.savePassword'))}
      </form>
    )
  }

  if (step.kind === 'forgot') {
    return (
      <form
        class="admin-form"
        onSubmit={submit(async () => {
          await forgotPassword(email)
          go({ kind: 'reset', email })
        })}
      >
        <h1>{t('admin.reset.title')}</h1>
        <p>{t('admin.reset.intro')}</p>
        {emailField}
        {errorNotice}
        {actions(t('admin.reset.send'), () => go({ kind: 'signIn' }))}
      </form>
    )
  }

  if (step.kind === 'reset') {
    return (
      <form
        class="admin-form"
        onSubmit={submit(async () => {
          await resetPassword(step.email, code, password)
          go({ kind: 'signIn', notice: t('admin.reset.done') })
        })}
      >
        <h1>{t('admin.reset.title')}</h1>
        <p>{t('admin.reset.sent', { email: step.email })}</p>
        <label class="field">
          <span>{t('admin.reset.code')}</span>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onInput={(e) => setCode(e.currentTarget.value)}
          />
        </label>
        {passwordField(t('admin.newPassword'), 'new-password')}
        {errorNotice}
        {actions(t('admin.savePassword'), () => go({ kind: 'signIn' }))}
      </form>
    )
  }

  return (
    <form
      class="admin-form"
      onSubmit={submit(async () => {
        const result = await signIn(email, password)
        if ('newPassword' in result) go({ kind: 'newPassword', challenge: result })
        else onSignedIn(result)
      })}
    >
      <h1>{t('admin.signIn.title')}</h1>
      <p class="muted">{t('admin.signIn.intro')}</p>
      {step.notice && <p class="notice notice-info">{step.notice}</p>}
      {emailField}
      {passwordField(t('admin.password'), 'current-password')}
      {errorNotice}
      {actions(t('admin.signIn'))}
      <p>
        <button type="button" class="link-button" onClick={() => go({ kind: 'forgot' })}>
          {t('admin.forgot')}
        </button>
      </p>
    </form>
  )
}
