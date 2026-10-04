// Organiser announcements: loaded with the rest of the data, then refreshed every minute while the
// app is open (and whenever it comes back to the foreground), so new posts show up without a reload.
// What the viewer has read or dismissed is remembered on this device only.
import { type ComponentChildren, createContext } from 'preact'
import { useCallback, useContext, useEffect, useMemo, useState } from 'preact/hooks'
import { content, loadAnnouncements } from './data/content.ts'
import { currentTime } from './data/live.ts'
import type { Announcement } from './data/schema.ts'

const REFRESH_MS = 60_000
const SEEN_KEY = 'announcementsSeen'
const DISMISSED_KEY = 'announcementsDismissed'

function load<T>(key: string, fallback: T, valid: (value: unknown) => value is T): T {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
    return valid(value) ? value : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable: it just won't be remembered.
  }
}

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')

/** Posted already and not expired, pinned first, then newest first. */
export function visibleAnnouncements(all: Announcement[], time: number): Announcement[] {
  return all
    .filter((a) => Date.parse(a.posted) <= time && (!a.expires || Date.parse(a.expires) > time))
    .sort(
      (a, b) => Number(b.pinned ?? false) - Number(a.pinned ?? false) || Date.parse(b.posted) - Date.parse(a.posted),
    )
}

type AnnouncementsContextValue = {
  /** Visible announcements, in display order. */
  announcements: Announcement[]
  /** Ids posted since the viewer last opened the announcements page. */
  unread: Set<string>
  markAllRead: () => void
  /** The newest urgent announcement the viewer hasn't dismissed, for the banner. */
  banner: Announcement | undefined
  dismiss: (id: string) => void
}

const AnnouncementsContext = createContext<AnnouncementsContextValue | null>(null)

export function AnnouncementsProvider({ children }: { children: ComponentChildren }) {
  const [all, setAll] = useState(content.announcements)
  const [time, setTime] = useState(currentTime)
  const [seen, setSeen] = useState(() => load<string[]>(SEEN_KEY, [], isStringArray))
  const [dismissed, setDismissed] = useState(() => load<string[]>(DISMISSED_KEY, [], isStringArray))

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      setTime(currentTime())
      loadAnnouncements().then(setAll, () => {}) // offline: keep what we have
    }
    const timer = setInterval(refresh, REFRESH_MS)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  const markAllRead = useCallback(() => {
    setSeen((current) => {
      const ids = visibleAnnouncements(all, currentTime()).map((a) => a.id)
      if (ids.every((id) => current.includes(id))) return current
      // Only keep ids that still exist, so storage doesn't grow forever.
      const next = [...new Set([...current.filter((id) => all.some((a) => a.id === id)), ...ids])]
      save(SEEN_KEY, next)
      return next
    })
  }, [all])

  const dismiss = useCallback((id: string) => {
    setDismissed((current) => {
      const next = [...current, id]
      save(DISMISSED_KEY, next)
      return next
    })
  }, [])

  const value = useMemo<AnnouncementsContextValue>(() => {
    const announcements = visibleAnnouncements(all, time)
    const banner = announcements
      .filter((a) => a.urgent && !dismissed.includes(a.id))
      .sort((a, b) => Date.parse(b.posted) - Date.parse(a.posted))[0]
    return {
      announcements,
      unread: new Set(announcements.filter((a) => !seen.includes(a.id)).map((a) => a.id)),
      markAllRead,
      banner,
      dismiss,
    }
  }, [all, time, seen, dismissed, markAllRead, dismiss])

  return <AnnouncementsContext.Provider value={value}>{children}</AnnouncementsContext.Provider>
}

export function useAnnouncements(): AnnouncementsContextValue {
  const ctx = useContext(AnnouncementsContext)
  if (!ctx) throw new Error('useAnnouncements must be used inside <AnnouncementsProvider>')
  return ctx
}
