// Content and results schemas. These are the source of truth for the data types;
// content JSON in content/<year>/ is validated against them in tests (see content.test.ts).
// Kept deliberately loose where formats are still unknown (pools, sports, match formats).
import { z } from 'zod'

const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'ids are lowercase kebab-case')

/** Local date-time with explicit UTC offset, e.g. 2027-03-26T13:30+02:00 */
const dateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?[+-]\d{2}:\d{2}$/, 'use YYYY-MM-DDTHH:mm+02:00')
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD')

/** Human-readable text. zh (Traditional Chinese) falls back to en when missing. */
export const Text = z.object({ en: z.string().min(1), zh: z.string().min(1).optional() })

export const Sport = z.enum(['basketball', 'volleyball', 'badminton', 'padel'])

export const Tournament = z.object({
  year: z.number().int(),
  edition: z.number().int().optional(),
  name: Text,
  host: Text,
  startDate: date,
  endDate: date,
  timezone: z.string(),
})

export const Venue = z.object({
  id,
  name: Text,
  address: z.string().optional(),
  mapUrl: z.url().optional(),
  courts: z.array(z.object({ id, name: Text })),
})

/** A province/region/club that teams belong to (WP, SG, NG…). */
export const Association = z.object({ id, name: Text, short: z.string() })

// Content is validated in tests only (zod is not shipped to the browser), so no .default()s:
// missing rule fields fall back to DEFAULT_RULES in standings.ts.
export const StandingsRules = z.object({
  win: z.number().optional(),
  loss: z.number().optional(),
  draw: z.number().optional(),
  forfeitLoss: z.number().optional(),
  /** Applied in order after points. diff/for use the sport's scoring unit (points, sets, games). */
  tiebreak: z.array(z.enum(['headToHead', 'diff', 'for'])).optional(),
})

export const Competition = z.object({
  id,
  sport: Sport,
  name: Text,
  groups: z.array(z.string()).optional(),
  rules: StandingsRules.optional(),
})

export const Team = z.object({
  id,
  competition: id,
  name: z.string(),
  association: id.optional(),
  group: z.string().optional(),
})

/** Who fills a fixture slot: a known team, or a reference resolved from results. */
export const Slot = z.union([
  z.object({ team: id }),
  z.object({ winnerOf: id }),
  z.object({ loserOf: id }),
  /** Final position in a group (or the whole competition when group is omitted). */
  z.object({ position: z.number().int().positive(), group: z.string().optional() }),
  z.object({ tbc: Text }),
])

export const Fixture = z.object({
  id,
  /** Number shown to people ("Game 49"). Not unique across sports/days. */
  number: z.number().int().optional(),
  competition: id,
  stage: z.enum(['group', 'knockout']),
  group: z.string().optional(),
  label: Text.optional(),
  start: dateTime,
  venue: id,
  court: id.optional(),
  home: Slot,
  away: Slot,
  officials: Slot.optional(),
  format: z.object({ bestOf: z.number().int().positive() }).optional(),
  /** Groups individual rubbers into a team tie (badminton). */
  tie: id.optional(),
})

export const ProgrammeItem = z.object({
  id,
  start: dateTime,
  end: dateTime.optional(),
  title: Text,
  venue: id.optional(),
  notes: Text.optional(),
  sports: z.array(Sport).optional(),
})

export const Sponsor = z.object({
  id,
  name: z.string(),
  logo: z.string().optional(),
  url: z.url().optional(),
  tier: z.enum(['headline', 'gold', 'supporter']),
})

/** A photo with the attribution its licence requires (most stock photos are CC BY-SA). */
export const Photo = z.object({
  src: z.string().startsWith('/images/'),
  alt: Text,
  credit: z.string(),
  license: z.string(),
  licenseUrl: z.url().optional(),
  sourceUrl: z.url().optional(),
})

/** Travel info for out-of-town visitors: where to stay, getting around, things to do. */
export const VisitorGuide = z.object({
  /** Shows a "draft / example content" notice while true. */
  draft: z.boolean().optional(),
  hero: Photo.optional(),
  intro: Text,
  sections: z.array(
    z.object({
      id,
      title: Text,
      intro: Text.optional(),
      items: z.array(
        z.object({
          id,
          name: Text,
          description: Text,
          photo: Photo.optional(),
          url: z.url().optional(),
          mapUrl: z.url().optional(),
        }),
      ),
    }),
  ),
})

export const Content = z.object({
  tournament: Tournament,
  venues: z.array(Venue),
  associations: z.array(Association),
  competitions: z.array(Competition),
  teams: z.array(Team),
  fixtures: z.array(Fixture),
  programme: z.array(ProgrammeItem),
  sponsors: z.array(Sponsor),
  guide: VisitorGuide.optional(),
})

const scorePair = z.tuple([z.number().int().min(0), z.number().int().min(0)])

/** Result for one fixture. Score shape depends on the sport. */
export const Result = z.object({
  fixture: id,
  status: z.enum(['live', 'final', 'forfeit', 'cancelled']),
  score: z
    .union([
      z.object({ home: z.number().int().min(0), away: z.number().int().min(0) }),
      /** Volleyball sets or badminton/padel games, each [home, away]. */
      z.object({ sets: z.array(scorePair) }),
    ])
    .optional(),
  forfeitBy: z.enum(['home', 'away']).optional(),
  updatedAt: z.string().optional(),
  updatedBy: z.string().optional(),
})

export const Results = z.object({
  updatedAt: z.string().optional(),
  results: z.array(Result),
})

export type Text = z.infer<typeof Text>
export type Sport = z.infer<typeof Sport>
export type Tournament = z.infer<typeof Tournament>
export type Venue = z.infer<typeof Venue>
export type Association = z.infer<typeof Association>
export type StandingsRules = z.infer<typeof StandingsRules>
export type Competition = z.infer<typeof Competition>
export type Team = z.infer<typeof Team>
export type Slot = z.infer<typeof Slot>
export type Fixture = z.infer<typeof Fixture>
export type ProgrammeItem = z.infer<typeof ProgrammeItem>
export type Sponsor = z.infer<typeof Sponsor>
export type Photo = z.infer<typeof Photo>
export type VisitorGuide = z.infer<typeof VisitorGuide>
export type Content = z.infer<typeof Content>
export type Result = z.infer<typeof Result>
export type Results = z.infer<typeof Results>
