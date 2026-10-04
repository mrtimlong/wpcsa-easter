import { content, DATA_URL } from '../data/content.ts'
import type { Photo as PhotoData } from '../data/schema.ts'
import { useI18n } from '../i18n/index.tsx'
import { type ImageSource, Picture } from './picture.tsx'

/** An image from the data's images.json (team photos, guide photos…), if it exists. */
export function dataImage(name: string): ImageSource | undefined {
  const info = content.images[name]
  return info && { path: `${DATA_URL}images/generated/${name}`, ...info }
}

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
  const image = dataImage(photo.image)
  if (!image) return null // content.test.ts guarantees this doesn't happen
  const credit = t('photo.credit', { credit: photo.credit, license: photo.license })
  return (
    <figure class={`photo ${className ?? ''}`}>
      <Picture image={image} alt={l(photo.alt)} sizes={sizes} eager={eager} />
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
