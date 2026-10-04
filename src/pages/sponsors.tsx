import { content, DATA_URL } from '../data/content.ts'
import type { SponsorTier } from '../data/schema.ts'
import { useScrollToHash } from '../hooks/scroll-to-hash.ts'
import { useI18n } from '../i18n/index.tsx'

// Order of the tiers on the page (a typed list: importing the zod enum would ship zod to the browser).
const tiers: SponsorTier[] = ['headline', 'gold', 'supporter']

export function Sponsors() {
  useScrollToHash()
  const { t, l } = useI18n()
  return (
    <section>
      <h1>{t('sponsors.title')}</h1>
      <p>{t('sponsors.intro')}</p>
      {content.sponsors.length === 0 && <p class="muted">{t('sponsors.empty')}</p>}
      {tiers.map((tier) => {
        const sponsors = content.sponsors.filter((s) => s.tier === tier)
        if (sponsors.length === 0) return null
        return (
          <div key={tier} class={`sponsor-tier sponsor-tier-${tier}`}>
            <h2>{t(`sponsors.tier.${tier}`)}</h2>
            <div class="sponsor-grid">
              {sponsors.map((sponsor) => (
                <article key={sponsor.id} id={sponsor.id} class="card sponsor">
                  {sponsor.logo && (
                    <img src={`${DATA_URL}${sponsor.logo}`} alt="" class="sponsor-logo" loading="lazy" />
                  )}
                  <div class="card-body">
                    <h3>{sponsor.name}</h3>
                    {sponsor.description && <p>{l(sponsor.description)}</p>}
                    {sponsor.url && (
                      <p class="card-links">
                        <a href={sponsor.url} target="_blank" rel="noopener noreferrer">
                          {t('visit.website')}
                        </a>
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}
