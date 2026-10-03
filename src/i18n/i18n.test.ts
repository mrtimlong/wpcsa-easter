import { describe, expect, it } from 'vitest'
import { translate } from './index.tsx'

describe('translate', () => {
  it('returns the English string', () => {
    expect(translate('en', 'nav.home')).toBe('Home')
  })

  it('returns the Chinese string when present', () => {
    expect(translate('zh-Hant', 'nav.home')).toBe('首頁')
  })

  it('falls back to English when a translation is missing', () => {
    expect(translate('zh-Hant', 'notFound.title')).toBe('Page not found')
  })

  it('interpolates params', () => {
    expect(translate('en', 'app.edition', { year: 2027, city: 'Cape Town' })).toBe(
      '2027 · Cape Town',
    )
  })
})
