import { useEffect, useState } from 'preact/hooks'
import { content } from '../data/content.ts'
import { formatDateTime, scoreSummary } from '../data/format.ts'
import type { Announcement, Result } from '../data/schema.ts'
import { useI18n } from '../i18n/index.tsx'
import { useAdmin, useErrorMessage } from './admin.tsx'
import type { Change } from './api.ts'

const timeZone = content.tournament.timezone
const fixtureById = new Map(content.fixtures.map((f) => [f.id, f]))

/** The audit trail: who saved, changed or cleared what, newest first. */
export function Changes() {
  const { t, locale } = useI18n()
  const errorMessage = useErrorMessage()
  const { client, state } = useAdmin()
  const [changes, setChanges] = useState<Change[] | null>(null)
  const [error, setError] = useState<unknown>(null)

  // Reload whenever the shared state refreshes, so other scorers' changes appear.
  useEffect(() => {
    if (state) client.changes().then(setChanges, setError)
  }, [client, state])

  const score = (data: unknown) => {
    const result = data as Result | undefined
    if (!result) return ''
    const s = scoreSummary(result)
    const text = s ? `${s.home}–${s.away}${s.detail ? ` (${s.detail})` : ''}` : ''
    return result.status === 'final' ? text : `${t(`status.${result.status}`)}${text && ` ${text}`}`
  }

  const describe = (c: Change) => {
    if (c.kind === 'announcement') {
      const title = ((c.after ?? c.before) as Announcement | undefined)?.title.en ?? c.id
      return t(c.action === 'delete' ? 'admin.changes.announcementDeleted' : 'admin.changes.announcement', { title })
    }
    const game = fixtureById.get(c.id)?.number ?? c.id
    const what = c.action === 'delete' ? t('admin.changes.cleared') : score(c.after)
    const was = c.before && c.action === 'save' ? ` (${t('admin.changes.was', { score: score(c.before) })})` : ''
    return `${t('admin.changes.result', { game, what })}${was}`
  }

  return (
    <>
      <h1>{t('admin.changes.title')}</h1>
      {error !== null && <p class="notice">{errorMessage(error)}</p>}
      {changes?.length === 0 && <p class="muted">{t('admin.changes.none')}</p>}
      <ul class="admin-changes">
        {changes?.map((c) => (
          <li key={`${c.at}-${c.kind}-${c.id}`}>
            <span class="muted">
              {formatDateTime(c.at, timeZone, locale, 'short')} · {c.by}
            </span>
            {c.kind === 'result' && c.action === 'save' ? (
              <a href={`/admin/game/${encodeURIComponent(c.id)}`}>{describe(c)}</a>
            ) : (
              <span>{describe(c)}</span>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}
