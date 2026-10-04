// The admin API's AWS side: one DynamoDB table, and the site bucket for reading the published
// fixtures and writing results.json / announcements.json.
//
// Table items, all under pk = the tournament year ("2027"):
//   RESULT#<fixture id>        { data, version, updatedAt, updatedBy }
//   ANN#<announcement id>      { data, version, updatedAt, updatedBy }
//   AUDIT#<time>#<random>      { change }   who changed what, with before and after
import { randomUUID } from 'node:crypto'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import {
  DynamoDBDocumentClient,
  GetCommand,
  paginateQuery,
  QueryCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb'
import type { Competition, Fixture } from '../src/data/schema.ts'
import { type Change, Conflict, type Deps, type Item, type Kind } from './app.ts'

const PREFIX: Record<Kind, string> = { result: 'RESULT#', announcement: 'ANN#' }

/** How long the published data is cached here (Tim's uploads take effect within this). */
const DATA_TTL_MS = 60_000

/** Public files: browsers and CloudFront recheck them every 30 s. */
const CACHE_CONTROL = 'public, max-age=30'

export function awsDeps({ table, bucket }: { table: string; bucket: string }): Deps {
  const db = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
    marshallOptions: { removeUndefinedValues: true },
  })
  const s3 = new S3Client({})

  async function readData<T>(name: string): Promise<T> {
    const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: `data/${name}.json` }))
    return JSON.parse(await object.Body!.transformToString()) as T
  }

  let cached: { at: number; value: Awaited<ReturnType<Deps['tournament']>> } | undefined

  const toItem = (kind: Kind, raw: Record<string, unknown>): Item => ({
    id: String(raw.sk).slice(PREFIX[kind].length),
    data: raw.data,
    version: raw.version as number,
    updatedAt: raw.updatedAt as string,
    updatedBy: raw.updatedBy as string,
  })

  async function get(year: number, kind: Kind, id: string): Promise<Item | undefined> {
    const { Item: raw } = await db.send(
      new GetCommand({ TableName: table, Key: { pk: String(year), sk: PREFIX[kind] + id }, ConsistentRead: true }),
    )
    return raw ? toItem(kind, raw) : undefined
  }

  return {
    async tournament() {
      if (cached && Date.now() - cached.at < DATA_TTL_MS) return cached.value
      const [tournament, fixtures, competitions] = await Promise.all([
        readData<{ year: number }>('tournament'),
        readData<Fixture[]>('fixtures'),
        readData<Competition[]>('competitions'),
      ])
      cached = { at: Date.now(), value: { year: tournament.year, fixtures, competitions } }
      return cached.value
    },

    async list(year, kind) {
      const items: Item[] = []
      const pages = paginateQuery(
        { client: db },
        {
          TableName: table,
          KeyConditionExpression: 'pk = :pk and begins_with(sk, :prefix)',
          ExpressionAttributeValues: { ':pk': String(year), ':prefix': PREFIX[kind] },
        },
      )
      for await (const page of pages) items.push(...(page.Items ?? []).map((raw) => toItem(kind, raw)))
      return items
    },

    get,

    async write(year, kind, id, data, version, change) {
      const key = { pk: String(year), sk: PREFIX[kind] + id }
      const condition =
        version === 0
          ? { ConditionExpression: 'attribute_not_exists(sk)' }
          : { ConditionExpression: 'version = :v', ExpressionAttributeValues: { ':v': version } }
      const audit = {
        Put: {
          TableName: table,
          Item: { pk: String(year), sk: `AUDIT#${change.at}#${randomUUID().slice(0, 8)}`, change },
        },
      }
      const next = version + 1
      const write =
        data === null
          ? { Delete: { TableName: table, Key: key, ...condition } }
          : {
              Put: {
                TableName: table,
                Item: { ...key, data, version: next, updatedAt: change.at, updatedBy: change.by },
                ...condition,
              },
            }
      try {
        await db.send(new TransactWriteCommand({ TransactItems: [write, audit] }))
      } catch (error) {
        const reasons = (error as { CancellationReasons?: { Code?: string }[] }).CancellationReasons
        if (reasons?.[0]?.Code === 'ConditionalCheckFailed') throw new Conflict(await get(year, kind, id))
        throw error
      }
      return data === null ? 0 : next
    },

    async changes(year, limit) {
      const { Items = [] } = await db.send(
        new QueryCommand({
          TableName: table,
          KeyConditionExpression: 'pk = :pk and begins_with(sk, :prefix)',
          ExpressionAttributeValues: { ':pk': String(year), ':prefix': 'AUDIT#' },
          ScanIndexForward: false,
          Limit: limit,
        }),
      )
      return Items.map((raw) => raw.change as Change)
    },

    async publish(name, body) {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: `data/${name}.json`,
          Body: JSON.stringify(body),
          ContentType: 'application/json',
          CacheControl: CACHE_CONTROL,
        }),
      )
    },

    now: () => new Date(),
  }
}
