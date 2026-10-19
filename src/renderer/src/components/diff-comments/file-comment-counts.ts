import { useMemo } from 'react'
import { useWorktreeAgentNotes } from '@/lib/agent-notes'
import { usePendingReviewCountByPath } from '@/components/pending-review/pending-review-count'
import { buildUnresolvedThreadCountByPath } from '@/components/pr-comments/unresolved-thread-count'
import { usePRCommentScope } from '@/components/pr-comments/use-pr-comment-scope'
import { useVisibleWorktreeDiffComments } from './use-visible-worktree-diff-comments'
import { groupPRComments } from '../../../../shared/pr-comment-groups'
import type { PRComment } from '../../../../shared/github/comment-types'

/** What one file still carries, split by who is waiting on whom. */
export type FileCommentCounts = {
  /** Line notes you left for an agent. */
  notes: number
  /** Notes an agent left for you, through `orca notes add`. */
  agentNotes: number
  /** Review threads on the pull request nobody has answered. */
  unresolvedThreads: number
  /** Review comments you drafted but have not submitted. */
  pendingReview: number
}

export type FileCommentCountsByPath = ReadonlyMap<string, FileCommentCounts>

// Why a shared frozen instance: every list memoizes on this map's identity, and a fresh empty map
// per render would invalidate them all on a workspace with nothing to show.
export const NO_FILE_COMMENT_COUNTS: FileCommentCountsByPath = Object.freeze(
  new Map<string, FileCommentCounts>()
)

function tally(
  counts: Map<string, FileCommentCounts>,
  path: string,
  kind: keyof FileCommentCounts,
  amount: number
): void {
  if (amount <= 0) {
    return
  }
  const existing = counts.get(path)
  if (existing) {
    existing[kind] += amount
    return
  }
  counts.set(path, {
    notes: 0,
    agentNotes: 0,
    unresolvedThreads: 0,
    pendingReview: 0,
    [kind]: amount
  })
}

/**
 * Every kind of outstanding comment, per file, for one workspace.
 *
 * Why one hook rather than four at each call site: a file list re-renders on every filter
 * keystroke, and four independent per-row scans turn that into four scans per row per keystroke.
 * Why paths with nothing are absent: a row reads `undefined` and renders no badges at all.
 */
export function useWorkspaceFileCommentCounts(
  worktreeId: string | null | undefined
): FileCommentCountsByPath {
  const { comments: diffComments } = useVisibleWorktreeDiffComments(worktreeId)
  const agentNotes = useWorktreeAgentNotes(worktreeId)
  const { groups } = usePRCommentScope(worktreeId ?? null)
  const pendingReviewCountByPath = usePendingReviewCountByPath(worktreeId ?? null)

  return useMemo(() => {
    if (!worktreeId) {
      return NO_FILE_COMMENT_COUNTS
    }
    const counts = new Map<string, FileCommentCounts>()
    for (const note of diffComments) {
      tally(counts, note.filePath, 'notes', 1)
    }
    for (const note of agentNotes) {
      tally(counts, note.filePath, 'agentNotes', 1)
    }
    for (const [path, count] of buildUnresolvedThreadCountByPath(groups)) {
      tally(counts, path, 'unresolvedThreads', count)
    }
    for (const [path, count] of pendingReviewCountByPath) {
      tally(counts, path, 'pendingReview', count)
    }
    return counts.size === 0 ? NO_FILE_COMMENT_COUNTS : counts
  }, [agentNotes, diffComments, groups, pendingReviewCountByPath, worktreeId])
}

/**
 * The same shape for the read-only pull request viewers, which hold a comment list but no
 * workspace — so notes, agent notes and unsent drafts have nowhere to come from.
 */
export function buildPRFileCommentCounts(comments: readonly PRComment[]): FileCommentCountsByPath {
  const counts = new Map<string, FileCommentCounts>()
  for (const [path, count] of buildUnresolvedThreadCountByPath(groupPRComments(comments))) {
    tally(counts, path, 'unresolvedThreads', count)
  }
  return counts.size === 0 ? NO_FILE_COMMENT_COUNTS : counts
}
