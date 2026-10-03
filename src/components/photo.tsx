import type { Photo as PhotoData } from '../data/schema.ts'
import { useI18n } from '../i18n/index.tsx'

/** An image with the attribution its licence requires, linked to the source. */
export function Photo({ photo, class: className, eager }: { photo: PhotoData; class?: string; eager?: boolean }) {
  const { t, l } = useI18n()
  const credit = t('photo.credit', { credit: photo.credit, license: photo.license })
  return (
    <figure class={`photo ${className ?? ''}`}>
      <img src={photo.src} alt={l(photo.alt)} loading={eager ? 'eager' : 'lazy'} decoding="async" />
      <figcaption>
        {photo.sourceUrl ? (
          <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">
            {credit}
          </a>
        ) : (
          credit
        )}
      </figcaption>
    </figure>
  )
}
