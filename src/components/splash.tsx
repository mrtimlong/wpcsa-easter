// The tournament artwork, full screen, the first time someone opens the app. It fades after a
// moment or on a tap, and isn't shown again on this device (?splash shows it again, for testing).
import { useEffect, useState } from 'preact/hooks'
import { content } from '../data/content.ts'
import { formatDateRange } from '../data/format.ts'
import { useI18n } from '../i18n/index.tsx'
import { Picture, siteImage } from './picture.tsx'

const SEEN = 'splashSeen'
const SHOW_MS = 2500
const FADE_MS = 600

function firstVisit(): boolean {
  if (new URLSearchParams(location.search).has('splash')) return true
  try {
    return !localStorage.getItem(SEEN)
  } catch {
    return false
  }
}

export function Splash() {
  const { t, locale } = useI18n()
  const [state, setState] = useState<'showing' | 'leaving' | 'gone'>(() => (firstVisit() ? 'showing' : 'gone'))

  useEffect(() => {
    if (state === 'gone') return
    if (state === 'showing') {
      try {
        localStorage.setItem(SEEN, '1')
      } catch {}
    }
    const timer = setTimeout(
      () => setState(state === 'showing' ? 'leaving' : 'gone'),
      state === 'showing' ? SHOW_MS : FADE_MS,
    )
    return () => clearTimeout(timer)
  }, [state])

  if (state === 'gone') return null
  const { startDate, endDate } = content.tournament
  return (
    // Decorative (the same title is on the page underneath), so screen readers skip it.
    <div
      class={`splash${state === 'leaving' ? ' is-leaving' : ''}`}
      aria-hidden="true"
      onClick={() => setState('leaving')}
    >
      <Picture
        image={siteImage('goat-hero')}
        art={[{ media: '(max-aspect-ratio: 1/1)', image: siteImage('goat-hero-portrait') }]}
        alt=""
        eager
      />
      <div class="splash-text">
        <p class="splash-title">{t('app.title')}</p>
        <p>{t('home.dates', { dates: formatDateRange(startDate, endDate, locale) })}</p>
        <p class="motto">{t('home.motto')}</p>
      </div>
    </div>
  )
}
