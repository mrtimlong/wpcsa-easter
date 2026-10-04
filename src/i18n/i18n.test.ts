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
    expect(translate('en', 'visit.title', { city: 'Cape Town' })).toBe('Visiting Cape Town')
  })
})

describe('singular forms', () => {
  it('uses the .one variant for a count of 1', () => {
    expect(translate('en', 'format.knockouts', { n: 1 })).toBe('1 knockout game')
    expect(translate('en', 'format.knockouts', { n: 2 })).toBe('2 knockout games')
    expect(translate('en', 'format.knockouts', { n: 0 })).toBe('0 knockout games')
  })

  it('keeps strings without a .one variant as they are', () => {
    expect(translate('en', 'fixture.game', { n: 1 })).toBe('Game 1')
  })
})
