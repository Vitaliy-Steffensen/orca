import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  readPendingReviewDrafts,
  readPendingReviewSummaries,
  writePendingReviewDrafts,
  writePendingReviewSummary
} from './pending-review-draft-store'

const AGENT = { kind: 'agent', name: 'Claude Code' } as const

let dir: string
let file: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'pending-review-drafts-'))
  file = join(dir, 'pending-review-drafts.json')
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

function draft(id: string) {
  return {
    id,
    path: 'src/a.ts',
    line: 3,
    body: `note ${id}`,
    createdAt: 1,
    status: 'accepted' as const
  }
}

describe('the queued-comment file on this device', () => {
  it('reads as empty before anything was written', async () => {
    expect(await readPendingReviewDrafts(file)).toStrictEqual({})
  })

  it('keeps each workspace’s queue across a read', async () => {
    await writePendingReviewDrafts(file, 'repo::/w/one', [draft('a')])
    await writePendingReviewDrafts(file, 'repo::/w/two', [draft('b')])
    expect(await readPendingReviewDrafts(file)).toStrictEqual({
      'repo::/w/one': [draft('a')],
      'repo::/w/two': [draft('b')]
    })
  })

  it('forgets a workspace whose queue is emptied', async () => {
    await writePendingReviewDrafts(file, 'repo::/w/one', [draft('a')])
    await writePendingReviewDrafts(file, 'repo::/w/one', [])
    expect(await readPendingReviewDrafts(file)).toStrictEqual({})
  })

  // Why: each write rewrites the whole file, so two landing together would each write back a
  // copy that lacks the other's change.
  it('keeps both of two writes issued at once', async () => {
    await Promise.all([
      writePendingReviewDrafts(file, 'repo::/w/one', [draft('a')]),
      writePendingReviewDrafts(file, 'repo::/w/two', [draft('b')])
    ])
    expect(Object.keys(await readPendingReviewDrafts(file)).sort()).toStrictEqual([
      'repo::/w/one',
      'repo::/w/two'
    ])
  })

  it('treats a damaged file as empty rather than failing the review', async () => {
    await writeFile(file, '{ not json', 'utf8')
    expect(await readPendingReviewDrafts(file)).toStrictEqual({})
  })

  it('keeps each workspace’s review summary on its own', async () => {
    await writePendingReviewSummary(file, 'wt-a', 'Looks good apart from the naming')
    await writePendingReviewSummary(file, 'wt-b', 'Needs tests')

    expect(await readPendingReviewSummaries(file)).toEqual({
      'wt-a': 'Looks good apart from the naming',
      'wt-b': 'Needs tests'
    })
  })

  it('keeps comments and summaries apart when both are written at once', async () => {
    await Promise.all([
      writePendingReviewDrafts(file, 'wt-a', [draft('c1')]),
      writePendingReviewSummary(file, 'wt-a', 'Summary')
    ])

    expect(await readPendingReviewDrafts(file)).toEqual({ 'wt-a': [draft('c1')] })
    expect(await readPendingReviewSummaries(file)).toEqual({ 'wt-a': 'Summary' })
  })

  it('forgets a summary that is cleared', async () => {
    await writePendingReviewSummary(file, 'wt-a', 'Summary')
    await writePendingReviewSummary(file, 'wt-a', '   ')

    expect(await readPendingReviewSummaries(file)).toEqual({})
  })

  it('keeps the agent’s proposals out of the key an older build submits from', async () => {
    const proposal = { ...draft('p1'), status: 'proposed' as const, agentAuthor: AGENT }
    await writePendingReviewDrafts(file, 'wt-a', [draft('mine'), proposal])

    const stored: Record<string, Record<string, unknown[]>> = JSON.parse(
      await readFile(file, 'utf8')
    )
    expect(stored.drafts['wt-a']).toHaveLength(1)
    expect(stored.proposals['wt-a']).toHaveLength(1)
    expect(await readPendingReviewDrafts(file)).toStrictEqual({
      'wt-a': [draft('mine'), proposal]
    })
  })

  // A version 1 file had no proposals key, so an agent's comments sat in `drafts`; reading
  // them back as accepted would submit findings nobody judged.
  it('reads a version 1 file’s agent comments back as proposals', async () => {
    await writeFile(
      file,
      JSON.stringify({
        version: 1,
        drafts: {
          'wt-a': [
            {
              id: 'p1',
              path: 'src/a.ts',
              line: 3,
              body: 'note p1',
              createdAt: 1,
              agentAuthor: AGENT
            }
          ]
        },
        summaries: {}
      }),
      'utf8'
    )

    expect((await readPendingReviewDrafts(file))['wt-a']?.[0]?.status).toBe('proposed')
  })
})
