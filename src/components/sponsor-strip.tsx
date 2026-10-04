import { useEffect, useState } from 'preact/hooks'
import { content, DATA_URL } from '../data/content.ts'
import type { SponsorTier } from '../data/schema.ts'
import { useI18n } from '../i18n/index.tsx'

const INTERVAL_MS = 4000

/** How many turns each tier gets per rotation. */
const weight: Record<SponsorTier, number> = { headline: 3, gold: 2, supporter: 1 }

/**
 * Rotation order: every sponsor with a logo, bigger tiers more often, spread out
 * rather than back to back (headline, gold, supporter, headline, gold, headline…).
 */
export function rotation() {
  const withLogos = content.sponsors.filter((s) => s.logo)
  const rounds = Math.max(0, ...withLogos.map((s) => weight[s.tier]))
  return Array.from({ length: rounds }, (_, round) => withLogos.filter((s) => weight[s.tier] > round)).flat()
}

const order = rotation()

/** One sponsor logo at a time, linking to the sponsors page. Pauses on hover/focus or with the button. */
export function SponsorStrip() {
  const { t } = useI18n()
  // Start somewhere random so the same sponsor isn't always seen first.
  const [index, setIndex] = useState(() => Math.floor(Math.random() * order.length))
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    if (paused || hovered || order.length < 2) return
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') setIndex((i) => (i + 1) % order.length)
    }, INTERVAL_MS)
    return () => clearInterval(timer)
  }, [paused, hovered])

  if (order.length === 0) return null
  const sponsor = order[index % order.length]

  return (
    <aside
      class="sponsor-strip"
      aria-label={t('sponsors.thanks')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusIn={() => setHovered(true)}
      onFocusOut={() => setHovered(false)}
    >
      <span class="sponsor-strip-label">{t('sponsors.thanks')}</span>
      <a href={`/sponsors#${sponsor.id}`} class="sponsor-strip-logo">
        <img key={sponsor.id} src={`${DATA_URL}${sponsor.logo}`} alt={sponsor.name} />
      </a>
      {order.length > 1 && (
        <button
          type="button"
          class="sponsor-strip-pause"
          aria-pressed={paused}
          aria-label={t('sponsors.pause')}
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? '▶' : '❚❚'}
        </button>
      )}
    </aside>
  )
}
