import '../unused-default-rpc-methods.test-fixture'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PendingReviewDraftChange } from '../../../../shared/github/pending-review-comment'
import { setPendingReviewDraftSurface } from '../../../github/pending-review-draft-surface'
import type { OrcaRuntimeService } from '../../orca-runtime'
import { RpcDispatcher } from '../dispatcher'

const getOwnerRepoMock = vi.fn()
const uploadReviewAssetMock = vi.fn()

vi.mock('../../../github/github-owner-repo-selection', () => ({
  getOwnerRepo: (...args: unknown[]) => getOwnerRepoMock(...args)
}))
vi.mock('../../../github/review-asset-upload', () => ({
  uploadReviewAsset: (...args: unknown[]) => uploadReviewAssetMock(...args)
}))

const { REVIEW_DRAFT_METHODS } = await import('./review-drafts')

const runtime = {
  getRuntimeId: () => 'test-runtime',
  showManagedWorktree: async (selector: string) => {
    if (selector !== 'id:wt-1') {
      throw new Error('selector_not_found')
    }
    return { id: 'wt-1', repoId: 'repo-1' }
  },
  listRepos: () => [{ id: 'repo-1', path: '/tmp/repo', connectionId: null }]
}

// oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the handlers only call the methods stubbed above.
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
  getOwnerRepoMock.mockReset()
  getOwnerRepoMock.mockResolvedValue({ owner: 'acme', repo: 'orca' })
  uploadReviewAssetMock.mockReset()
  uploadReviewAssetMock.mockResolvedValue({
    ok: true,
    url: 'https://github.com/user-attachments/assets/0b1b4d3a-1111-2222-3333-444455556666',
    kind: 'image'
  })
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

  it('reads back the summary, so a pass can see what it is about to replace', async () => {
    expect(await call('reviewSummary.get', { worktree: 'id:wt-1' })).toMatchObject({
      ok: true,
      result: { body: '' }
    })

    await call('reviewSummary.set', { worktree: 'id:wt-1', body: 'Half a sentence.' })

    expect(await call('reviewSummary.get', { worktree: 'id:wt-1' })).toMatchObject({
      ok: true,
      result: { body: 'Half a sentence.' }
    })
  })

  it('uploads an attachment to the repository behind the workspace', async () => {
    const response = await call('reviewAsset.upload', {
      worktree: 'id:wt-1',
      name: 'shot.png',
      contentType: 'image/png',
      base64: Buffer.from([1, 2, 3, 4]).toString('base64')
    })

    expect(getOwnerRepoMock).toHaveBeenCalledWith('/tmp/repo', null)
    expect(uploadReviewAssetMock).toHaveBeenCalledWith({
      name: 'shot.png',
      contentType: 'image/png',
      bytes: Buffer.from([1, 2, 3, 4]),
      repo: { owner: 'acme', repo: 'orca' }
    })
    expect(response).toMatchObject({
      ok: true,
      result: {
        url: 'https://github.com/user-attachments/assets/0b1b4d3a-1111-2222-3333-444455556666',
        kind: 'image'
      }
    })
  })

  // Why: an upload needs a token and a repository, not a review shelf, so gating it on the shelf
  // would refuse on exactly the headless hosts where it still works.
  it('uploads on a runtime with no reviewer', async () => {
    setPendingReviewDraftSurface(null)

    expect(
      await call('reviewAsset.upload', {
        worktree: 'id:wt-1',
        name: 'shot.png',
        contentType: 'image/png',
        base64: 'AQID'
      })
    ).toMatchObject({ ok: true })
  })

  it('says screenshots stay in chat when the workspace has no GitHub remote', async () => {
    getOwnerRepoMock.mockResolvedValue(null)

    const response = await call('reviewAsset.upload', {
      worktree: 'id:wt-1',
      name: 'shot.png',
      contentType: 'image/png',
      base64: 'AQID'
    })

    expect(response).toMatchObject({ ok: false })
    expect(JSON.stringify(response)).toContain('no GitHub remote')
    expect(uploadReviewAssetMock).not.toHaveBeenCalled()
  })

  it("passes GitHub's own refusal back rather than a generic failure", async () => {
    uploadReviewAssetMock.mockResolvedValue({
      ok: false,
      error: 'GitHub refused the upload: attaching files needs write access to the repository.'
    })

    const response = await call('reviewAsset.upload', {
      worktree: 'id:wt-1',
      name: 'shot.png',
      contentType: 'image/png',
      base64: 'AQID'
    })

    expect(response).toMatchObject({ ok: false })
    expect(JSON.stringify(response)).toContain('needs write access')
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
