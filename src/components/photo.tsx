import type { Photo as PhotoData } from '../data/schema.ts'
import { useI18n } from '../i18n/index.tsx'
import { isImageName, Picture } from './picture.tsx'

/** An image with the attribution its licence requires, linked to the source. */
export function Photo({
  photo,
  sizes,
  class: className,
  eager,
}: {
  photo: PhotoData
  sizes?: string
  class?: string
  eager?: boolean
}) {
  const { t, l } = useI18n()
  if (!isImageName(photo.image)) return null // content.test.ts guarantees this doesn't happen
  const credit = t('photo.credit', { credit: photo.credit, license: photo.license })
  return (
    <figure class={`photo ${className ?? ''}`}>
      <Picture name={photo.image} alt={l(photo.alt)} sizes={sizes} eager={eager} />
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
