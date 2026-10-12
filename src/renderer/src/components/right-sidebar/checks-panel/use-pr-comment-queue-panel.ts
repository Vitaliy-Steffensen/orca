import { useEffect } from 'react'
import type { PRComment } from '../../../../../shared/github/comment-types'
import type { PRCommentGroup } from '../../../../../shared/pr-comment-groups'
import { publishPRCommentQueueContext } from '../pr-comment-queue-context'
import { useQueuedPRCommentsSendRequest } from '../queued-pr-comments-send'

export function usePRCommentQueuePanel({
  worktreeId,
  contextKey,
  comments,
  commentsLoading,
  onSend
}: {
  worktreeId: string | null
  contextKey: string
  comments: readonly PRComment[]
  commentsLoading: boolean
  onSend: ((groups: PRCommentGroup[]) => void) | undefined
}): void {
  useEffect(() => {
    if (worktreeId && contextKey) {
      publishPRCommentQueueContext(worktreeId, contextKey)
    }
  }, [worktreeId, contextKey])
  useQueuedPRCommentsSendRequest({ worktreeId, contextKey, comments, commentsLoading, onSend })
}
