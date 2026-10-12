import { useEffect, useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { isPRCommentGroupQueueableForAI } from '@/lib/pr-comment-action-state'
import { useAppStore } from '@/store'
import type { PRComment } from '../../../../shared/github/comment-types'
import {
  getPRCommentGroupId,
  groupPRComments,
  type PRCommentGroup
} from '../../../../shared/pr-comment-groups'
import { readPRCommentQueueContextKey, subscribePRCommentQueue } from './pr-comment-queue-context'
import { readPRCommentsListSelectedGroupIds } from './pr-comments-list-selection'

// Why a request and not a direct send: the send dialog lives in the PR panel, which is unmounted on other tabs.
const sendRequestedWorktrees = new Set<string>()
const requestListeners = new Set<() => void>()

function notifyRequestListeners(): void {
  for (const listener of requestListeners) {
    listener()
  }
}

function subscribeRequests(listener: () => void): () => void {
  requestListeners.add(listener)
  return () => {
    requestListeners.delete(listener)
  }
}

function readQueuedPRCommentCount(worktreeId: string | null): number {
  return worktreeId
    ? readPRCommentsListSelectedGroupIds(readPRCommentQueueContextKey(worktreeId)).size
    : 0
}

export function useQueuedPRCommentCount(worktreeId: string | null): number {
  const read = (): number => readQueuedPRCommentCount(worktreeId)
  return useSyncExternalStore(subscribePRCommentQueue, read, read)
}

export function requestSendQueuedPRComments(worktreeId: string): void {
  sendRequestedWorktrees.add(worktreeId)
  notifyRequestListeners()
}

export function consumeSendQueuedPRCommentsRequest(worktreeId: string): boolean {
  const requested = sendRequestedWorktrees.delete(worktreeId)
  if (requested) {
    notifyRequestListeners()
  }
  return requested
}

export function sendQueuedPRCommentsForActiveWorktree(): boolean {
  const store = useAppStore.getState()
  const worktreeId = store.activeWorktreeId
  if (!worktreeId) {
    return false
  }
  if (readQueuedPRCommentCount(worktreeId) === 0) {
    toast.info(translate('queuedComments.none', 'No comments are queued.'))
    return true
  }
  requestSendQueuedPRComments(worktreeId)
  store.setRightSidebarOpen(true)
  store.setRightSidebarTab('checks')
  return true
}

export function useQueuedPRCommentsSendRequest({
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
  const read = (): boolean => (worktreeId ? sendRequestedWorktrees.has(worktreeId) : false)
  const requested = useSyncExternalStore(subscribeRequests, read, read)
  useEffect(() => {
    if (!requested || !worktreeId || !contextKey || commentsLoading || !onSend) {
      return
    }
    const queued = readPRCommentsListSelectedGroupIds(contextKey)
    const groups = groupPRComments([...comments]).filter(
      (group) => isPRCommentGroupQueueableForAI(group) && queued.has(getPRCommentGroupId(group))
    )
    // Why wait on an empty match: the panel's first render can precede its comments arriving.
    if (groups.length === 0 && queued.size > 0) {
      return
    }
    consumeSendQueuedPRCommentsRequest(worktreeId)
    onSend(groups)
  }, [comments, commentsLoading, contextKey, onSend, requested, worktreeId])
}
