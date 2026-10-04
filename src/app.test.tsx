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

describe('team page', () => {
  it('shows the squad, photo and games, and follows the team', async () => {
    history.replaceState(null, '', '/teams/bb-minis-a-wpa')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'WPA', level: 1 })).toBeTruthy()
    expect(screen.getByText('Coach: Coach (placeholder)')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Team photo: WPA' })).toBeTruthy()
    expect(screen.getAllByRole('listitem').some((li) => li.textContent?.includes('Player 1'))).toBe(true)
    // Demo "now" is Sunday 15:00: game 34 is done, semi-final 49 is later.
    const sections = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(sections).toEqual(['Squad', 'Next games', 'Results'])

    fireEvent.click(screen.getByRole('button', { name: '☆ Follow' }))
    expect(screen.getByRole('button', { name: '★ Following' })).toBeTruthy()
    expect(JSON.parse(localStorage.getItem('favouriteTeams')!)).toEqual(['bb-minis-a-wpa'])
  })

  it('is reachable from team names on game cards', async () => {
    history.replaceState(null, '', '/schedule')
    render(<App />)
    fireEvent.click(screen.getAllByRole('link', { name: 'WPA' })[0])
    expect(await screen.findByRole('heading', { name: 'Squad', level: 2 })).toBeTruthy()
  })

  it('shows Not found for an unknown team', async () => {
    history.replaceState(null, '', '/teams/nope')
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1 })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Squad' })).toBeNull()
  })
})
