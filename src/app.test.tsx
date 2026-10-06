import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { App } from './app.tsx'

afterEach(() => {
  cleanup()
  localStorage.clear()
  history.replaceState(null, '', '/')
})

const tabBar = () => within(screen.getByRole('navigation', { name: 'Main' }))

describe('tab bar', () => {
  it('marks the current page, with Home standing in for the pages it links to', async () => {
    render(<App />)
    expect(tabBar().getByRole('link', { name: /^Home/ }).getAttribute('aria-current')).toBe('page')

    fireEvent.click(tabBar().getByRole('link', { name: 'Teams' }))
    expect(await screen.findByRole('heading', { name: 'Teams', level: 1 })).toBeTruthy()
    expect(tabBar().getByRole('link', { name: /^Home/ }).getAttribute('aria-current')).toBeNull()

    fireEvent.click(tabBar().getByRole('link', { name: /^Home/ }))
    const explore = within((await screen.findByRole('heading', { name: 'Find your way around' })).closest('section')!)
    fireEvent.click(explore.getByRole('link', { name: /My teams/ }))
    expect(await screen.findByRole('heading', { name: 'My teams', level: 1 })).toBeTruthy()
    expect(tabBar().getByRole('link', { name: /^Home/ }).getAttribute('aria-current')).toBe('page')
  })

  it('sends the old Results and More pages to Schedule and Home', async () => {
    history.replaceState(null, '', '/results')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Schedule', level: 1 })).toBeTruthy()
    expect(location.pathname).toBe('/schedule')
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

describe('venues and vendors', () => {
  it('lists facilities, sports and vendors at each venue', async () => {
    history.replaceState(null, '', '/venues')
    render(<App />)
    const uct = (await screen.findByRole('heading', { name: 'UCT Sports Centre', level: 2 })).closest('article')!
    expect(within(uct).getByText('First aid')).toBeTruthy()
    expect(within(uct).getByText('Medic on duty during all games')).toBeTruthy()
    expect(within(uct).getByText('Basketball')).toBeTruthy()
    expect(within(uct).getByRole('link', { name: 'Example Noodle Bar' }).getAttribute('href')).toBe(
      '/vendors#example-noodles',
    )
  })

  it('shows what each vendor sells, where, when and how to pay', async () => {
    history.replaceState(null, '', '/vendors')
    render(<App />)
    const noodles = (await screen.findByRole('heading', { name: 'Example Noodle Bar' })).closest('article')!
    expect(within(noodles).getByText('Cash, Card, SnapScan')).toBeTruthy()
    expect(within(noodles).getByText('Sat–Mon, 9:00–16:00')).toBeTruthy()
    expect(within(noodles).getByRole('link', { name: 'UCT Sports Centre' })).toBeTruthy()
  })
})

describe('tournament info', () => {
  it('shows contacts, the format of each competition and the info sections', async () => {
    history.replaceState(null, '', '/info')
    render(<App />)
    await screen.findByRole('heading', { name: 'Tournament info', level: 1 })
    expect(screen.getByRole('link', { name: 'Call +27 00 000 0001' }).getAttribute('href')).toBe('tel:+27000000001')
    expect(screen.getAllByRole('link', { name: 'WhatsApp' })[0].getAttribute('href')).toBe('https://wa.me/27000000001')
    expect(screen.getByText('8 teams · Pools A, B · 12 pool games · 8 knockout games')).toBeTruthy()
    expect(screen.getByText(/two pools of four/)).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Code of conduct', level: 2 })).toBeTruthy()
    expect(screen.getByText('accept the decisions of referees and umpires').tagName).toBe('LI')
  })
})

describe('rules and oath', () => {
  it('shows the oath in both languages and the rules for each sport played this year', async () => {
    history.replaceState(null, '', '/rules')
    render(<App />)
    await screen.findByRole('heading', { name: 'Rules and oath', level: 1 })
    expect(screen.getByText(/^I promise that I will take part/)).toBeTruthy()
    expect(screen.getByText(/^本人誓以至誠/)).toBeTruthy()
    for (const name of ['Basketball', 'Mini basketball', 'Volleyball', 'Golf']) {
      expect(screen.getByRole('heading', { name, level: 2 })).toBeTruthy()
    }
    expect(screen.getByText('More points scored in the games between them.').tagName).toBe('LI')
    expect(screen.getByRole('link', { name: 'Mini basketball' }).getAttribute('href')).toBe('#mini-basketball')
  })
})

describe('home', () => {
  it('shows the motto and the programme from today on, marking what’s on now', async () => {
    render(<App />)
    expect(await screen.findByText('Friendship through sport')).toBeTruthy()
    const programme = within(screen.getByRole('heading', { name: 'Programme' }).closest('section')!)
    // Demo time is Sunday 15:00: Friday and Saturday are over.
    expect(programme.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Sunday, 20 April',
      'Monday, 21 April',
    ])
    const padel = programme.getByText('Padel').closest('li')!
    expect(within(padel).getByText('Now')).toBeTruthy()
    expect(within(padel).getByText('08:00–21:00')).toBeTruthy()
    const egg = programme.getByText(/Easter egg hunt/).closest('li')!
    expect(within(egg).queryByText('Now')).toBeNull()
    expect(programme.getByText('Presentation dance')).toBeTruthy()
  })
})

describe('sponsors', () => {
  it('rotates logos at the foot of pages, with bigger tiers shown more often', async () => {
    const { rotation } = await import('./components/sponsor-strip.tsx')
    const ids = rotation().map((s) => s.id)
    expect(ids.filter((id) => id === 'headline-a')).toHaveLength(3)
    expect(ids.filter((id) => id === 'gold-a')).toHaveLength(2)
    expect(ids.filter((id) => id === 'supporter-a')).toHaveLength(1)
    expect(ids.slice(0, 3)).toEqual(['headline-a', 'gold-a', 'gold-b'])

    render(<App />)
    const strip = await screen.findByRole('complementary', { name: 'Thanks to our sponsors' })
    expect(within(strip).getByRole('link').getAttribute('href')).toMatch(/^\/sponsors#/)
  })

  it('lists sponsors by tier, without the strip', async () => {
    history.replaceState(null, '', '/sponsors')
    render(<App />)
    await screen.findByRole('heading', { name: 'Our sponsors', level: 1 })
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Headline sponsors',
      'Gold sponsors',
      'Supporters',
    ])
    expect(screen.queryByRole('complementary', { name: 'Thanks to our sponsors' })).toBeNull()
  })
})

describe('teams list', () => {
  it('filters by sport and by followed teams', async () => {
    localStorage.setItem('favouriteTeams', JSON.stringify(['vb-misfits']))
    history.replaceState(null, '', '/teams')
    render(<App />)
    await screen.findByRole('heading', { name: 'Teams', level: 1 })
    const sportsShown = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent?.trim())
    expect(sportsShown()).toEqual(['Basketball', 'Volleyball', 'Badminton', 'Golf'])

    const teamLinks = () => [...document.querySelectorAll('.link-list a')].map((a) => a.getAttribute('href'))

    fireEvent.click(screen.getByRole('button', { name: 'Volleyball' }))
    expect(sportsShown()).toEqual(['Volleyball'])
    expect(teamLinks()).toHaveLength(6)

    fireEvent.click(screen.getByRole('button', { name: '★ My teams' }))
    expect(sportsShown()).toEqual(['Volleyball'])
    expect(teamLinks()).toEqual(['/teams/vb-misfits'])
  })
})

describe('announcements', () => {
  it('lists current announcements, pinned first then newest, and marks them read', async () => {
    history.replaceState(null, '', '/news')
    render(<App />)
    await screen.findByRole('heading', { name: 'Announcements', level: 1 })
    // Demo "now" is Sunday 15:00: the expired rain delay and the 18:00 prize-giving are hidden.
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Welcome to the tournament!',
      'Minis semi-finals moved to Court B',
      'Lost property',
    ])
    expect(screen.getAllByText('New')).toHaveLength(3)
    expect(JSON.parse(localStorage.getItem('announcementsSeen')!)).toHaveLength(3)
  })

  it('shows the urgent banner until dismissed, and an unread count on Home', async () => {
    render(<App />)
    const banner = await screen.findByRole('status')
    expect(banner.textContent).toContain('Minis semi-finals moved to Court B')
    expect(tabBar().getByRole('img', { name: '3 new' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Latest news' })).toBeTruthy()

    fireEvent.click(within(banner).getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByRole('status')).toBeNull()
    expect(JSON.parse(localStorage.getItem('announcementsDismissed')!)).toEqual(['court-change'])
  })
})
