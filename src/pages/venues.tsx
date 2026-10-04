import { dataImage } from '../components/photo.tsx'
import { Picture } from '../components/picture.tsx'
import { sports } from '../components/sport-filter.tsx'
import { SportIcon } from '../components/sport-icon.tsx'
import { content } from '../data/content.ts'
import type { FacilityKind, Venue } from '../data/schema.ts'
import { useScrollToHash } from '../hooks/scroll-to-hash.ts'
import { useI18n } from '../i18n/index.tsx'

/** Decorative: the facility name is always shown too. */
const facilityIcons: Record<FacilityKind, string> = {
  toilets: '🚻',
  firstAid: '⛑️',
  merchandise: '👕',
  food: '🍜',
  water: '💧',
  parking: '🅿️',
  lostProperty: '🧳',
  info: 'ℹ️',
  other: '📍',
}

const sportOf = new Map(content.competitions.map((c) => [c.id, c.sport]))

/** Sports with games at a venue, in the usual order. */
function venueSports(venue: Venue) {
  const here = new Set(content.fixtures.filter((f) => f.venue === venue.id).map((f) => sportOf.get(f.competition)))
  return sports.filter((s) => here.has(s))
}

export function Venues() {
  useScrollToHash()
  const { t } = useI18n()
  return (
    <section>
      <h1>{t('venues.title')}</h1>
      {content.venues.map((venue) => (
        <VenueDetails key={venue.id} venue={venue} />
      ))}
    </section>
  )
}

function VenueDetails({ venue }: { venue: Venue }) {
  const { t, l } = useI18n()
  const here = venueSports(venue)
  const plan = venue.plan ? dataImage(venue.plan) : undefined
  const vendors = content.vendors.filter((v) => v.venue === venue.id)

  return (
    <article id={venue.id} class="venue card">
      <div class="card-body">
        <h2>{l(venue.name)}</h2>
        {here.length > 0 && (
          <p class="venue-sports">
            {here.map((sport) => (
              <span key={sport} class={`sport-${sport}`}>
                <SportIcon sport={sport} /> {t(`sport.${sport}`)}
              </span>
            ))}
          </p>
        )}
        {venue.address && <p>{venue.address}</p>}
        {venue.notes && <p>{l(venue.notes)}</p>}
        {venue.mapUrl && (
          <p class="card-links">
            <a href={venue.mapUrl} target="_blank" rel="noopener noreferrer">
              {t('venues.directions')}
            </a>
          </p>
        )}

        {venue.facilities && venue.facilities.length > 0 && (
          <>
            <h3>{t('venues.facilities')}</h3>
            <ul class="facilities">
              {venue.facilities.map((facility, i) => (
                <li key={`${facility.kind}-${i}`}>
                  <span class="facility-icon" aria-hidden="true">
                    {facilityIcons[facility.kind]}
                  </span>
                  <span>
                    <strong>{facility.name ? l(facility.name) : t(`facility.${facility.kind}`)}</strong>
                    <span class="muted"> · {l(facility.where)}</span>
                    {facility.notes && <span class="facility-notes">{l(facility.notes)}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {plan && (
          <>
            <h3>{t('venues.plan')}</h3>
            <a href={`${plan.path}-${plan.widths[plan.widths.length - 1]}.jpg`} target="_blank" rel="noopener">
              <Picture image={plan} alt={t('venues.planAlt', { venue: l(venue.name) })} sizes="48rem" />
            </a>
          </>
        )}

        {venue.courts.length > 1 && (
          <>
            <h3>{t('venues.courts')}</h3>
            <p>{venue.courts.map((c) => l(c.name)).join(' · ')}</p>
          </>
        )}

        {vendors.length > 0 && (
          <>
            <h3>{t('vendors.title')}</h3>
            <p>
              {vendors.map((v, i) => (
                <span key={v.id}>
                  {i > 0 && ' · '}
                  <a href={`/vendors#${v.id}`}>{v.name}</a>
                </span>
              ))}
            </p>
          </>
        )}
      </div>
    </article>
  )
}
