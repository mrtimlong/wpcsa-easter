import type { Content, Fixture, Slot } from './schema.ts'

/**
 * Cross-reference checks the schema can't express: unknown ids, duplicates, court clashes.
 * Returns human-readable problems; an empty array means the content is consistent.
 */
export function validateContent(content: Content): string[] {
  const errors: string[] = []
  const { tournament, venues, associations, competitions, teams, fixtures, programme, sponsors } = content

  const collections = { venues, associations, competitions, teams, fixtures, programme, sponsors }
  for (const [name, items] of Object.entries(collections)) {
    const seen = new Set<string>()
    for (const { id } of items) {
      if (seen.has(id)) errors.push(`${name}: duplicate id "${id}"`)
      seen.add(id)
    }
  }

  const venueById = new Map(venues.map((v) => [v.id, v]))
  const competitionById = new Map(competitions.map((c) => [c.id, c]))
  const teamById = new Map(teams.map((t) => [t.id, t]))
  const fixtureById = new Map(fixtures.map((f) => [f.id, f]))
  const associationIds = new Set(associations.map((a) => a.id))

  for (const team of teams) {
    const competition = competitionById.get(team.competition)
    if (!competition) errors.push(`team ${team.id}: unknown competition "${team.competition}"`)
    if (team.association && !associationIds.has(team.association))
      errors.push(`team ${team.id}: unknown association "${team.association}"`)
    if (team.group && competition && !competition.groups?.includes(team.group))
      errors.push(`team ${team.id}: group "${team.group}" not in ${competition.id}`)
  }

  const checkSlot = (f: Fixture, role: string, slot: Slot) => {
    const where = `fixture ${f.id} ${role}`
    if ('team' in slot) {
      const team = teamById.get(slot.team)
      if (!team) errors.push(`${where}: unknown team "${slot.team}"`)
      // Officials may come from another competition; players may not.
      else if (role !== 'officials' && team.competition !== f.competition)
        errors.push(`${where}: team "${slot.team}" is not in ${f.competition}`)
    } else if ('winnerOf' in slot || 'loserOf' in slot) {
      const refId = 'winnerOf' in slot ? slot.winnerOf : slot.loserOf
      const ref = fixtureById.get(refId)
      if (!ref) errors.push(`${where}: unknown fixture "${refId}"`)
      else if (Date.parse(ref.start) >= Date.parse(f.start))
        errors.push(`${where}: refers to "${refId}" which doesn't start earlier`)
    } else if ('position' in slot && slot.group) {
      const competition = competitionById.get(f.competition)
      if (competition && !competition.groups?.includes(slot.group))
        errors.push(`${where}: group "${slot.group}" not in ${f.competition}`)
    }
  }

  const firstDay = Date.parse(`${tournament.startDate}T00:00:00Z`) - 14 * 3600_000
  const lastDay = Date.parse(`${tournament.endDate}T23:59:59Z`) + 14 * 3600_000
  const booked = new Map<string, string>()

  for (const f of fixtures) {
    const competition = competitionById.get(f.competition)
    if (!competition) errors.push(`fixture ${f.id}: unknown competition "${f.competition}"`)
    const venue = venueById.get(f.venue)
    if (!venue) errors.push(`fixture ${f.id}: unknown venue "${f.venue}"`)
    else if (f.court && !venue.courts.some((c) => c.id === f.court))
      errors.push(`fixture ${f.id}: unknown court "${f.court}" at ${f.venue}`)
    if (f.group && competition && !competition.groups?.includes(f.group))
      errors.push(`fixture ${f.id}: group "${f.group}" not in ${competition.id}`)

    const start = Date.parse(f.start)
    if (start < firstDay || start > lastDay) errors.push(`fixture ${f.id}: starts outside the tournament dates`)

    checkSlot(f, 'home', f.home)
    checkSlot(f, 'away', f.away)
    if (f.officials) checkSlot(f, 'officials', f.officials)

    if (f.court) {
      const key = `${f.venue}/${f.court}/${start}`
      const clash = booked.get(key)
      if (clash) errors.push(`fixture ${f.id}: same venue, court and time as ${clash}`)
      booked.set(key, f.id)
    }
  }

  for (const item of programme) {
    if (item.venue && !venueById.has(item.venue)) errors.push(`programme ${item.id}: unknown venue "${item.venue}"`)
  }

  return errors
}
