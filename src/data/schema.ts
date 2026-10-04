// Content and results schemas. These are the source of truth for the data types.
// The data itself is not in the repo: it's JSON under /data/ (see docs/data-model.md), validated
// against these schemas by content.test.ts (`npm run data:check`) before it's uploaded.
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
  /** Demo mode: random results, as if the clock read `now`. Only for sample data. */
  demo: z.object({ now: dateTime, seed: z.number().int().optional() }).optional(),
})

/** Path of a file in the data folder, served as-is (logos: SVG or PNG), e.g. "logos/acme.svg". */
const dataFile = z
  .string()
  .regex(/^[a-z0-9][a-z0-9/_.-]*\.(svg|png|jpg|webp)$/, 'a file in the data folder, e.g. logos/acme.svg')

export const FacilityKind = z.enum([
  'toilets',
  'firstAid',
  'merchandise',
  'food',
  'water',
  'parking',
  'lostProperty',
  'info',
  'other',
])

export const Venue = z.object({
  id,
  name: Text,
  address: z.string().optional(),
  mapUrl: z.url().optional(),
  /** Getting there, entrances, rules (no food in the hall…). */
  notes: Text.optional(),
  courts: z.array(z.object({ id, name: Text })),
  /** Where to find things on site. */
  facilities: z
    .array(
      z.object({
        kind: FacilityKind,
        /** Overrides the standard name for the kind ("Physio" for firstAid, anything for other). */
        name: Text.optional(),
        where: Text,
        notes: Text.optional(),
      }),
    )
    .optional(),
  /** Site or floor plan: a name in images.json. */
  plan: z.string().optional(),
})

export const PaymentMethod = z.enum(['cash', 'card', 'snapscan', 'zapper', 'eft'])

/** Someone selling at the tournament: food stalls, merchandise, physio… */
export const Vendor = z.object({
  id,
  name: z.string(),
  description: Text,
  venue: id.optional(),
  /** Where at the venue ("Outside Hall 2"). */
  where: Text.optional(),
  /** Opening times ("Sat–Sun 8:00–17:00"). */
  hours: Text.optional(),
  payment: z.array(PaymentMethod).optional(),
  logo: dataFile.optional(),
  url: z.url().optional(),
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
  /** How it's played, in words ("Round robin, top two to the semi-finals…"). */
  format: Text.optional(),
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

export const SponsorTier = z.enum(['headline', 'gold', 'supporter'])

export const Sponsor = z.object({
  id,
  name: z.string(),
  tier: SponsorTier,
  /** Shown in the rotating logo strip; wide logos work best (about 3:1). */
  logo: dataFile.optional(),
  description: Text.optional(),
  url: z.url().optional(),
})

/**
 * Who's in a team. Personal data: lives only in the data folder (squads.json), never in git,
 * and only for players who consented. Delete after the event.
 */
export const Squad = z.object({
  team: id,
  /** Team photo: a name in images.json. */
  photo: z.string().optional(),
  coach: z.string().optional(),
  manager: z.string().optional(),
  players: z.array(
    z.object({
      name: z.string().min(1),
      /** Shirt number; a string allows "00". */
      number: z.union([z.number().int().min(0), z.string()]).optional(),
      captain: z.boolean().optional(),
    }),
  ),
})

/**
 * Tournament information pages: rules, code of conduct… Body text is plain: blank lines separate
 * paragraphs, lines starting with "- " are bullet points.
 */
export const Info = z.object({
  sections: z.array(z.object({ id, title: Text, body: Text })),
})

/** Who to call. Real names and numbers live only in the data folder. */
export const Contact = z.object({
  id,
  /** "Tournament director", "Basketball convenor", "First aid"… */
  role: Text,
  name: z.string().optional(),
  /** International format, e.g. "+27 82 123 4567". */
  phone: z
    .string()
    .regex(/^\+[0-9 ]{8,}$/, 'use +27 82 123 4567')
    .optional(),
  /** Offer a WhatsApp link for the phone number. */
  whatsapp: z.boolean().optional(),
  email: z.email().optional(),
  notes: Text.optional(),
})

/**
 * An organiser update during the weekend (court change, weather, lost property…).
 * Shown once `posted` has passed and until `expires`; urgent ones also get a banner on every page.
 */
export const Announcement = z.object({
  id,
  posted: dateTime,
  title: Text,
  /** Plain text: blank lines between paragraphs, "- " for bullets. */
  body: Text.optional(),
  urgent: z.boolean().optional(),
  /** Kept at the top of the list. */
  pinned: z.boolean().optional(),
  expires: dateTime.optional(),
})

/** A photo with the attribution its licence requires (most stock photos are CC BY-SA). */
export const Photo = z.object({
  /** Name in the data's images.json, i.e. the path under images/originals/ without extension. */
  image: z.string(),
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

/** Generated by `npm run images -- --data <dir>`: name → original size and available widths. */
export const ImageManifest = z.record(
  z.string(),
  z.object({ width: z.number(), height: z.number(), widths: z.array(z.number()) }),
)

export const Content = z.object({
  tournament: Tournament,
  venues: z.array(Venue),
  associations: z.array(Association),
  competitions: z.array(Competition),
  teams: z.array(Team),
  fixtures: z.array(Fixture),
  programme: z.array(ProgrammeItem),
  sponsors: z.array(Sponsor),
  vendors: z.array(Vendor),
  info: Info.optional(),
  contacts: z.array(Contact),
  announcements: z.array(Announcement),
  guide: VisitorGuide.optional(),
  squads: z.array(Squad),
  images: ImageManifest,
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
export type FacilityKind = z.infer<typeof FacilityKind>
export type PaymentMethod = z.infer<typeof PaymentMethod>
export type Vendor = z.infer<typeof Vendor>
export type Association = z.infer<typeof Association>
export type StandingsRules = z.infer<typeof StandingsRules>
export type Competition = z.infer<typeof Competition>
export type Team = z.infer<typeof Team>
export type Slot = z.infer<typeof Slot>
export type Fixture = z.infer<typeof Fixture>
export type ProgrammeItem = z.infer<typeof ProgrammeItem>
export type SponsorTier = z.infer<typeof SponsorTier>
export type Sponsor = z.infer<typeof Sponsor>
export type Squad = z.infer<typeof Squad>
export type Info = z.infer<typeof Info>
export type Contact = z.infer<typeof Contact>
export type Announcement = z.infer<typeof Announcement>
export type Photo = z.infer<typeof Photo>
export type VisitorGuide = z.infer<typeof VisitorGuide>
export type ImageManifest = z.infer<typeof ImageManifest>
export type Content = z.infer<typeof Content>
export type Result = z.infer<typeof Result>
export type Results = z.infer<typeof Results>
