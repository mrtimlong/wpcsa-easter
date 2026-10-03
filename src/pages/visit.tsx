import { Photo } from '../components/photo.tsx'
import { content } from '../data/content.ts'
import { useI18n } from '../i18n/index.tsx'
import { NotFound } from './not-found.tsx'

export function Visit() {
  const { t, l } = useI18n()
  const guide = content.guide
  if (!guide) return <NotFound />

  return (
    <article class="visit">
      <header class="visit-hero">
        {guide.hero && (
          <Photo photo={guide.hero} class="visit-hero-photo" sizes="(max-width: 48rem) 100vw, 48rem" eager />
        )}
        <h1>{t('visit.title', { city: l(content.tournament.host) })}</h1>
      </header>

      {guide.draft && <p class="notice">{t('visit.draft')}</p>}
      <p class="lead">{l(guide.intro)}</p>

      {guide.sections.map((section) => (
        <section key={section.id} id={section.id} class="visit-section">
          <h2>{l(section.title)}</h2>
          {section.intro && <p class="muted">{l(section.intro)}</p>}
          <div class="cards">
            {section.items.map((item) => (
              <div key={item.id} class="card">
                {item.photo && (
                  <Photo photo={item.photo} sizes="(max-width: 33rem) 100vw, (max-width: 50rem) 50vw, 15rem" />
                )}
                <div class="card-body">
                  <h3>{l(item.name)}</h3>
                  <p>{l(item.description)}</p>
                  {(item.mapUrl || item.url) && (
                    <p class="card-links">
                      {item.mapUrl && (
                        <a href={item.mapUrl} target="_blank" rel="noopener noreferrer">
                          {t('visit.map')}
                        </a>
                      )}
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          {t('visit.website')}
                        </a>
                      )}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </article>
  )
}
