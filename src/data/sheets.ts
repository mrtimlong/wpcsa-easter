// Turns the organisers' Google Sheets (teams and squads, vendors, fixtures) into data JSON.
// Pure: scripts/import-sheets.ts fetches the sheets and writes the files; this only converts.
// The spreadsheet templates live in the "Mobile Site" Drive folder; see docs/data-model.md.
import type {
  Association,
  Competition,
  Fixture,
  ImageManifest,
  PaymentMethod,
  Slot,
  Sport,
  Squad,
  Team,
  Tournament,
  Vendor,
  Venue,
} from './schema.ts'

/** One spreadsheet: its file name and each tab as rows of cell text, header row first. */
export type SheetFile = { name: string; tabs: Record<string, string[][]> }

/** The data the sheets refer to by name. */
export type Base = {
  tournament: Pick<Tournament, 'timezone'>
  associations: Association[]
  competitions: Competition[]
  venues: Venue[]
  images: ImageManifest
  /** Files under logos/ in the data folder. */
  logos: string[]
}

export type Imported = {
  /** Only the kinds found in the folder: missing ones leave their JSON file alone. */
  teams?: Team[]
  squads?: Squad[]
  vendors?: Vendor[]
  fixtures?: Fixture[]
  /** Files that aren't a known kind, plus players left out for lack of consent. */
  notes: string[]
  errors: string[]
}

const TEAMS_FILE = /^Teams and squads\s*[–—-]\s*(.+)$/i

/** Short id prefix per sport, for fixture ids ("bb-049"). */
const sportPrefix: Record<Sport, string> = {
  basketball: 'bb',
  volleyball: 'vb',
  badminton: 'bd',
  padel: 'pd',
  golf: 'golf',
}

const paymentColumns: Record<string, PaymentMethod> = {
  Cash: 'cash',
  Card: 'card',
  SnapScan: 'snapscan',
  Zapper: 'zapper',
  EFT: 'eft',
}

// The example rows in the templates. Importing one is almost certainly a mistake.
const examples = new Set(['Example Noodle Bar', 'Coach 1', 'Manager 1'])

export const slug = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** How a competition appears in the sheets' dropdowns: "Basketball: Mens", or "Volleyball". */
export function competitionLabel(c: Competition): string {
  const sport = c.sport[0].toUpperCase() + c.sport.slice(1)
  return c.name.en.toLowerCase().includes(c.sport) ? c.name.en : `${sport}: ${c.name.en}`
}

/** UTC offset of a time zone on a date, e.g. "+02:00". */
function utcOffset(date: string, timeZone: string): string {
  const name = new Intl.DateTimeFormat('en', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(new Date(`${date}T12:00Z`))
    .find((p) => p.type === 'timeZoneName')!.value
  return name === 'GMT' ? '+00:00' : name.slice(3)
}

/** Rows of a tab as objects keyed by header, with their sheet row numbers; blank rows dropped. */
function records(rows: string[][] | undefined, required: string[], where: string, errors: string[]) {
  if (!rows) {
    errors.push(`${where}: tab missing`)
    return []
  }
  const header = (rows[0] ?? []).map((h) => h.trim())
  const missing = required.filter((h) => !header.includes(h))
  if (missing.length) {
    errors.push(`${where}: missing column${missing.length > 1 ? 's' : ''} ${missing.map((m) => `"${m}"`).join(', ')}`)
    return []
  }
  return rows.slice(1).flatMap((cells, i) => {
    if (cells.every((c) => !c?.trim())) return []
    const get = (column: string) => (cells[header.indexOf(column)] ?? '').trim()
    const row = i + 2
    if (cells.some((c) => examples.has(c?.trim()))) {
      errors.push(`${where} row ${row}: this is the template's example row; delete it`)
      return []
    }
    return [{ get, at: `${where} row ${row}` }]
  })
}

export function importSheets(files: SheetFile[], base: Base): Imported {
  const errors: string[] = []
  const notes: string[] = []
  const out: Imported = { notes, errors }

  const findCompetition = (name: string, at: string) => {
    const c = base.competitions.find((c) => same(competitionLabel(c), name) || same(c.name.en, name) || c.id === name)
    if (!c) errors.push(`${at}: unknown competition "${name}"`)
    return c
  }
  const findVenue = (name: string, at: string) => {
    const v = base.venues.find((v) => same(v.name.en, name) || v.id === name)
    if (!v) errors.push(`${at}: unknown venue "${name}"`)
    return v
  }

  const teamFiles: { file: SheetFile; association?: Association }[] = []
  let vendorsFile: SheetFile | undefined
  let fixturesFile: SheetFile | undefined
  for (const file of files) {
    const teams = TEAMS_FILE.exec(file.name)
    if (teams) {
      const suffix = teams[1].trim()
      if (same(suffix, 'template')) continue
      const association = base.associations.find((a) => same(a.short, suffix) || same(a.id, suffix))
      teamFiles.push({ file, association })
    } else if (same(file.name, 'Vendors')) vendorsFile = file
    else if (same(file.name, 'Fixtures')) fixturesFile = file
    else notes.push(`Skipped "${file.name}": not a teams, vendors or fixtures sheet`)
  }

  // Teams and squads: one file per association (or for invited and club teams).
  if (teamFiles.length) {
    const teams: Team[] = []
    const squads: Squad[] = []
    for (const { file, association } of teamFiles) {
      const fileTeams = new Map<string, { team: Team; squad: Squad }>()
      const key = (competition: string, name: string) => `${competition}|${name.toLowerCase()}`
      for (const { get, at } of records(
        file.tabs.Teams,
        ['Competition', 'Team name'],
        `${file.name} › Teams`,
        errors,
      )) {
        const competition = findCompetition(get('Competition'), at)
        const name = get('Team name')
        if (!name) errors.push(`${at}: team name missing`)
        if (!competition || !name) continue
        const team: Team = { id: `${competition.id}-${slug(name)}`, competition: competition.id, name }
        if (association) team.association = association.id
        const squad: Squad = { team: team.id, players: [] }
        if (get('Coach')) squad.coach = get('Coach')
        if (get('Manager')) squad.manager = get('Manager')
        if (`teams/${team.id}` in base.images) squad.photo = `teams/${team.id}`
        fileTeams.set(key(competition.id, name), { team, squad })
      }

      let withoutConsent = 0
      for (const { get, at } of records(
        file.tabs.Players,
        ['Competition', 'Team', 'Player name', 'Consent to show name'],
        `${file.name} › Players`,
        errors,
      )) {
        const competition = findCompetition(get('Competition'), at)
        if (!competition) continue
        const entry = fileTeams.get(key(competition.id, get('Team')))
        if (!entry) {
          errors.push(`${at}: team "${get('Team')}" isn't on the Teams tab for ${get('Competition')}`)
          continue
        }
        if (!same(get('Consent to show name'), 'yes')) {
          withoutConsent++
          continue
        }
        const name = get('Player name')
        if (!name) {
          errors.push(`${at}: player name missing`)
          continue
        }
        const player: Squad['players'][number] = { name }
        const number = get('Shirt number')
        // Keep "00" or "07" as text; plain numbers as numbers.
        if (number) player.number = /^(0|[1-9]\d*)$/.test(number) ? Number(number) : number
        if (same(get('Captain'), 'yes')) player.captain = true
        entry.squad.players.push(player)
      }
      if (withoutConsent) notes.push(`${file.name}: left out ${withoutConsent} player(s) without consent`)

      for (const { team, squad } of fileTeams.values()) {
        teams.push(team)
        if (squad.players.length || squad.coach || squad.manager || squad.photo) squads.push(squad)
      }
    }
    const seen = new Set<string>()
    for (const t of teams) {
      if (seen.has(t.id)) errors.push(`team "${t.name}" in ${t.competition} appears in more than one sheet`)
      seen.add(t.id)
    }
    out.teams = teams
    out.squads = squads
  }

  if (vendorsFile) {
    const vendors: Vendor[] = []
    for (const { get, at } of records(
      vendorsFile.tabs.Vendors,
      ['Name', 'What they sell'],
      `${vendorsFile.name} › Vendors`,
      errors,
    )) {
      const name = get('Name')
      if (!get('What they sell')) errors.push(`${at}: "What they sell" missing`)
      const vendor: Vendor = { id: slug(name), name, description: { en: get('What they sell') } }
      const zh = get('What they sell (中文, optional)')
      if (zh) vendor.description.zh = zh
      if (get('Venue')) vendor.venue = findVenue(get('Venue'), at)?.id
      if (get('Where at the venue')) vendor.where = { en: get('Where at the venue') }
      if (get('Opening hours')) vendor.hours = { en: get('Opening hours') }
      const payment = Object.entries(paymentColumns).flatMap(([column, method]) =>
        same(get(column), 'yes') ? [method] : [],
      )
      if (payment.length) vendor.payment = payment
      const logo = base.logos.find((l) => l.replace(/\.[a-z]+$/, '') === `logos/${vendor.id}`)
      if (logo) vendor.logo = logo
      if (get('Website')) vendor.url = get('Website')
      vendors.push(vendor)
    }
    out.vendors = vendors
  }

  if (fixturesFile) {
    const teams = out.teams
    if (!teams) errors.push('Fixtures need the teams: no "Teams and squads – …" sheets found')
    const rows = records(
      fixturesFile.tabs.Fixtures,
      ['Game no.', 'Competition', 'Stage', 'Date', 'Time', 'Venue', 'Home', 'Away'],
      `${fixturesFile.name} › Fixtures`,
      errors,
    )
    const fixtures: Fixture[] = []
    const fixtureId = (sport: Sport, number: number) => `${sportPrefix[sport]}-${String(number).padStart(3, '0')}`

    for (const { get, at } of rows) {
      const competition = findCompetition(get('Competition'), at)
      const number = Number(get('Game no.'))
      if (!Number.isInteger(number) || number < 1) errors.push(`${at}: game number "${get('Game no.')}" isn't a number`)
      const stage = get('Stage').toLowerCase()
      if (stage !== 'group' && stage !== 'knockout') errors.push(`${at}: stage must be Group or Knockout`)
      const date = get('Date')
      const time = get('Time')
        .replace(/^(\d):/, '0$1:')
        .replace(/^(\d\d:\d\d):00$/, '$1')
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push(`${at}: date "${date}" should be YYYY-MM-DD`)
      if (!/^\d{2}:\d{2}$/.test(time)) errors.push(`${at}: time "${get('Time')}" should be HH:MM`)
      const venue = findVenue(get('Venue'), at)
      if (!competition || !venue || !teams) continue

      const slot = (role: string): Slot | undefined => {
        const text = get(role)
        if (!text) return undefined
        const result = /^(winner|loser)\s+(?:of\s+)?(?:game\s+)?(\d+)$/i.exec(text)
        if (result) {
          const ref = fixtureId(competition.sport, Number(result[2]))
          return result[1].toLowerCase() === 'winner' ? { winnerOf: ref } : { loserOf: ref }
        }
        const position = /^(\d+)(?:st|nd|rd|th)(?:\s+(?:pool|group)\s+(\S+))?$/i.exec(text)
        if (position)
          return position[2] ? { position: Number(position[1]), group: position[2] } : { position: Number(position[1]) }
        const tbc = /^tbc(?:\s*[:–-]\s*(.+))?$/i.exec(text)
        if (tbc) return { tbc: { en: tbc[1] ?? 'TBC' } }
        // A team: from this competition, or (officials only) any team with that name.
        const matches = teams.filter((t) => same(t.name, text))
        const team =
          matches.find((t) => t.competition === competition.id) ?? (role === 'Officials' ? matches[0] : undefined)
        if (team) return { team: team.id }
        errors.push(
          `${at}: ${role.toLowerCase()} "${text}" isn't a team in ${get('Competition')} or a slot like "Winner 49"`,
        )
        return undefined
      }
      const home = slot('Home')
      const away = slot('Away')
      if (!home || !away) {
        if (!home && !get('Home')) errors.push(`${at}: home missing`)
        if (!away && !get('Away')) errors.push(`${at}: away missing`)
        continue
      }

      const fixture: Fixture = {
        id: fixtureId(competition.sport, number),
        number,
        competition: competition.id,
        stage: stage as Fixture['stage'],
        start: `${date}T${time}${utcOffset(date, base.tournament.timezone)}`,
        venue: venue.id,
        home,
        away,
      }
      if (get('Pool')) fixture.group = get('Pool')
      if (get('Label')) fixture.label = { en: get('Label') }
      if (get('Court')) {
        const court = venue.courts.find((c) => same(c.name.en, get('Court')) || c.id === get('Court'))
        if (court) fixture.court = court.id
        else errors.push(`${at}: no court "${get('Court')}" at ${venue.name.en}`)
      }
      const officials = slot('Officials')
      if (officials) fixture.officials = officials
      if (get('Best of')) fixture.format = { bestOf: Number(get('Best of')) }
      if (get('Tie')) fixture.tie = `${sportPrefix[competition.sport]}-${slug(get('Tie'))}`
      if (fixtures.some((f) => f.id === fixture.id))
        errors.push(`${at}: game ${number} appears twice in ${competition.sport}`)
      fixtures.push(fixture)
    }
    fixtures.sort((a, b) => a.start.localeCompare(b.start) || (a.number ?? 0) - (b.number ?? 0))

    // A team's pool comes from the draw: the pool of its group games.
    const pools = new Map<string, string>()
    for (const f of fixtures) {
      if (f.stage !== 'group' || !f.group) continue
      for (const slot of [f.home, f.away]) {
        if (!('team' in slot)) continue
        const pool = pools.get(slot.team)
        if (pool && pool !== f.group)
          errors.push(`game ${f.number} (${f.id}): ${slot.team} is in pools ${pool} and ${f.group}`)
        pools.set(slot.team, f.group)
      }
    }
    for (const team of teams ?? []) {
      const pool = pools.get(team.id)
      if (pool) team.group = pool
    }
    out.fixtures = fixtures
  }

  return out
}
