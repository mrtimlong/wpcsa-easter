// Tournament data is kept apart from the site: it's JSON under /data/, uploaded to S3 on its own
// (infra/upload-data.sh), so it can change without a deploy and never has to be in the repo.
// Locally, the dev server serves ./data/ if it exists, otherwise ./sample-data/ (2025 demo).
//
// Loaded once at startup with top-level await, so the rest of the app can treat it as constant
// (main.tsx shows an error if this fails). The JSON is validated against schema.ts before upload
// (`npm run data:check`), not here, to keep zod out of the browser bundle.
import type { Content, Results } from './schema.ts'

export const DATA_URL = '/data/'

type FileName = (typeof required)[number] | keyof typeof optional

const required = ['tournament', 'venues', 'associations', 'competitions', 'teams', 'fixtures', 'programme'] as const

/** Files that may be missing, with the value to use instead. */
const optional = {
  sponsors: [],
  squads: [],
  vendors: [],
  info: undefined,
  contacts: [],
  announcements: [],
  'visitor-guide': undefined,
  images: {},
  results: undefined,
}

export class DataError extends Error {}

async function fetchJson(name: FileName, isOptional: boolean): Promise<unknown> {
  const response = await fetch(`${DATA_URL}${name}.json`)
  if (response.ok) return response.json()
  // S3 answers 403 rather than 404 for missing objects (the bucket isn't listable).
  if (isOptional && (response.status === 404 || response.status === 403)) return optional[name as keyof typeof optional]
  throw new DataError(`${name}.json: HTTP ${response.status}`)
}

/** Fetches results.json again, for refreshing while the app is open (undefined until the first result). */
export async function loadResults(): Promise<Results | undefined> {
  return (await fetchJson('results', true)) as Results | undefined
}

/** Fetches announcements.json again, for refreshing while the app is open. */
export async function loadAnnouncements(): Promise<Content['announcements']> {
  return (await fetchJson('announcements', true)) as Content['announcements']
}

export async function loadData(): Promise<{ content: Content; results?: Results }> {
  const names = [...required, ...(Object.keys(optional) as (keyof typeof optional)[])]
  const values = await Promise.all(names.map((name) => fetchJson(name, name in optional)))
  const files = Object.fromEntries(names.map((name, i) => [name, values[i]])) as Record<FileName, unknown>
  const { 'visitor-guide': guide, results, ...rest } = files
  return { content: { ...rest, guide } as Content, results: results as Results | undefined }
}

const data = await loadData()

export const content: Content = data.content

/** results.json as published by the results backend (absent before the event and in demo mode). */
export const publishedResults: Results | undefined = data.results
