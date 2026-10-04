import { useState } from 'preact/hooks'
import { useSlotName } from '../components/fixture-card.tsx'
import { SportIcon } from '../components/sport-icon.tsx'
import { bestOf, checkResult, type ResultProblem, scoredInSets } from '../data/check-result.ts'
import { content } from '../data/content.ts'
import { formatDateTime, scoreSummary } from '../data/format.ts'
import { outcome, type Side } from '../data/outcome.ts'
import type { Fixture, Result, Sport } from '../data/schema.ts'
import { useI18n } from '../i18n/index.tsx'
import { useAdmin, useErrorMessage } from './admin.tsx'
import { ApiError, type Item } from './api.ts'

const timeZone = content.tournament.timezone
const statuses = ['live', 'final', 'forfeit', 'cancelled'] as const
type Status = (typeof statuses)[number]

/** What's typed in, kept as text until it's checked. */
type Form = { status: Status; home: string; away: string; sets: [string, string][]; forfeitBy?: Side }

function formFrom(result: Result | undefined, sport: Sport): Form {
  const score = result?.score
  return {
    status: result?.status ?? 'final',
    home: score && 'home' in score ? String(score.home) : '',
    away: score && 'away' in score ? String(score.away) : '',
    sets:
      score && 'sets' in score
        ? score.sets.map(([h, a]) => [String(h), String(a)])
        : scoredInSets(sport)
          ? [['', '']]
          : [],
    forfeitBy: result?.forfeitBy,
  }
}

const number = (text: string) => (/^\d{1,3}$/.test(text.trim()) ? Number(text) : null)

/** The result the form describes, or 'incomplete' if a score box is empty or not a number. */
function resultFrom(form: Form, fixture: Fixture, sport: Sport): Result | 'incomplete' {
  const base = { fixture: fixture.id, status: form.status }
  if (form.status === 'cancelled') return base
  if (form.status === 'forfeit') return form.forfeitBy ? { ...base, forfeitBy: form.forfeitBy } : base
  if (scoredInSets(sport)) {
    const sets = form.sets.filter(([h, a]) => h.trim() || a.trim()).map(([h, a]) => [number(h), number(a)] as const)
    if (sets.some(([h, a]) => h === null || a === null)) return 'incomplete'
    return sets.length ? { ...base, score: { sets: sets as [number, number][] } } : base
  }
  if (!form.home.trim() && !form.away.trim() && form.status === 'live') return base
  const home = number(form.home)
  const away = number(form.away)
  return home === null || away === null ? 'incomplete' : { ...base, score: { home, away } }
}

/** Games whose teams come from this game's result ("Winner of game 12"). */
function dependents(fixture: Fixture): Fixture[] {
  const refersTo = (slot: Fixture['home']) =>
    ('winnerOf' in slot && slot.winnerOf === fixture.id) || ('loserOf' in slot && slot.loserOf === fixture.id)
  return content.fixtures.filter((f) => refersTo(f.home) || refersTo(f.away))
}

export function GameEntry({ id }: { id: string }) {
  const { t } = useI18n()
  const fixture = content.fixtures.find((f) => f.id === id)
  const sport = fixture && content.competitions.find((c) => c.id === fixture.competition)?.sport
  if (!fixture || !sport) return <p class="notice">{t('admin.game.notFound', { id })}</p>
  return <Entry fixture={fixture} sport={sport} />
}

function Entry({ fixture, sport }: { fixture: Fixture; sport: Sport }) {
  const { t, l, locale } = useI18n()
  const errorMessage = useErrorMessage()
  const { state, results, client, refresh } = useAdmin()
  const slotName = useSlotName(results)
  const saved = state?.results.find((i) => i.id === fixture.id) as Item<Result> | undefined

  // The version this edit is based on: a save is refused if someone else has saved since.
  const [version, setVersion] = useState(saved?.version ?? 0)
  const [form, setForm] = useState<Form>(() => formFrom(saved?.data, sport))
  const [step, setStep] = useState<'edit' | 'confirm' | 'done' | 'cleared'>('edit')
  const [problems, setProblems] = useState<ResultProblem[] | ['incomplete']>([])
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [conflict, setConflict] = useState<{ current?: Item<Result> } | null>(null)

  const competition = content.competitions.find((c) => c.id === fixture.competition)
  const court = content.venues.find((v) => v.id === fixture.venue)?.courts.find((c) => c.id === fixture.court)
  const names = { home: slotName(fixture.home, fixture).name, away: slotName(fixture.away, fixture).name }
  const unit = sport === 'volleyball' ? 'set' : 'game'
  const update = (change: Partial<Form>) => setForm((f) => ({ ...f, ...change }))

  const review = () => {
    const result = resultFrom(form, fixture, sport)
    const found = result === 'incomplete' ? (['incomplete'] as const) : checkResult(result, fixture, sport)
    setProblems([...found] as ResultProblem[])
    setFailure(null)
    if (!found.length) setStep('confirm')
  }

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setFailure(null)
    try {
      await action()
    } catch (e) {
      if (e instanceof ApiError && e.code === 'conflict') {
        setConflict({ current: e.current as Item<Result> | undefined })
        setStep('edit')
      } else if (e instanceof ApiError && e.problems.length) {
        setProblems(e.problems)
        setStep('edit')
      } else {
        setFailure(t('admin.game.notSaved', { reason: errorMessage(e) }))
      }
    } finally {
      setBusy(false)
    }
  }

  const save = () =>
    run(async () => {
      const result = resultFrom(form, fixture, sport) as Result
      const response = await client.saveResult(result, version)
      setVersion(response.version)
      setConflict(null)
      setStep('done')
      await refresh()
    })

  const clear = () => {
    if (!confirm(t('admin.game.clearConfirm'))) return
    run(async () => {
      await client.deleteResult(fixture.id, version)
      setVersion(0)
      setForm(formFrom(undefined, sport))
      setStep('cleared')
      await refresh()
    })
  }

  const header = (
    <header class={`admin-game-header sport-${sport}`}>
      <p class="muted">
        <SportIcon sport={sport} /> {competition && l(competition.name)}
        {fixture.group && ` · ${t('fixture.group', { group: fixture.group })}`}
        {fixture.label && ` · ${l(fixture.label)}`}
      </p>
      <h1>
        {fixture.number !== undefined && `${t('fixture.game', { n: fixture.number })}: `}
        {names.home} – {names.away}
      </h1>
      <p class="muted">
        {formatDateTime(fixture.start, timeZone, locale, 'short')}
        {court && ` · ${l(court.name)}`}
        {scoredInSets(sport) && ` · ${t('fixture.bestOf', { n: bestOf(fixture) })}`}
      </p>
      {saved && (
        <p class="muted">
          {t('admin.game.lastSaved', {
            time: formatDateTime(saved.updatedAt, timeZone, locale, 'short'),
            who: saved.updatedBy,
          })}
        </p>
      )}
    </header>
  )

  if (step === 'done' || step === 'cleared') {
    return (
      <>
        {header}
        <p class="notice notice-info" role="status">
          {t(step === 'done' ? 'admin.game.saved' : 'admin.game.cleared')}
        </p>
        <div class="form-actions">
          <a class="button" href="/admin">
            {t('admin.game.toGames')}
          </a>
          <button type="button" class="link-button" onClick={() => setStep('edit')}>
            {t('admin.game.edit')}
          </button>
        </div>
      </>
    )
  }

  if (step === 'confirm') {
    const result = resultFrom(form, fixture, sport) as Result
    const before = outcome(saved?.data)
    const after = outcome(result)
    const affected = before && before.winner !== after?.winner ? dependents(fixture) : []
    return (
      <>
        {header}
        <h2>{t('admin.game.confirm')}</h2>
        <Summary result={result} names={names} />
        {affected.length > 0 && (
          <p class="notice">
            {t('admin.game.affects', {
              games: affected.map((f) => t('fixture.game', { n: f.number ?? f.id })).join(', '),
            })}
          </p>
        )}
        {failure && (
          <p class="notice" role="alert">
            {failure}
          </p>
        )}
        <div class="form-actions">
          <button type="button" class="button" disabled={busy} onClick={save}>
            {busy ? t('admin.working') : failure ? t('admin.game.retry') : t('admin.game.save')}
          </button>
          <button type="button" class="link-button" onClick={() => setStep('edit')}>
            {t('admin.game.edit')}
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      {header}
      {conflict && (
        <div class="notice" role="alert">
          <p>
            {conflict.current
              ? t('admin.game.conflict', {
                  who: conflict.current.updatedBy,
                  time: formatDateTime(conflict.current.updatedAt, timeZone, locale, 'short'),
                  score: summaryText(conflict.current.data, t),
                })
              : t('admin.game.conflictGone')}
          </p>
          <div class="form-actions">
            <button
              type="button"
              class="button"
              onClick={() => {
                setForm(formFrom(conflict.current?.data, sport))
                setVersion(conflict.current?.version ?? 0)
                setConflict(null)
              }}
            >
              {t('admin.game.useTheirs')}
            </button>
            <button
              type="button"
              class="link-button"
              onClick={() => {
                setVersion(conflict.current?.version ?? 0)
                setConflict(null)
                review()
              }}
            >
              {t('admin.game.keepMine')}
            </button>
          </div>
        </div>
      )}

      <fieldset class="chips admin-status" aria-label={t('admin.game.status')}>
        {statuses.map((s) => (
          <button
            key={s}
            type="button"
            class="chip"
            aria-pressed={form.status === s}
            onClick={() => update({ status: s })}
          >
            {t(`status.${s}`)}
          </button>
        ))}
      </fieldset>

      {form.status === 'live' && <p class="muted">{t('admin.game.liveNote')}</p>}
      {form.status === 'cancelled' && <p class="muted">{t('admin.game.cancelledNote')}</p>}

      {form.status === 'forfeit' && (
        <fieldset class="admin-sides">
          <legend>{t('admin.game.forfeitBy')}</legend>
          {(['home', 'away'] as const).map((side) => (
            <button
              key={side}
              type="button"
              class="chip"
              aria-pressed={form.forfeitBy === side}
              onClick={() => update({ forfeitBy: side })}
            >
              {names[side]}
            </button>
          ))}
        </fieldset>
      )}

      {(form.status === 'live' || form.status === 'final') && !scoredInSets(sport) && (
        <div class="admin-score">
          {(['home', 'away'] as const).map((side) => (
            <label key={side} class="admin-score-side">
              <span>{names[side]}</span>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                value={form[side]}
                onInput={(e) => update({ [side]: e.currentTarget.value })}
              />
            </label>
          ))}
        </div>
      )}

      {(form.status === 'live' || form.status === 'final') && scoredInSets(sport) && (
        <div class="admin-sets">
          <div class="admin-set admin-set-names">
            <span />
            <span>{names.home}</span>
            <span>{names.away}</span>
          </div>
          {form.sets.map((set, i) => (
            <div key={i} class="admin-set">
              <span>{t(unit === 'set' ? 'admin.game.set' : 'admin.game.game', { n: i + 1 })}</span>
              {([0, 1] as const).map((side) => (
                <input
                  key={side}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  aria-label={`${t(unit === 'set' ? 'admin.game.set' : 'admin.game.game', { n: i + 1 })}: ${side ? names.away : names.home}`}
                  value={set[side]}
                  onInput={(e) => {
                    const sets = form.sets.map((s) => [...s] as [string, string])
                    sets[i][side] = e.currentTarget.value
                    update({ sets })
                  }}
                />
              ))}
            </div>
          ))}
          <div class="form-actions">
            {form.sets.length < bestOf(fixture) && (
              <button type="button" class="chip" onClick={() => update({ sets: [...form.sets, ['', '']] })}>
                {t(unit === 'set' ? 'admin.game.addSet' : 'admin.game.addGame')}
              </button>
            )}
            {form.sets.length > 1 && (
              <button type="button" class="link-button" onClick={() => update({ sets: form.sets.slice(0, -1) })}>
                {t('admin.game.removeSet')}
              </button>
            )}
          </div>
        </div>
      )}

      {problems.length > 0 && (
        <ul class="notice admin-problems" role="alert">
          {problems.map((p) => (
            <li key={p}>{t(`admin.problem.${p}`, { n: bestOf(fixture) })}</li>
          ))}
        </ul>
      )}

      <div class="form-actions">
        <button type="button" class="button" onClick={review}>
          {t('admin.game.review')}
        </button>
        <a href="/admin">{t('admin.back')}</a>
      </div>

      {saved && (
        <p class="admin-danger">
          <button type="button" class="link-button" disabled={busy} onClick={clear}>
            {t('admin.game.clear')}
          </button>
        </p>
      )}
      {failure && (
        <p class="notice" role="alert">
          {failure}
        </p>
      )}
    </>
  )
}

/** "72–65" or "2–1 (25–20, 18–25, 15–11)", with the status for anything but final. */
function summaryText(result: Result, t: ReturnType<typeof useI18n>['t']): string {
  const score = scoreSummary(result)
  const text = score ? `${score.home}–${score.away}${score.detail ? ` (${score.detail})` : ''}` : ''
  return result.status === 'final' ? text : `${t(`status.${result.status}`)}${text && ` ${text}`}`
}

function Summary({ result, names }: { result: Result; names: Record<Side, string> }) {
  const { t } = useI18n()
  const score = scoreSummary(result)
  const o = outcome(result)
  const line =
    result.status === 'cancelled'
      ? t('admin.game.isCancelled')
      : result.status === 'live'
        ? t('admin.game.isLive')
        : result.status === 'forfeit' && result.forfeitBy
          ? t('admin.game.forfeits', {
              team: names[result.forfeitBy],
              winner: names[result.forfeitBy === 'home' ? 'away' : 'home'],
            })
          : o && o.winner !== 'draw'
            ? t('admin.game.wins', { team: names[o.winner] })
            : ''
  return (
    <div class="card admin-summary">
      <div class="card-body">
        <p class="badge-line">
          <span class={`badge badge-${result.status}`}>{t(`status.${result.status}`)}</span>
        </p>
        {(['home', 'away'] as const).map((side) => (
          <p key={side} class={`admin-summary-team${o?.winner === side ? ' is-winner' : ''}`}>
            <span>{names[side]}</span>
            {score && <strong>{score[side]}</strong>}
          </p>
        ))}
        {score?.detail && <p class="muted">{score.detail}</p>}
        <p>
          <strong>{line}</strong>
        </p>
      </div>
    </div>
  )
}
