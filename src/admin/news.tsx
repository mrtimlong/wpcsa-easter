import { useState } from 'preact/hooks'
import { visibleAnnouncements } from '../announcements.tsx'
import { AnnouncementCard } from '../components/announcement-card.tsx'
import { content } from '../data/content.ts'
import { formatDateTime, fromLocalInput, toLocalInput, toLocalIso } from '../data/format.ts'
import { currentTime } from '../data/live.ts'
import type { Announcement } from '../data/schema.ts'
import { useI18n } from '../i18n/index.tsx'
import { useAdmin, useErrorMessage } from './admin.tsx'
import { ApiError } from './api.ts'

const timeZone = content.tournament.timezone

export function Announcements() {
  const { t, l, locale } = useI18n()
  const { state } = useAdmin()
  const all = (state?.announcements ?? []).map((i) => i.data)
  const showing = new Set(visibleAnnouncements(all, currentTime()).map((a) => a.id))
  const sorted = [...all].sort((a, b) => Date.parse(b.posted) - Date.parse(a.posted))
  return (
    <>
      <h1>{t('admin.nav.news')}</h1>
      <p>
        <a class="button" href="/admin/news/new">
          {t('admin.news.new')}
        </a>
      </p>
      {sorted.length === 0 && <p class="muted">{t('admin.news.none')}</p>}
      <ul class="link-list">
        {sorted.map((a) => (
          <li key={a.id}>
            <a href={`/admin/news/${encodeURIComponent(a.id)}`}>
              {l(a.title)}
              <span class="muted">
                {formatDateTime(a.posted, timeZone, locale, 'short')}
                {a.urgent && ` · ${t('news.urgent')}`}
                {a.pinned && ` · ${t('news.pinned')}`}
                {!showing.has(a.id) && ` · ${t('admin.news.notShowing')}`}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </>
  )
}

type Form = {
  titleEn: string
  titleZh: string
  bodyEn: string
  bodyZh: string
  urgent: boolean
  pinned: boolean
  expires: string
}

const text = (en: string, zh: string) => ({ en: en.trim(), ...(zh.trim() ? { zh: zh.trim() } : {}) })

export function AnnouncementEditor({ id }: { id: string }) {
  const { t } = useI18n()
  const errorMessage = useErrorMessage()
  const { state, client, refresh } = useAdmin()
  const isNew = id === 'new'
  const saved = isNew ? undefined : state?.announcements.find((i) => i.id === id)
  const [version, setVersion] = useState(saved?.version ?? 0)
  const [form, setForm] = useState<Form>(() => ({
    titleEn: saved?.data.title.en ?? '',
    titleZh: saved?.data.title.zh ?? '',
    bodyEn: saved?.data.body?.en ?? '',
    bodyZh: saved?.data.body?.zh ?? '',
    urgent: saved?.data.urgent ?? false,
    pinned: saved?.data.pinned ?? false,
    expires: saved?.data.expires ? toLocalInput(saved.data.expires, timeZone) : '',
  }))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [done, setDone] = useState(false)

  if (!isNew && !saved && !done) return <p class="notice">{t('admin.game.notFound', { id })}</p>

  const update = (change: Partial<Form>) => setForm((f) => ({ ...f, ...change }))

  const announcement = (): Announcement => ({
    // New ids only need to be unique: time-based, readable in the audit trail.
    id: saved?.id ?? `post-${Date.now().toString(36)}`,
    posted: saved?.data.posted ?? toLocalIso(currentTime(), timeZone),
    title: text(form.titleEn, form.titleZh),
    ...(form.bodyEn.trim() ? { body: text(form.bodyEn, form.bodyZh) } : {}),
    ...(form.urgent ? { urgent: true } : {}),
    ...(form.pinned ? { pinned: true } : {}),
    ...(form.expires ? { expires: fromLocalInput(form.expires, timeZone) } : {}),
  })

  const run = async (action: () => Promise<string>) => {
    setBusy(true)
    setMessage(null)
    try {
      setMessage({ text: await action(), ok: true })
      setDone(true)
      await refresh()
    } catch (e) {
      const reason = e instanceof ApiError && e.code === 'conflict' ? t('admin.game.conflictGone') : errorMessage(e)
      setMessage({ text: t('admin.game.notSaved', { reason }), ok: false })
    } finally {
      setBusy(false)
    }
  }

  const save = (event: Event) => {
    event.preventDefault()
    if (!form.titleEn.trim()) {
      setMessage({ text: t('admin.news.titleNeeded'), ok: false })
      return
    }
    run(async () => {
      const response = await client.saveAnnouncement(announcement(), version)
      setVersion(response.version)
      return t('admin.news.saved')
    })
  }

  const remove = () => {
    if (!saved || !confirm(t('admin.news.deleteConfirm'))) return
    run(async () => {
      await client.deleteAnnouncement(saved.id, version)
      return t('admin.news.deleted')
    })
  }

  if (done && message?.ok) {
    return (
      <>
        <p class="notice notice-info" role="status">
          {message.text}
        </p>
        <a class="button" href="/admin/news">
          {t('admin.nav.news')}
        </a>
      </>
    )
  }

  const field = (key: 'titleEn' | 'titleZh', label: string, lang: string) => (
    <label class="field">
      <span>{label}</span>
      <input lang={lang} value={form[key]} onInput={(e) => update({ [key]: e.currentTarget.value })} />
    </label>
  )
  const area = (key: 'bodyEn' | 'bodyZh', label: string, lang: string) => (
    <label class="field">
      <span>{label}</span>
      <textarea lang={lang} rows={5} value={form[key]} onInput={(e) => update({ [key]: e.currentTarget.value })} />
    </label>
  )
  const check = (key: 'urgent' | 'pinned', label: string) => (
    <label class="check">
      <input type="checkbox" checked={form[key]} onChange={(e) => update({ [key]: e.currentTarget.checked })} />
      {label}
    </label>
  )

  return (
    <form class="admin-form" onSubmit={save}>
      <h1>{isNew ? t('admin.news.new') : t('admin.news.edit')}</h1>
      {field('titleEn', t('admin.news.titleEn'), 'en')}
      {field('titleZh', t('admin.news.titleZh'), 'zh-Hant')}
      {area('bodyEn', t('admin.news.bodyEn'), 'en')}
      {area('bodyZh', t('admin.news.bodyZh'), 'zh-Hant')}
      <p class="muted field-help">{t('admin.news.bodyHelp')}</p>
      {check('urgent', t('admin.news.urgent'))}
      {check('pinned', t('admin.news.pinned'))}
      <label class="field">
        <span>{t('admin.news.expires')}</span>
        <input type="datetime-local" value={form.expires} onInput={(e) => update({ expires: e.currentTarget.value })} />
      </label>

      {form.titleEn.trim() && (
        <>
          <h2>{t('admin.news.preview')}</h2>
          <AnnouncementCard announcement={announcement()} />
        </>
      )}

      {message && (
        <p class={`notice${message.ok ? ' notice-info' : ''}`} role="alert">
          {message.text}
        </p>
      )}
      <div class="form-actions">
        <button type="submit" class="button" disabled={busy}>
          {busy ? t('admin.working') : isNew ? t('admin.news.post') : t('admin.news.save')}
        </button>
        <a href="/admin/news">{t('admin.back')}</a>
      </div>
      {saved && (
        <p class="admin-danger">
          <button type="button" class="link-button" disabled={busy} onClick={remove}>
            {t('admin.news.delete')}
          </button>
        </p>
      )}
    </form>
  )
}
