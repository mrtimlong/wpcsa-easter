# Data model

Types and validation live in [`src/data/schema.ts`](../src/data/schema.ts). This page explains how the pieces fit together.

## Where data lives

| Data | Edited by | Stored in | Reaches the app |
|---|---|---|---|
| Content: tournament, venues, associations, competitions, teams, fixtures, programme, sponsors | Developer | `content/<year>/*.json` in this repo | Bundled at build time (works offline) |
| Results | Organisers via `/admin` | DynamoDB → published as `results.json` in S3 | Fetched and refreshed during the event |
| Squads (player names) | Developer | `private/` (gitignored) → `squads.json` in S3 | Fetched at runtime; **never committed** |

Standings and knockout progression are **derived** from fixtures + results (`standings.ts`, `resolve.ts`), never stored.

## Entities

- **Tournament**: year, edition, host city, dates, timezone.
- **Venue**: with courts (`uct` → `a`, `b`, `hall2-1`…).
- **Association**: province/region (WP, SG, NG, Swazi). Club teams (Hisense, Misfits…) have none.
- **Competition**: one per sport + division (`bb-mens`, `vb`, `bd`). Optional `groups` (pools) and standings `rules`.
- **Team**: belongs to one competition (WPA in Minis A ≠ WPA in Mens), optionally a group.
- **Fixture**: unique `id` plus display `number` ("Game 49"; numbers restart per day in volleyball), `stage` (`group`/`knockout`), optional `label` ("Cup final"), `start` with UTC offset, venue/court, `home`/`away`/`officials` **slots**, optional `format.bestOf`, and `tie` to group badminton rubbers.
- **Slot**: `{team}` | `{winnerOf}` | `{loserOf}` | `{position, group?}` | `{tbc}`. Position/winner slots resolve to a team once the group is complete or the referenced game has a result.
- **ProgrammeItem**: schedule of events (AGM, march past, social…).
- **Sponsor**: name, logo, link, tier.
- **Result**: per fixture: `status` (`live`/`final`/`forfeit`/`cancelled`) and either `{home, away}` points or `{sets: [[h, a], …]}` (volleyball sets, badminton games).

All human-readable text is `{ en, zh? }`; Chinese falls back to English.

## Standings

Default rules (override per competition): win 2, loss 1, draw 1, forfeit loss 0. Ties are broken by head-to-head points among the tied teams, then difference, then "for" (points for basketball, sets/games for volleyball and badminton), then name.

## Validation

`npm test` checks the bundled content against the schema and for consistency (`validate.ts`): unknown ids, duplicates, teams in the wrong competition, references to later games, fixtures outside the tournament dates, and two games on the same court at the same time.

## 2025 seed data

`content/2025/` is a transcription of the 2025 brochure, used to build and test screens until 2027 content exists. Brochure fixes and assumptions are noted in the commit history: the second Plate semi-final is game 58 (printed as 56), game 64 is losers of 55 & 56 (printed "53 & 54"), the Mens pools are labelled A/B (unnamed in the brochure), and the volleyball best-of formats are a best guess.
