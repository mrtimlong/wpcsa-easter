import { content, DATA_URL } from '../data/content.ts'
import { useScrollToHash } from '../hooks/scroll-to-hash.ts'
import { useI18n } from '../i18n/index.tsx'

const venueById = new Map(content.venues.map((v) => [v.id, v]))

/** Who's selling what at the tournament. */
export function Vendors() {
  useScrollToHash()
  const { t, l } = useI18n()
  return (
    <section>
      <h1>{t('vendors.title')}</h1>
      {content.vendors.length === 0 && <p class="muted">{t('vendors.empty')}</p>}
      <div class="vendor-list">
        {content.vendors.map((vendor) => {
          const venue = vendor.venue ? venueById.get(vendor.venue) : undefined
          return (
            <article key={vendor.id} id={vendor.id} class="card vendor">
              <div class="card-body">
                <div class="vendor-heading">
                  {vendor.logo && <img src={`${DATA_URL}${vendor.logo}`} alt="" class="vendor-logo" loading="lazy" />}
                  <h2>{vendor.name}</h2>
                </div>
                <p>{l(vendor.description)}</p>
                <dl class="vendor-details">
                  {(venue || vendor.where) && (
                    <>
                      <dt>{t('vendors.where')}</dt>
                      <dd>
                        {vendor.where && l(vendor.where)}
                        {vendor.where && venue && ', '}
                        {venue && <a href={`/venues#${venue.id}`}>{l(venue.name)}</a>}
                      </dd>
                    </>
                  )}
                  {vendor.hours && (
                    <>
                      <dt>{t('vendors.hours')}</dt>
                      <dd>{l(vendor.hours)}</dd>
                    </>
                  )}
                  {vendor.payment && vendor.payment.length > 0 && (
                    <>
                      <dt>{t('vendors.payment')}</dt>
                      <dd>{vendor.payment.map((p) => t(`payment.${p}`)).join(', ')}</dd>
                    </>
                  )}
                </dl>
                {vendor.url && (
                  <p class="card-links">
                    <a href={vendor.url} target="_blank" rel="noopener noreferrer">
                      {t('visit.website')}
                    </a>
                  </p>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
