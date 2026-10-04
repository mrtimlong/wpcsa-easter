// Validates a data folder: sample-data/ by default, or `DATA_DIR=data npm run data:check`.
import { describe, expect, it } from 'vitest'
import { content, publishedResults } from './content.ts'
import { Content, Results } from './schema.ts'
import { validateContent } from './validate.ts'

describe(`data in ${process.env.DATA_DIR}`, () => {
  it('matches the schema', () => {
    const parsed = Content.safeParse(content)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
  })

  it('has a valid results.json, if any', () => {
    const parsed = Results.optional().safeParse(publishedResults)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
  })

  it('only uses generated images (run `npm run images -- --data <dir>` after adding originals)', () => {
    const guide = content.guide
    const photos = [guide?.hero, ...(guide?.sections.flatMap((s) => s.items.map((i) => i.photo)) ?? [])]
    const missing = photos.filter((p) => p && !(p.image in content.images)).map((p) => p!.image)
    expect(missing).toEqual([])
  })

  it('has consistent references and no court clashes', () => {
    expect(validateContent(content)).toEqual([])
  })
})
