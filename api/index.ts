// Lambda entry point. Built into api/dist/index.mjs by `npm run api:build`.
import { createApi } from './app.ts'
import { awsDeps } from './aws.ts'

export const handler = createApi(awsDeps({ table: process.env.TABLE!, bucket: process.env.BUCKET! }))
