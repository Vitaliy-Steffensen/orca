import { useMemo } from 'react'
import { useInlinePRCommentActions } from '@/components/pr-comments/use-inline-pr-comment-actions'
import type { DiffSectionItemProps } from '../diff-section-item-props'

/**
 * The staged findings and PR threads every section of the combined diff renders on its lines.
 *
 * Why it is resolved once for the whole viewer: `useInlinePRCommentActions` builds the PR comment
 * scope and every mutation handler, which is far too heavy to run on each virtualized row.
 */
export function useCombinedDiffReviewZones(
  worktreeId: string
): NonNullable<DiffSectionItemProps['reviewZones']> {
  const {
    groups,
    handleResolve,
    handleReplyToComment,
    handleEditComment,
    handleDeleteComment,
    handleSetReaction
  } = useInlinePRCommentActions(worktreeId)
  return useMemo(
    () => ({
      groups,
      handlers: {
        onResolve: handleResolve,
        onReply: handleReplyToComment,
        onEditComment: handleEditComment,
        onDeleteComment: handleDeleteComment,
        onSetReaction: handleSetReaction
      }
    }),
    [
      groups,
      handleResolve,
      handleReplyToComment,
      handleEditComment,
      handleDeleteComment,
      handleSetReaction
    ]
  )
}
