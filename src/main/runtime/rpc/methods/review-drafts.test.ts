import '../unused-default-rpc-methods.test-fixture'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { PendingReviewDraftChange } from '../../../../shared/github/pending-review-comment'
import { setPendingReviewDraftSurface } from '../../../github/pending-review-draft-surface'
import type { OrcaRuntimeService } from '../../orca-runtime'
import { RpcDispatcher } from '../dispatcher'
import { REVIEW_DRAFT_METHODS } from './review-drafts'

const runtime = {
  getRuntimeId: () => 'test-runtime',
  showManagedWorktree: async (selector: string) => {
    if (selector !== 'id:wt-1') {
      throw new Error('selector_not_found')
    }
    return { id: 'wt-1' }
  }
}

// oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the handlers only call the two methods stubbed above.
const runtimeService = runtime as unknown as OrcaRuntimeService
const dispatcher = new RpcDispatcher({ runtime: runtimeService, methods: REVIEW_DRAFT_METHODS })

let requestId = 0
const call = async (method: string, params: Record<string, unknown>) =>
  dispatcher.dispatch({ id: `req-${++requestId}`, authToken: 'tok', method, params })

let file = ''
let announced: PendingReviewDraftChange[] = []

async function storedFile(): Promise<{
  drafts: Record<string, { id: string; body: string }[]>
  proposals: Record<string, { id: string; body: string }[]>
  summaries: Record<string, string>
}> {
  return JSON.parse(await readFile(file, 'utf8'))
}

beforeEach(async () => {
  file = join(await mkdtemp(join(tmpdir(), 'orca-review-drafts-')), 'pending-review-drafts.json')
  announced = []
  setPendingReviewDraftSurface({
    file: () => file,
    announceChange: (change) => announced.push(change)
  })
})

afterEach(() => {
  setPendingReviewDraftSurface(null)
})

describe('staged review comment RPC methods', () => {
  it('stages a comment marked with the agent that wrote it, and tells the window', async () => {
    const response = await call('reviewComment.add', {
      worktree: 'id:wt-1',
      path: 'src/a.ts',
      startLine: 3,
      line: 5,
      body: 'This retry loop never backs off.',
      agent: 'Claude Code'
    })

    expect(response).toMatchObject({ ok: true, result: { pendingCount: 1 } })
    // In `proposals`, never `drafts`: a build that predates proposals submits everything in
    // `drafts`, and a finding the reviewer has not read is not theirs to publish.
    expect((await storedFile()).drafts['wt-1']).toBeUndefined()
    expect((await storedFile()).proposals['wt-1']).toEqual([
      expect.objectContaining({
        path: 'src/a.ts',
        startLine: 3,
        line: 5,
        body: 'This retry loop never backs off.',
        agentAuthor: { kind: 'agent', name: 'Claude Code' },
        status: 'proposed'
      })
    ])
    expect(announced).toEqual([
      { worktreeId: 'wt-1', comments: [expect.objectContaining({ path: 'src/a.ts' })] }
    ])
  })

  it('keeps both comments when two agents stage at the same time', async () => {
    await Promise.all([
      call('reviewComment.add', {
        worktree: 'id:wt-1',
        path: 'a.ts',
        line: 1,
        body: 'one',
        agent: 'Codex'
      }),
      call('reviewComment.add', {
        worktree: 'id:wt-1',
        path: 'b.ts',
        line: 2,
        body: 'two',
        agent: 'Claude Code'
      })
    ])

    const bodies = (await storedFile()).proposals['wt-1'].map((comment) => comment.body)
    expect(bodies.sort()).toEqual(['one', 'two'])
  })

  it('lists and removes staged comments, and reports an id that is not queued', async () => {
    await call('reviewComment.add', {
      worktree: 'id:wt-1',
      path: 'a.ts',
      line: 1,
      body: 'one',
      agent: 'Codex'
    })
    const listed = await call('reviewComment.list', { worktree: 'id:wt-1' })
    const id = (await storedFile()).proposals['wt-1'][0].id

    const removed = await call('reviewComment.remove', { worktree: 'id:wt-1', id })
    const missing = await call('reviewComment.remove', { worktree: 'id:wt-1', id: 'nope' })

    expect(listed).toMatchObject({ ok: true, result: { comments: [{ body: 'one' }] } })
    expect(removed).toMatchObject({ ok: true, result: { removed: true } })
    expect(missing).toMatchObject({ ok: true, result: { removed: false } })
    expect((await storedFile()).proposals['wt-1']).toBeUndefined()
  })

  it('writes the review summary, and an empty body clears it', async () => {
    await call('reviewSummary.set', { worktree: 'id:wt-1', body: 'Looks right overall.' })
    expect((await storedFile()).summaries).toEqual({ 'wt-1': 'Looks right overall.' })

    await call('reviewSummary.set', { worktree: 'id:wt-1', body: '' })
    expect((await storedFile()).summaries).toEqual({})
    expect(announced.at(-1)).toEqual({ worktreeId: 'wt-1', summary: '' })
  })

  it('refuses on a runtime with no reviewer rather than staging where nobody looks', async () => {
    setPendingReviewDraftSurface(null)

    const response = await call('reviewComment.add', {
      worktree: 'id:wt-1',
      path: 'a.ts',
      line: 1,
      body: 'one',
      agent: 'Codex'
    })

    expect(response).toMatchObject({ ok: false })
    expect(JSON.stringify(response)).toContain('orca serve')
  })

  it('rejects a range that ends before it starts', async () => {
    const response = await call('reviewComment.add', {
      worktree: 'id:wt-1',
      path: 'a.ts',
      startLine: 9,
      line: 4,
      body: 'backwards',
      agent: 'Codex'
    })

    expect(response).toMatchObject({ ok: false })
  })
})
