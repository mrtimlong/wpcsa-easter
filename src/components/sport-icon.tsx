import type { Sport } from '../data/schema.ts'

// Simple line icons (24×24, drawn with currentColor). Decorative: the sport name is always shown as text too.
const paths: Record<Sport, preact.JSX.Element> = {
  basketball: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3v18M5.6 5.6c3.4 3.4 3.4 9.4 0 12.8M18.4 5.6c-3.4 3.4-3.4 9.4 0 12.8" />
    </>
  ),
  volleyball: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 12c0-3.6 1.4-6.8 3.6-8.3M12 12c3.1 1.8 5 4.7 5.1 7.4M12 12c-3.1 1.8-6.6 2-8.8.8M10.2 3.2c-1.6 3.3-1.5 7.3.4 10.6M20.8 13.4c-2.6-2.3-6.5-3.4-10.2-2.6M7.2 19.7c2.8-1.6 5-4.3 5.9-7.6" />
    </>
  ),
  // Shuttlecock: feathered cone above a cork.
  badminton: (
    <>
      <path d="M8 14 5 3.5h14L16 14z" />
      <path d="M10.6 14 9.8 3.5M13.4 14l.8-10.5M5.9 7h12.2" />
      <path d="M8 14h8v.5a4 4 0 0 1-8 0z" />
    </>
  ),
  // Padel bat: solid head with holes, short handle.
  padel: (
    <>
      <path d="M12 1.8c3.8 0 6.6 2.9 6.6 6.8 0 3.6-2.1 6.2-4.4 7.4l-.9 2.2h-2.6l-.9-2.2c-2.3-1.2-4.4-3.8-4.4-7.4 0-3.9 2.8-6.8 6.6-6.8z" />
      <path d="M10.9 18.2h2.2v4h-2.2z" />
      <path
        d="M9.6 6.5h.01M12 5.6h.01M14.4 6.5h.01M9.2 9.3h.01M12 8.8h.01M14.8 9.3h.01M10.4 12h.01M13.6 12h.01"
        stroke-width="2.2"
      />
    </>
  ),
  // Flag in the hole on a green.
  golf: (
    <>
      <path d="M9 20V3l8 3.5L9 10" />
      <ellipse cx="12" cy="20" rx="8" ry="2" />
    </>
  ),
}

export function SportIcon({ sport, class: className }: { sport: Sport; class?: string }) {
  return (
    <svg
      class={`sport-icon ${className ?? ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[sport]}
    </svg>
  )
}
