// Loads the tournament content bundled into the app. To switch years, change the imports below.
// The JSON is validated against schema.ts in content.test.ts (not at runtime, to keep zod out
// of the browser bundle), which is why the casts here are safe.
import associations from '../../content/2025/associations.json'
import competitions from '../../content/2025/competitions.json'
import fixtures from '../../content/2025/fixtures.json'
import programme from '../../content/2025/programme.json'
import sponsors from '../../content/2025/sponsors.json'
import teams from '../../content/2025/teams.json'
import tournament from '../../content/2025/tournament.json'
import venues from '../../content/2025/venues.json'
import type { Content } from './schema.ts'

export const content = {
  tournament,
  venues,
  associations,
  competitions,
  teams,
  fixtures,
  programme,
  sponsors,
} as unknown as Content
