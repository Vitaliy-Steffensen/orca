// @vitest-environment happy-dom

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  scopes: new Map<string, { repo: { id: string; path: string }; pr: { number: number } }>(),
  context: vi.fn()
}))

vi.mock('@/components/pr-comments/use-pr-comment-scope', () => ({
  usePRCommentScope: (worktreeId: string) => mocks.scopes.get(worktreeId)
}))
vi.mock('@/store', () => ({ useAppStore: () => vi.fn().mockResolvedValue(undefined) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/i18n/i18n', () => ({ translate: (_key: string, fallback: string) => fallback }))

import { useSubmitReviewVerdict } from './use-submit-review-verdict'

const QUEUE = {
  comments: [],
  add: vi.fn(),
  updateBody: vi.fn(),
  remove: vi.fn(),
  accept: vi.fn(),
  acceptAll: vi.fn(),
  discardProposals: vi.fn(),
  keepProposals: vi.fn(),
  clear: vi.fn()
}

function context(login: string) {
  return {
    viewerDidAuthor: false,
    viewerLatestReviewState: null,
    viewerHasReviewRequest: false,
    viewerLatestReviewCommit: null,
    reviewers: [
      { kind: 'user', login, name: null, avatarUrl: null, state: 'pending', canRerequest: false }
    ]
  }
}

describe('useSubmitReviewVerdict', () => {
  beforeEach(() => {
    mocks.scopes.set('wt-a', { repo: { id: 'r', path: '/repo' }, pr: { number: 1 } })
    mocks.scopes.set('wt-b', { repo: { id: 'r', path: '/repo' }, pr: { number: 2 } })
    mocks.context.mockReset()
    Object.assign(window, { api: { pendingReview: { context: mocks.context } } })
  })

  it('shows no reviewers from the last pull request while the next one loads', async () => {
    let resolveB: (value: ReturnType<typeof context>) => void = () => undefined
    mocks.context
      .mockResolvedValueOnce(context('alice'))
      .mockReturnValueOnce(new Promise((resolve) => (resolveB = resolve)))

    const { result, rerender } = renderHook(
      ({ worktreeId }) => useSubmitReviewVerdict(worktreeId, QUEUE),
      { initialProps: { worktreeId: 'wt-a' } }
    )
    expect(result.current.reviewers).toBeNull()
    await act(async () => undefined)
    expect(result.current.reviewers?.map((r) => r.login)).toEqual(['alice'])

    rerender({ worktreeId: 'wt-b' })
    expect(result.current.reviewers).toBeNull()

    await act(async () => resolveB(context('bob')))
    expect(result.current.reviewers?.map((r) => r.login)).toEqual(['bob'])
  })

  it('submits what you accepted and leaves the agent’s proposals in the shelf', async () => {
    const submit = vi.fn().mockResolvedValue({ ok: true, url: 'u', state: 'COMMENTED' })
    const keepProposals = vi.fn()
    const comments = [
      { id: 'mine', path: 'a.ts', line: 1, body: 'mine', createdAt: 1, status: 'accepted' },
      {
        id: 'theirs',
        path: 'a.ts',
        line: 2,
        body: 'staged',
        createdAt: 2,
        status: 'proposed',
        agentAuthor: { kind: 'agent', name: 'Claude Code' }
      }
    ] as const
    mocks.context.mockResolvedValue(context('alice'))
    Object.assign(window, {
      api: { pendingReview: { context: mocks.context, submit } }
    })

    const { result } = renderHook(() =>
      useSubmitReviewVerdict('wt-a', { ...QUEUE, comments: [...comments], keepProposals })
    )
    await act(async () => undefined)
    await act(async () => {
      await result.current.submit('comment', 'looks good')
    })

    expect(submit.mock.calls[0]?.[0].comments.map((c: { id: string }) => c.id)).toStrictEqual([
      'mine'
    ])
    expect(keepProposals).toHaveBeenCalled()
    expect(QUEUE.clear).not.toHaveBeenCalled()
  })
})
