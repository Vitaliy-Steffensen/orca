// @vitest-environment happy-dom

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PRComment } from '../../../../shared/github/comment-types'
import { getPRCommentGroupId, groupPRComments } from '../../../../shared/pr-comment-groups'
import { publishPRCommentQueueContext } from './pr-comment-queue-context'
import {
  clearPRCommentsListSelectionsForTests,
  setPRCommentsListGroupQueued
} from './pr-comments-list-selection'
import {
  consumeSendQueuedPRCommentsRequest,
  requestSendQueuedPRComments,
  useQueuedPRCommentCount,
  useQueuedPRCommentsSendRequest
} from './queued-pr-comments-send'

function comment(id: number, threadId: string): PRComment {
  return {
    id,
    author: 'madsenmm',
    authorAvatarUrl: '',
    body: 'Rename this',
    createdAt: '2026-09-29T00:00:00Z',
    url: '',
    path: 'a.ts',
    line: id,
    threadId,
    isResolved: false
  }
}

const comments = [comment(1, 'T1'), comment(2, 'T2')]
const [first] = groupPRComments(comments)

afterEach(() => {
  clearPRCommentsListSelectionsForTests()
  consumeSendQueuedPRCommentsRequest('wt')
})

describe('useQueuedPRCommentCount', () => {
  it('counts the comments queued for the workspace, wherever they were queued', () => {
    publishPRCommentQueueContext('wt', 'count-key')
    const { result } = renderHook(() => useQueuedPRCommentCount('wt'))
    expect(result.current).toBe(0)
    act(() => setPRCommentsListGroupQueued('count-key', getPRCommentGroupId(first), true))
    expect(result.current).toBe(1)
    expect(renderHook(() => useQueuedPRCommentCount('other')).result.current).toBe(0)
  })
})

describe('useQueuedPRCommentsSendRequest', () => {
  it('sends the queued comments once the panel has them, and only once', () => {
    publishPRCommentQueueContext('wt', 'send-key')
    setPRCommentsListGroupQueued('send-key', getPRCommentGroupId(first), true)
    const onSend = vi.fn()
    const { rerender } = renderHook(
      ({ loaded }: { loaded: PRComment[] }) =>
        useQueuedPRCommentsSendRequest({
          worktreeId: 'wt',
          contextKey: 'send-key',
          comments: loaded,
          commentsLoading: loaded.length === 0,
          onSend
        }),
      { initialProps: { loaded: [] as PRComment[] } }
    )
    act(() => requestSendQueuedPRComments('wt'))
    expect(onSend).not.toHaveBeenCalled()

    rerender({ loaded: comments })
    expect(onSend).toHaveBeenCalledTimes(1)
    expect(onSend.mock.calls[0][0].map(getPRCommentGroupId)).toEqual([getPRCommentGroupId(first)])

    rerender({ loaded: [...comments] })
    expect(onSend).toHaveBeenCalledTimes(1)
  })
})
