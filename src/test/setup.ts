/// <reference types="node" />
// Tests load the data folder (sample-data/ unless DATA_DIR is set) through the app's own loader,
// by answering its fetch('/data/…') calls from disk.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { beforeEach, vi } from 'vitest'

const dataDir = process.env.DATA_DIR!

vi.stubGlobal('fetch', async (input: string | URL | Request) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const path = new URL(url, 'http://localhost').pathname
  if (!path.startsWith('/data/')) throw new Error(`unexpected fetch in tests: ${url}`)
  try {
    return new Response(await readFile(join(dataDir, path.slice('/data/'.length))))
  } catch {
    return new Response(null, { status: 404 })
  }
})

// The full-screen artwork shows on a first visit only: start every test as a returning visitor.
beforeEach(() => localStorage.setItem('splashSeen', '1'))

// Browser APIs jsdom lacks, used by the schedule to open at "Now".
Element.prototype.scrollIntoView = () => {}
vi.stubGlobal(
  'IntersectionObserver',
  class {
    observe() {}
    disconnect() {}
  },
)
