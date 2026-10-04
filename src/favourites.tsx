// "My teams": team ids the viewer follows, saved on this device only (localStorage).
import { type ComponentChildren, createContext } from 'preact'
import { useContext, useEffect, useMemo, useState } from 'preact/hooks'

const STORAGE_KEY = 'favouriteTeams'

export function loadFavourites(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return [] // storage unavailable or corrupted: start empty
  }
}

type FavouritesContextValue = {
  favourites: Set<string>
  isFavourite: (teamId: string) => boolean
  toggle: (teamId: string) => void
  clear: () => void
}

const FavouritesContext = createContext<FavouritesContextValue | null>(null)

export function FavouritesProvider({ children }: { children: ComponentChildren }) {
  const [ids, setIds] = useState<string[]>(loadFavourites)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
    } catch {
      // Ignore: favourites just won't persist.
    }
  }, [ids])

  // Keep other open tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setIds(loadFavourites())
    }
    addEventListener('storage', onStorage)
    return () => removeEventListener('storage', onStorage)
  }, [])

  const value = useMemo<FavouritesContextValue>(() => {
    const favourites = new Set(ids)
    return {
      favourites,
      isFavourite: (teamId) => favourites.has(teamId),
      toggle: (teamId) =>
        setIds((current) => (current.includes(teamId) ? current.filter((id) => id !== teamId) : [...current, teamId])),
      clear: () => setIds([]),
    }
  }, [ids])

  return <FavouritesContext.Provider value={value}>{children}</FavouritesContext.Provider>
}

export function useFavourites(): FavouritesContextValue {
  const ctx = useContext(FavouritesContext)
  if (!ctx) throw new Error('useFavourites must be used inside <FavouritesProvider>')
  return ctx
}
