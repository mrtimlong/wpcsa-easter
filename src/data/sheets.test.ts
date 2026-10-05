import { describe, expect, it } from 'vitest'
import type { Competition, Venue } from './schema.ts'
import { type Base, competitionLabel, importSheets, type SheetFile } from './sheets.ts'

const base: Base = {
  tournament: { timezone: 'Africa/Johannesburg' },
  associations: [
    { id: 'wp', name: { en: 'Western Province' }, short: 'WP' },
    { id: 'sg', name: { en: 'Southern Gauteng' }, short: 'SG' },
  ],
  competitions: [
    { id: 'bb-mens', sport: 'basketball', name: { en: 'Mens' } },
    { id: 'vb', sport: 'volleyball', name: { en: 'Volleyball' } },
  ],
  venues: [{ id: 'uct', name: { en: 'UCT Sports Centre' }, courts: [{ id: 'a', name: { en: 'Court A' } }] }] as Venue[],
  images: { 'teams/bb-mens-wpa': { width: 1, height: 1, widths: [1] } },
  logos: ['logos/noodle-bar.svg'],
}

const teamsTab = [['Competition', 'Team name', 'Coach', 'Manager', 'Notes for organisers']]
const playersTab = [['Competition', 'Team', 'Player name', 'Shirt number', 'Captain', 'Consent to show name']]

const wp: SheetFile = {
  name: 'Teams and squads – WP',
  tabs: {
    Teams: [...teamsTab, ['Basketball: Mens', 'WPA', 'Coach A', '', ''], ['Volleyball', 'WP', '', '', '']],
    Players: [
      ...playersTab,
      ['Basketball: Mens', 'WPA', 'Player 1', '4', 'Yes', 'Yes'],
      ['Basketball: Mens', 'WPA', 'Player 2', '00', '', 'yes'],
      ['Basketball: Mens', 'WPA', 'Player 3', '6', '', 'No'],
      ['', '', '', '', '', ''],
    ],
  },
}
const clubs: SheetFile = {
  name: 'Teams and squads - Clubs',
  tabs: { Teams: [...teamsTab, ['Basketball: Mens', 'Hisense', '', '', '']], Players: playersTab },
}

const fixturesHeader = [
  'Game no.',
  'Competition',
  'Stage',
  'Pool',
  'Label',
  'Date',
  'Time',
  'Venue',
  'Court',
  'Home',
  'Away',
  'Officials',
  'Best of',
  'Tie',
  'Stream',
  'Replay',
]
const fixtures = (...rows: string[][]): SheetFile => ({
  name: 'Fixtures',
  tabs: { Fixtures: [fixturesHeader, ...rows] },
})

describe('importSheets', () => {
  it('reads teams and squads, one file per association, keeping only players who consented', () => {
    const { teams, squads, notes, errors } = importSheets([wp, clubs], base)
    expect(errors).toEqual([])
    expect(teams).toEqual([
      { id: 'bb-mens-wpa', competition: 'bb-mens', name: 'WPA', association: 'wp' },
      { id: 'vb-wp', competition: 'vb', name: 'WP', association: 'wp' },
      { id: 'bb-mens-hisense', competition: 'bb-mens', name: 'Hisense' },
    ])
    expect(squads).toEqual([
      {
        team: 'bb-mens-wpa',
        coach: 'Coach A',
        photo: 'teams/bb-mens-wpa',
        players: [
          { name: 'Player 1', number: 4, captain: true },
          { name: 'Player 2', number: '00' },
        ],
      },
    ])
    expect(notes).toEqual(['Teams and squads – WP: left out 1 player(s) without consent'])
  })

  it('skips the template and reports files it doesn’t know', () => {
    const template = { ...wp, name: 'Teams and squads – TEMPLATE' }
    const { teams, notes } = importSheets([template, { name: 'Notes', tabs: {} }], base)
    expect(teams).toBeUndefined()
    expect(notes).toEqual(['Skipped "Notes": not a teams, vendors or fixtures sheet'])
  })

  it('reads vendors, matching logos by id', () => {
    const vendors: SheetFile = {
      name: 'Vendors',
      tabs: {
        Vendors: [
          [
            'Name',
            'What they sell',
            'What they sell (中文, optional)',
            'Venue',
            'Opening hours',
            'Cash',
            'Card',
            'EFT',
          ],
          ['Noodle Bar', 'Noodles', '麵', 'UCT Sports Centre', 'Sat–Mon', 'Yes', '', 'Yes'],
        ],
      },
    }
    expect(importSheets([vendors], base).vendors).toEqual([
      {
        id: 'noodle-bar',
        name: 'Noodle Bar',
        description: { en: 'Noodles', zh: '麵' },
        venue: 'uct',
        hours: { en: 'Sat–Mon' },
        payment: ['cash', 'eft'],
        logo: 'logos/noodle-bar.svg',
      },
    ])
  })

  it('reads fixtures with teams, positions, winners and TBC slots', () => {
    const {
      fixtures: result,
      teams,
      errors,
    } = importSheets(
      [
        wp,
        clubs,
        fixtures(
          [
            '49',
            'Basketball: Mens',
            'Knockout',
            '',
            'Final',
            '2027-03-29',
            '14:00',
            'UCT Sports Centre',
            '',
            'Winner 2',
            '1st Pool A',
            '',
            '',
            '',
          ],
          [
            '2',
            'Basketball: Mens',
            'Group',
            'A',
            '',
            '2027-03-26',
            '9:30',
            'UCT Sports Centre',
            'Court A',
            'WPA',
            'Hisense',
            'WP',
            '',
            '',
            'https://example.com/live/2',
            'https://example.com/replay/2',
          ],
          [
            '1',
            'Volleyball',
            'Knockout',
            '',
            '',
            '2027-03-26',
            '08:00',
            'uct',
            '',
            'WP',
            'TBC: Best runner-up',
            '3rd',
            '5',
            '',
          ],
        ),
      ],
      base,
    )
    expect(errors).toEqual([])
    // Pools come from the group games.
    expect(teams?.find((t) => t.id === 'bb-mens-wpa')?.group).toBe('A')
    expect(result).toEqual([
      {
        id: 'vb-001',
        number: 1,
        competition: 'vb',
        stage: 'knockout',
        start: '2027-03-26T08:00+02:00',
        venue: 'uct',
        home: { team: 'vb-wp' },
        away: { tbc: { en: 'Best runner-up' } },
        officials: { position: 3 },
        format: { bestOf: 5 },
      },
      {
        id: 'bb-002',
        number: 2,
        competition: 'bb-mens',
        stage: 'group',
        group: 'A',
        start: '2027-03-26T09:30+02:00',
        venue: 'uct',
        court: 'a',
        home: { team: 'bb-mens-wpa' },
        away: { team: 'bb-mens-hisense' },
        // Officials can come from another competition.
        officials: { team: 'vb-wp' },
        stream: 'https://example.com/live/2',
        replay: 'https://example.com/replay/2',
      },
      {
        id: 'bb-049',
        number: 49,
        competition: 'bb-mens',
        stage: 'knockout',
        label: { en: 'Final' },
        start: '2027-03-29T14:00+02:00',
        venue: 'uct',
        home: { winnerOf: 'bb-002' },
        away: { position: 1, group: 'A' },
      },
    ])
  })

  it('says which sheet and row each problem is on', () => {
    const vendors: SheetFile = {
      name: 'Vendors',
      tabs: {
        Vendors: [
          ['Name', 'What they sell'],
          ['Example Noodle Bar', 'Noodles'],
        ],
      },
    }
    const { errors } = importSheets(
      [
        wp,
        vendors,
        fixtures(
          [
            '1',
            'Basketball: Mens',
            'Group',
            '',
            '',
            '26/03/2027',
            '14:00',
            'UCT Sports Centre',
            'Court Z',
            'WPA',
            'NG',
            '',
            '',
            '',
          ],
          ['1', 'Basketball: Mens', 'Pool', '', '', '2027-03-26', '15:00', 'Nowhere', '', 'WPA', 'WPA', '', '', ''],
        ),
      ],
      base,
    )
    expect(errors).toEqual([
      "Vendors › Vendors row 2: this is the template's example row; delete it",
      'Fixtures › Fixtures row 2: date "26/03/2027" should be YYYY-MM-DD',
      'Fixtures › Fixtures row 2: away "NG" isn\'t a team in Basketball: Mens or a slot like "Winner 49"',
      'Fixtures › Fixtures row 3: stage must be Group or Knockout',
      'Fixtures › Fixtures row 3: unknown venue "Nowhere"',
    ])
  })

  it('only takes web addresses for streams and replays', () => {
    const row = [
      '2',
      'Basketball: Mens',
      'Group',
      'A',
      '',
      '2027-03-26',
      '9:30',
      'UCT Sports Centre',
      '',
      'WPA',
      'Hisense',
    ]
    const { errors } = importSheets(
      [wp, clubs, fixtures([...row, '', '', '', 'youtube.com/live/x', 'javascript:alert(1)'])],
      base,
    )
    expect(errors).toEqual([
      'Fixtures › Fixtures row 2: stream "youtube.com/live/x" should be a web address starting https://',
      'Fixtures › Fixtures row 2: replay "javascript:alert(1)" should be a web address starting https://',
    ])
  })
})

describe('competitionLabel', () => {
  it('adds the sport unless the name already has it', () => {
    const c = (sport: Competition['sport'], en: string) => ({ id: 'x', sport, name: { en } })
    expect(competitionLabel(c('basketball', 'Mens'))).toBe('Basketball: Mens')
    expect(competitionLabel(c('badminton', 'Badminton Interprovincial'))).toBe('Badminton Interprovincial')
  })
})
