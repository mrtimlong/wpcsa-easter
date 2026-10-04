import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { content } from './data/content.ts'
import { initialResults as results } from './data/live.ts'
import { fixtureTeams } from './data/resolve.ts'
import { FavouritesProvider, loadFavourites } from './favourites.tsx'
import { I18nProvider } from './i18n/index.tsx'
import { Schedule } from './pages/schedule.tsx'
import { Standings } from './pages/standings.tsx'

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('loadFavourites', () => {
  it('survives missing, corrupt or wrongly shaped storage', () => {
    expect(loadFavourites()).toEqual([])
    localStorage.setItem('favouriteTeams', '{not json')
    expect(loadFavourites()).toEqual([])
    localStorage.setItem('favouriteTeams', JSON.stringify({ a: 1 }))
    expect(loadFavourites()).toEqual([])
    localStorage.setItem('favouriteTeams', JSON.stringify(['bb-mens-wpa', 3]))
    expect(loadFavourites()).toEqual(['bb-mens-wpa'])
  })
})

describe('fixtureTeams', () => {
  it('includes knockout teams only once they are known', () => {
    const groupGame = content.fixtures.find((f) => f.id === 'bb-001')!
    expect(fixtureTeams(groupGame, content, results)).toEqual(['bb-minis-a-wpb', 'bb-minis-a-sgb'])
    const final = content.fixtures.find((f) => f.id === 'bb-068')! // Monday, not played in the demo
    expect(fixtureTeams(final, content, results)).toEqual([])
  })
})

const app = (page: preact.ComponentChild) =>
  render(
    <I18nProvider>
      <FavouritesProvider>{page}</FavouritesProvider>
    </I18nProvider>,
  )

describe('Time-of-day filter', () => {
  const times = () => [...document.querySelectorAll('.time-heading')].map((el) => el.textContent ?? '')

  it('splits the day into morning, afternoon and evening', () => {
    app(<Schedule />) // demo "today" is Sunday
    const all = times()
    fireEvent.click(screen.getByRole('button', { name: 'Morning' }))
    const morning = times()
    fireEvent.click(screen.getByRole('button', { name: 'Afternoon' }))
    const afternoon = times()
    fireEvent.click(screen.getByRole('button', { name: 'Evening' }))
    const evening = times()

    expect(morning.every((t) => t < '12:00')).toBe(true)
    expect(afternoon.every((t) => t >= '12:00' && t < '18:00')).toBe(true)
    expect(evening.every((t) => t >= '18:00')).toBe(true)
    expect([...morning, ...afternoon, ...evening]).toEqual(all)
    expect(morning.length && afternoon.length && evening.length).toBeTruthy()
  })
})

describe('My teams filter', () => {
  it('prompts to choose teams when none are followed', () => {
    app(<Schedule />)
    fireEvent.click(screen.getByRole('button', { name: '★ My teams' }))
    expect(screen.getByText('Choose your teams')).toBeTruthy()
  })

  it('shows only games involving followed teams, with a star', () => {
    localStorage.setItem('favouriteTeams', JSON.stringify(['bb-minis-a-wpa']))
    app(<Schedule />) // demo "today" is Sunday: Minis A WPA plays game 34 and semi-final 49
    fireEvent.click(screen.getByRole('button', { name: '★ My teams' }))
    const games = [...document.querySelectorAll('.fixture')].map(
      (el) => el.querySelector('.fixture-meta')?.textContent ?? '',
    )
    expect(games).toEqual([expect.stringContaining('Game 34'), expect.stringContaining('Game 49')])
    expect(document.querySelectorAll('.star-mark').length).toBe(2)
  })

  it('combines with the time-of-day filter', () => {
    localStorage.setItem('favouriteTeams', JSON.stringify(['bb-minis-a-wpa']))
    app(<Schedule />)
    fireEvent.click(screen.getByRole('button', { name: '★ My teams' }))
    fireEvent.click(screen.getByRole('button', { name: 'Evening' }))
    expect(screen.getByText('Nothing scheduled for this part of the day.')).toBeTruthy()
  })

  it('follows a team from the standings table and remembers it', () => {
    app(<Standings />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Follow WPB' })[0])
    expect(JSON.parse(localStorage.getItem('favouriteTeams')!)).toEqual(['bb-minis-a-wpb'])
  })
})
