import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { App } from './app.tsx'

afterEach(() => {
  cleanup()
  history.replaceState(null, '', '/')
})

const tabBar = () => within(screen.getByRole('navigation', { name: 'Main' }))

describe('tab bar', () => {
  it('marks the current page, with More standing in for pages outside the tab bar', async () => {
    render(<App />)
    expect(tabBar().getByRole('link', { name: 'Home' }).getAttribute('aria-current')).toBe('page')

    fireEvent.click(tabBar().getByRole('link', { name: 'More' }))
    expect(await screen.findByRole('heading', { name: 'More', level: 1 })).toBeTruthy()

    fireEvent.click(within(screen.getByRole('main')).getByRole('link', { name: /My teams/ }))
    expect(await screen.findByRole('heading', { name: 'My teams', level: 1 })).toBeTruthy()
    expect(tabBar().getByRole('link', { name: 'More' }).getAttribute('aria-current')).toBe('page')
    expect(tabBar().getByRole('link', { name: 'Home' }).getAttribute('aria-current')).toBeNull()
  })
})
