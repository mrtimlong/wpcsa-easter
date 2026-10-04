// Imports the organisers' Google Sheets into a data folder, then validates it.
//
//   npm run data:import                 # into ./data
//   npm run data:import -- <dir>        # into another data folder
//
// Reads every spreadsheet directly in the Drive folder named in <dir>/sheets.json ({"folder": "<id>"}),
// signing in as the read-only service account whose key is in ~/.config/wpcsa/sheets-reader.json
// (or $GOOGLE_APPLICATION_CREDENTIALS). Writes teams.json, squads.json, vendors.json and fixtures.json
// for the kinds of sheet it finds, and nothing if any sheet has a problem. Review, then
// `npm run data:upload`.
import { execFileSync } from 'node:child_process'
import { createSign } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { type Base, importSheets, type SheetFile } from '../src/data/sheets.ts'

const dir = process.argv[2] ?? 'data'
const readJson = (file: string) => JSON.parse(readFileSync(join(dir, file), 'utf8'))

const configFile = join(dir, 'sheets.json')
if (!existsSync(configFile)) {
  console.error(`${configFile} not found: create it with {"folder": "<Drive folder id>"}`)
  process.exit(1)
}
const { folder } = readJson('sheets.json') as { folder: string }

async function accessToken(): Promise<string> {
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? join(homedir(), '.config/wpcsa/sheets-reader.json')
  const key = JSON.parse(readFileSync(keyFile, 'utf8')) as {
    client_email: string
    private_key: string
    token_uri: string
  }
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const claims = {
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: key.token_uri,
    iat: now,
    exp: now + 600,
  }
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64(claims)}`
  const signature = createSign('RSA-SHA256').update(unsigned).sign(key.private_key, 'base64url')
  const response = await fetch(key.token_uri, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  })
  const body = (await response.json()) as { access_token?: string; error_description?: string }
  if (!body.access_token) throw new Error(`Google sign-in failed: ${body.error_description ?? response.status}`)
  return body.access_token
}

const token = await accessToken()
async function get<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } })
  if (!response.ok) throw new Error(`${url.split('?')[0]}: HTTP ${response.status} ${await response.text()}`)
  return (await response.json()) as T
}

const query = new URLSearchParams({
  q: `'${folder}' in parents and trashed = false`,
  fields: 'files(id,name,mimeType)',
  pageSize: '200',
  supportsAllDrives: 'true',
  includeItemsFromAllDrives: 'true',
})
const { files: listed } = await get<{ files: { id: string; name: string; mimeType: string }[] }>(
  `https://www.googleapis.com/drive/v3/files?${query}`,
)
const found = listed.filter((f) => f.mimeType === 'application/vnd.google-apps.spreadsheet')
// Uploaded Excel files stay .xlsx unless converted, and the Sheets API can't read them.
const excel = listed.filter((f) => /\.(xlsx|xls|ods|csv)$/i.test(f.name)).map((f) => f.name)
for (const name of excel) console.log(`Skipped "${name}": open it and use File → Save as Google Sheets`)
if (!found.length) {
  console.error('No spreadsheets found: is the folder shared with the service account?')
  process.exit(1)
}

const sheetsApi = 'https://sheets.googleapis.com/v4/spreadsheets'
const files: SheetFile[] = await Promise.all(
  found.map(async ({ id, name }) => {
    const { sheets } = await get<{ sheets: { properties: { title: string } }[] }>(
      `${sheetsApi}/${id}?fields=sheets.properties.title`,
    )
    const titles = sheets.map((s) => s.properties.title)
    const ranges = titles.map((t) => `ranges=${encodeURIComponent(`'${t.replaceAll("'", "''")}'`)}`).join('&')
    const { valueRanges } = await get<{ valueRanges: { values?: string[][] }[] }>(
      `${sheetsApi}/${id}/values:batchGet?${ranges}&valueRenderOption=FORMATTED_VALUE`,
    )
    return { name, tabs: Object.fromEntries(titles.map((t, i) => [t, valueRanges[i].values ?? []])) }
  }),
)

const base: Base = {
  tournament: readJson('tournament.json'),
  associations: readJson('associations.json'),
  competitions: readJson('competitions.json'),
  venues: readJson('venues.json'),
  images: existsSync(join(dir, 'images.json')) ? readJson('images.json') : {},
  logos: existsSync(join(dir, 'logos')) ? readdirSync(join(dir, 'logos')).map((f) => `logos/${f}`) : [],
}
const result = importSheets(files, base)

console.log(`Read ${files.map((f) => `"${f.name}"`).join(', ')}`)
for (const note of result.notes) console.log(`  ${note}`)
if (result.errors.length) {
  console.error(`\nNothing written. Fix these in the sheets and run again:`)
  for (const error of result.errors) console.error(`  ${error}`)
  process.exit(1)
}

for (const kind of ['teams', 'squads', 'vendors', 'fixtures'] as const) {
  const items = result[kind]
  if (!items) continue
  writeFileSync(join(dir, `${kind}.json`), `${JSON.stringify(items, null, 2)}\n`)
  console.log(`Wrote ${kind}.json (${items.length})`)
}

console.log(`\nChecking ${dir}…`)
try {
  execFileSync('npx', ['vitest', 'run', 'src/data/content.test.ts'], {
    env: { ...process.env, DATA_DIR: dir },
    stdio: 'inherit',
  })
} catch {
  console.error(`\nThe imported data has problems (above). Fix the sheets and run again.`)
  process.exit(1)
}
console.log(`\nDone. Review the changes, then: npm run data:upload${dir === 'data' ? '' : ` -- ${dir}`}`)
