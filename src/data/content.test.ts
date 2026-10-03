import { describe, expect, it } from 'vitest'
import { content } from './content.ts'
import { Content } from './schema.ts'
import { validateContent } from './validate.ts'

describe('bundled content', () => {
  it('matches the schema', () => {
    const parsed = Content.safeParse(content)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
  })

  it('has consistent references and no court clashes', () => {
    expect(validateContent(content)).toEqual([])
  })
})
